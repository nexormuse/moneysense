// 품목 분류 LLM API Route
// docs/prompt-blueprint.md의 품목 분류 Agent 프롬프트 설계를 그대로 구현한다.
// API 키는 서버 환경변수(ANTHROPIC_API_KEY)로만 접근하며 클라이언트에 노출되지 않는다.
import { NextResponse } from 'next/server';
import type { ItemCategory } from '@/lib/types';

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

// system prompt: 역할·제약·출력 형식 강제 (few-shot 포함)
const SYSTEM_PROMPT = `너는 한국 영수증 품목 분류기다. 품목명을 보고 아래 카테고리 중 하나로 분류한다.

카테고리 (이 8개 외 값 금지):
essential(필수 식료품) | fresh_food(신선식품) | convenience_meal(간편식)
| snack_drink(간식·음료) | daily_goods(생활용품) | adjustable(조정 가능한 소비)
| local_friendly(지역상생 소비) | other(기타)

규칙:
- 반드시 JSON 한 개만 출력한다. 설명 문장 금지.
- 확신이 없으면 category를 "other"로, confidence를 0.5 미만으로 출력한다.
- 주류·담배는 adjustable로 분류한다.

출력 JSON 스키마:
{ "category": string, "confidence": number }

예시:
입력: "처음처럼페트360" → { "category": "adjustable", "confidence": 0.9 }
입력: "곰곰 우유 900ml×2 기획" → { "category": "essential", "confidence": 0.95 }
입력: "우유식빵" → { "category": "snack_drink", "confidence": 0.85 }`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // 키가 없으면 503 → 클라이언트가 룰 기반으로 폴백한다
  if (!apiKey) {
    return NextResponse.json({ error: 'no-api-key' }, { status: 503 });
  }

  let name: unknown;
  try {
    ({ name } = await request.json());
  } catch {
    return NextResponse.json({ error: 'invalid-body' }, { status: 400 });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'invalid-name' }, { status: 400 });
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
        max_tokens: 100,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `입력: "${name.trim()}"` }],
      }),
      // 클라이언트 타임아웃(3초)보다 짧게 잡아 폴백이 자연스럽게 이어지게 한다
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'llm-error' }, { status: 502 });
    }

    const data = await response.json();
    const text: string = data?.content?.[0]?.text ?? '';
    // 응답에서 JSON만 추출해 스키마 검증
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'invalid-llm-output' }, { status: 502 });
    }
    const parsed = JSON.parse(jsonMatch[0]) as { category?: string; confidence?: number };
    if (
      typeof parsed.category !== 'string' ||
      !VALID_CATEGORIES.has(parsed.category as ItemCategory) ||
      (typeof parsed.confidence === 'number' && parsed.confidence < 0.5)
    ) {
      return NextResponse.json({ error: 'schema-validation-failed' }, { status: 502 });
    }

    return NextResponse.json({ category: parsed.category });
  } catch {
    // 타임아웃·네트워크 오류 → 클라이언트 폴백
    return NextResponse.json({ error: 'llm-unreachable' }, { status: 502 });
  }
}
