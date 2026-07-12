// 영수증 Vision OCR API Route
// LLM Vision으로 영수증 이미지에서 날짜·상호·품목·금액을 인식하고 카테고리 분류까지 한 번에 수행한다.
// 개인정보 보호: 업로드된 이미지는 서버에 저장·로깅하지 않으며, LLM 호출 후 즉시 폐기된다.
import { NextResponse } from 'next/server';
import { checkRateLimit, clientIp } from '@/lib/rateLimit';
import { classifyItem, parseVolumeFromName } from '@/lib/services/ai';
import type {
  ExpenseItem,
  ItemCategory,
  PaymentMethod,
  Receipt,
  StoreType,
  VolumeUnit,
} from '@/lib/types';

// Vercel 함수 제한을 서버 측 LLM 타임아웃(15초)보다 길게 확보 — 플랫폼이 먼저 함수를 죽이지 않게 한다
export const maxDuration = 30;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const VALID_CATEGORIES = new Set<ItemCategory>([
  'essential',
  'fresh_food',
  'convenience_meal',
  'snack_drink',
  'daily_goods',
  'adjustable',
  'local_friendly',
  'other',
]);

const VALID_STORE_TYPES = new Set<StoreType>([
  'large_mart',
  'convenience_store',
  'traditional_market',
  'local_store',
  'franchise',
  'online',
  'other',
]);

// system prompt: OCR과 카테고리 분류를 한 번의 호출로 수행 (비용·지연 절반)
// 분류 규칙·few-shot은 /api/classify와 동일한 8개 enum을 재사용한다.
// 개인 식별 정보(카드번호·승인번호 등)는 출력 스키마에 필드가 없어 구조적으로 차단되며,
// 아래 프롬프트의 명시적 제외 지시로 이중 차단한다 — 기획서 '신뢰 설계' 항목과의 정합.
const SYSTEM_PROMPT = `너는 한국 영수증 판독기다. 영수증 이미지에서 정보를 추출해 JSON 하나로만 출력한다. 설명 문장 금지.

추출 항목:
- date: 결제 날짜 (YYYY-MM-DD). 읽을 수 없으면 null
- storeName: 상호명 (지점명 포함)
- storeType: large_mart(대형마트) | convenience_store(편의점) | traditional_market(전통시장)
  | local_store(동네가게) | franchise(프랜차이즈) | online(온라인몰) | other(기타) 중 추정
- paymentMethod: "card"(카드) | "cash"(현금) | "unknown"(불명)
- totalAmount: 총 결제 금액 (숫자)
- items: 품목 배열 [{ "name": string, "amount": number, "category": string,
  "volume": number|null, "volumeUnit": "g"|"ml"|"개"|null }]
  품명·표기에 용량(중량·부피·개수)이 보이면 volume/volumeUnit으로 출력한다.
  L은 ml로(×1000), kg은 g으로(×1000) 환산하고, "900ml×2"처럼 묶음이면 곱한 값을 출력한다.
  보이지 않으면 추측하지 말고 null로 둔다.
- receiptType: 품목이 식별되면 "itemized", 총액만 보이면 "total_only" (이때 items는 빈 배열)

category는 아래 8개 외 값 금지:
essential(필수 식료품) | fresh_food(신선식품) | convenience_meal(간편식)
| snack_drink(간식·음료) | daily_goods(생활용품) | adjustable(조정 가능한 소비)
| local_friendly(지역상생 소비) | other(기타)
분류 예시: "처음처럼페트360" → adjustable(주류), "곰곰 우유 900ml×2 기획" → essential, "우유식빵" → snack_drink

규칙:
- 개인 식별 정보 보호: 영수증에 인쇄된 카드번호(마스킹 포함), 승인번호, 바코드/QR 값,
  회원번호, 전화번호 등 개인 식별 정보는 인식하지 말고 어떤 필드에도 출력하지 않는다.
- 영수증이 아닌 이미지(풍경, 문서, 화면 캡처 등)면 { "error": "not_a_receipt" }만 출력한다.
- 이미지에 보이지 않는 품목·금액을 만들어내지 않는다. 읽을 수 없으면 빼거나 null로 둔다.
- 할인·포인트 차감이 있으면 실제 결제 금액을 totalAmount로 한다.

출력 JSON 스키마:
{ "date": string|null, "storeName": string, "storeType": string, "paymentMethod": string,
  "totalAmount": number,
  "items": [{ "name": string, "amount": number, "category": string, "volume": number|null, "volumeUnit": string|null }],
  "receiptType": "itemized" | "total_only" }`;

type LlmReceipt = {
  error?: string;
  date?: string | null;
  storeName?: string;
  storeType?: string;
  paymentMethod?: string;
  totalAmount?: number;
  items?: {
    name?: string;
    amount?: number;
    category?: string;
    volume?: number | null;
    volumeUnit?: string | null;
  }[];
  receiptType?: string;
};

const VALID_VOLUME_UNITS = new Set<VolumeUnit>(['g', 'ml', '개']);

let ocrItemSeq = 0;

export async function POST(request: Request) {
  // 남용 방지: 비전 호출은 비싸므로 IP당 분당 5회로 제한
  if (!checkRateLimit(`ocr:${clientIp(request)}`, 5)) {
    return NextResponse.json({ error: 'rate-limited' }, { status: 429 });
  }

  // 요청 검증을 키 확인보다 먼저 수행해, 잘못된 요청은 키 유무와 무관하게 400을 받는다
  let image: unknown;
  let mediaType: unknown;
  try {
    ({ image, mediaType } = await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }
  if (typeof image !== 'string' || !image) {
    return NextResponse.json({ error: 'missing-image' }, { status: 400 });
  }
  if (typeof mediaType !== 'string' || !ALLOWED_MEDIA_TYPES.has(mediaType)) {
    return NextResponse.json({ error: 'unsupported-media-type' }, { status: 400 });
  }
  // base64 길이로 원본 크기 추정 (4/3 배수)
  if (image.length * 0.75 > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'image-too-large' }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  // 키가 없으면 503 → 클라이언트가 정직한 안내(샘플/직접 입력 유도)로 폴백한다
  if (!apiKey) {
    return NextResponse.json({ error: 'no-api-key' }, { status: 503 });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        // 품목 40~50개 대형마트 영수증도 JSON이 잘리지 않도록 여유 확보
        max_tokens: 3000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: mediaType, data: image },
              },
              { type: 'text', text: '이 영수증을 판독해 JSON으로 출력해줘.' },
            ],
          },
        ],
      }),
      // 비전은 텍스트보다 느리므로 서버 15초 (클라이언트 타임아웃 20초보다 짧게)
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'llm-error' }, { status: 502 });
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'invalid-llm-output' }, { status: 502 });
    }
    const parsed = JSON.parse(jsonMatch[0]) as LlmReceipt;

    // 영수증이 아닌 이미지
    if (parsed.error === 'not_a_receipt') {
      return NextResponse.json({ error: 'not-a-receipt' }, { status: 422 });
    }

    // ---------- 스키마 방어: LLM 출력을 앱 타입으로 정규화 ----------

    // 날짜: YYYY-MM-DD 검증 실패 시 오늘 날짜 + dateUncertain
    let date = typeof parsed.date === 'string' ? parsed.date.trim() : '';
    let dateUncertain = false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
      date = new Date().toISOString().slice(0, 10);
      dateUncertain = true;
    }

    // 품목: 이름·금액이 유효한 것만 통과, 카테고리 검증 실패 시 룰 기반 개별 폴백
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items: ExpenseItem[] = rawItems
      .filter(
        (item) =>
          typeof item.name === 'string' &&
          item.name.trim() &&
          typeof item.amount === 'number' &&
          item.amount > 0,
      )
      .map((item) => {
        const name = (item.name as string).trim();
        const llmCategory =
          typeof item.category === 'string' && VALID_CATEGORIES.has(item.category as ItemCategory)
            ? (item.category as ItemCategory)
            : null;
        // 용량: LLM 출력이 유효하면 사용, 검증 실패 시 해당 필드만 무시하고 품명 파싱으로 폴백
        // (둘 다 없으면 용량 없이 저장 — 그 품목은 슈링크플레이션 감지 대상에서 제외)
        const llmVolumeValid =
          typeof item.volume === 'number' &&
          Number.isFinite(item.volume) &&
          item.volume > 0 &&
          typeof item.volumeUnit === 'string' &&
          VALID_VOLUME_UNITS.has(item.volumeUnit as VolumeUnit);
        const volumeInfo = llmVolumeValid
          ? { volume: Math.round(item.volume as number), volumeUnit: item.volumeUnit as VolumeUnit }
          : parseVolumeFromName(name);
        return {
          id: `ocr-${Date.now()}-${ocrItemSeq++}`,
          name,
          amount: Math.round(item.amount as number),
          category: llmCategory ?? classifyItem(name),
          source: 'OCR' as const,
          classifiedBy: llmCategory ? ('llm' as const) : ('rule' as const),
          ...(volumeInfo ? { ...volumeInfo, volumeSource: 'parsed' as const } : {}),
        };
      });

    // 총액: 숫자가 아니면 품목 합계로 대체, 둘 다 없으면 인식 실패
    const itemsSum = items.reduce((sum, item) => sum + item.amount, 0);
    const totalAmount =
      typeof parsed.totalAmount === 'number' && parsed.totalAmount > 0
        ? Math.round(parsed.totalAmount)
        : itemsSum;
    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'invalid-llm-output' }, { status: 502 });
    }

    // 품목 합계와 총액의 오차 ±10% 초과 시 품목은 유지하되 확인 플래그를 세운다
    const sumMismatch = items.length > 0 && Math.abs(itemsSum - totalAmount) / totalAmount > 0.1;

    const storeType: StoreType =
      typeof parsed.storeType === 'string' && VALID_STORE_TYPES.has(parsed.storeType as StoreType)
        ? (parsed.storeType as StoreType)
        : 'other';
    const paymentMethod: PaymentMethod =
      parsed.paymentMethod === 'card' ? 'card' : parsed.paymentMethod === 'cash' ? 'cash' : 'other';
    const type: Receipt['type'] =
      parsed.receiptType === 'total_only' || items.length === 0 ? 'summary' : 'itemized';

    const receipt: Omit<Receipt, 'id'> = {
      type,
      date,
      storeName:
        typeof parsed.storeName === 'string' && parsed.storeName.trim()
          ? parsed.storeName.trim().slice(0, 40)
          : '상호 미상',
      storeType,
      totalAmount,
      paymentMethod,
      items,
    };

    // 이미지 데이터는 이 시점에 참조가 끝나며 어디에도 저장·로깅되지 않는다
    return NextResponse.json({ receipt, sumMismatch, dateUncertain });
  } catch {
    // 타임아웃·네트워크 오류 → 클라이언트가 정직한 실패 안내로 폴백
    return NextResponse.json({ error: 'llm-unreachable' }, { status: 502 });
  }
}
