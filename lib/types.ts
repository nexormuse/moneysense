// 머니센스 핵심 데이터 타입 정의

export type PaymentMethod = 'card' | 'cash' | 'bank_transfer' | 'easy_pay' | 'other';

export type StoreType =
  | 'large_mart'
  | 'convenience_store'
  | 'traditional_market'
  | 'local_store'
  | 'franchise'
  | 'online'
  | 'other';

export type ItemCategory =
  | 'essential'
  | 'fresh_food'
  | 'convenience_meal'
  | 'snack_drink'
  | 'daily_goods'
  | 'adjustable'
  | 'local_friendly'
  | 'other';

export type ItemSource = 'OCR' | 'USER_INPUT' | 'NONE';

export type MatchStatus =
  | 'matched'        // 매칭 완료 (품목 없는 카드매출전표 등)
  | 'item_enriched'  // 품목 보강 (품목 있는 영수증이 카드내역과 매칭)
  | 'needs_review'   // 확인 필요
  | 'manual_entry';  // 직접 입력 소비 (현금 등 거래내역에 없는 소비)

export type ReceiptType =
  | 'itemized'  // 품목형
  | 'summary'   // 합계형
  | 'card_slip' // 카드매출전표형
  | 'manual';   // 직접 입력

export type ExpenseItem = {
  id: string;
  name: string;
  amount: number;
  quantity?: number;
  category: ItemCategory;
  source: ItemSource;
};

export type Receipt = {
  id: string;
  type: ReceiptType;
  date: string; // YYYY-MM-DD
  storeName: string;
  storeType: StoreType;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  items: ExpenseItem[];
  memo?: string;
};

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  merchantName: string;
  amount: number;
  paymentMethod: PaymentMethod;
};

export type MatchResult = {
  receiptId: string;
  transactionId?: string;
  status: MatchStatus;
  score: number;
  message: string;
  overridden?: boolean; // 사용자가 수동으로 확정/거절한 매칭인지
};

// needs_review 매칭에 대한 사용자의 수동 판정
export type MatchOverride = {
  receiptId: string;
  action: 'confirm' | 'reject';
  transactionId?: string; // 확정 시점의 후보 거래 id
};

// 원인분해 카드 1장에 해당하는 상세 정보
export type CauseDetail = {
  key: 'priceIncrease' | 'quantityIncrease' | 'storeShift' | 'adjustableSpending';
  title: string;
  points: number; // 생활비 온도에 기여한 점수
  description: string;
  details: string[]; // 예: "계란 +700원", "우유 +300원"
};

export type ActionPlan = {
  text: string;
  savingHint?: string; // 예상 절약 포인트
  isLocal?: boolean; // 지역상생 전환 제안 여부
};

// 생활비 온도 계산 근거 1줄 ("왜 이 온도인가요?" 카드)
export type TemperatureFactorItem = {
  id: string;
  label: string;       // 예: "우유·계란 단가 상승"
  delta: number;       // 온도 기여값 (기본 온도 35 포함)
  description: string; // 근거 설명
};

// 지난 소비 vs 이번 소비 비교 1줄
export type ComparisonInsight = {
  id: string;
  label: string;          // 예: "편의점 식비"
  previousLabel: string;  // 예: "7,800원"
  currentLabel: string;   // 예: "13,800원"
  changeLabel: string;    // 예: "+6,000원"
  changeDirection: 'up' | 'down';
  description: string;    // 생활비 온도와의 연결 설명
};

// AI Agent 분석 흐름 1단계
export type AgentStep = {
  id: string;
  title: string;
  description: string;
  status: 'done' | 'active' | 'pending';
};

export type AnalysisResult = {
  temperature: number;
  temperatureLabel: '안정' | '관심' | '주의' | '뜨거움';
  mainReasons: string[];
  causeBreakdown: {
    priceIncrease: number;
    quantityIncrease: number;
    storeShift: number;
    adjustableSpending: number;
  };
  causeDetails: CauseDetail[];
  localSpendingRatio: number; // 지역상생 소비 비중 (0~1)
  actionPlans: ActionPlan[];
  summaryMessage: string;
  spendingDelta: number; // 지난주 대비 지출 증감 (음수 = 절약). 비교 기준 없으면 0
  temperatureBreakdown: TemperatureFactorItem[]; // 온도 계산 근거 (합계 = 온도)
  comparisons: ComparisonInsight[];              // 지난 소비 vs 이번 소비 비교
  presentationSummary: string;                   // 발표용 3~4문장 요약
};

// 이전 구매 기록 (가격/구매 패턴 비교 기준)
export type PreviousData = {
  prices: Record<string, number>; // 품목명 → 이전 단가
  convenienceMealCount: number;   // 지난주 간편식 구매 횟수
  convenienceRatio: number;       // 지난주 편의점 식비 비중 (0~1)
  totalSpending?: number;         // 지난주 총 지출 (홈의 지난 소비 → 이번 소비 비교용)
  convenienceSpending?: number;   // 지난주 편의점 식비 금액 (비교 카드용)
  localRatio?: number;            // 지난주 지역가게(전통시장·동네가게) 소비 비중 (0~1)
};

// 사용자가 직접 저장한 주간 비교 기준 (샘플 previousData를 대체)
export type UserBaseline = PreviousData & {
  savedAt: string; // 저장한 날짜 (YYYY-MM-DD)
};

// 앱 전체 상태 (localStorage에 저장)
export type AppState = {
  receipts: Receipt[];
  transactions: Transaction[];
  matchOverrides?: MatchOverride[];
  baseline?: UserBaseline | null;
};
