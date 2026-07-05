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
};

// 이전 구매 기록 (가격/구매 패턴 비교 기준)
export type PreviousData = {
  prices: Record<string, number>; // 품목명 → 이전 단가
  convenienceMealCount: number;   // 지난주 간편식 구매 횟수
  convenienceRatio: number;       // 지난주 편의점 식비 비중 (0~1)
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
