// 샘플 데모 데이터: 거래내역, 영수증, 이전 구매 기록
import type { PreviousData, Receipt, Transaction } from './types';

// 샘플 카드·계좌 거래내역
export const sampleTransactions: Transaction[] = [
  {
    id: 'tx-1',
    date: '2026-07-01',
    merchantName: 'iM마트',
    amount: 41000,
    paymentMethod: 'card',
  },
  {
    id: 'tx-2',
    date: '2026-07-03',
    merchantName: '미소24',
    amount: 13800,
    paymentMethod: 'card',
  },
];

// 샘플 영수증 3장 (마트/편의점은 카드내역과 매칭, 동네시장은 현금이라 매칭 없음)
export const sampleReceipts: Receipt[] = [
  {
    id: 'rc-1',
    type: 'itemized',
    date: '2026-07-01',
    storeName: 'iM마트',
    storeType: 'large_mart',
    totalAmount: 41000,
    paymentMethod: 'card',
    items: [
      { id: 'rc-1-i1', name: '우유', amount: 3200, category: 'essential', source: 'OCR' },
      { id: 'rc-1-i2', name: '계란', amount: 7800, category: 'essential', source: 'OCR' },
      { id: 'rc-1-i3', name: '세제', amount: 12000, category: 'daily_goods', source: 'OCR' },
      { id: 'rc-1-i4', name: '즉석식품', amount: 9900, category: 'convenience_meal', source: 'OCR' },
      { id: 'rc-1-i5', name: '기타', amount: 8100, category: 'other', source: 'OCR' },
    ],
  },
  {
    id: 'rc-2',
    type: 'itemized',
    date: '2026-07-03',
    storeName: '미소24',
    storeType: 'convenience_store',
    totalAmount: 13800,
    paymentMethod: 'card',
    items: [
      { id: 'rc-2-i1', name: '컵라면', amount: 1800, category: 'convenience_meal', source: 'OCR' },
      { id: 'rc-2-i2', name: '에너지드링크', amount: 2500, category: 'snack_drink', source: 'OCR' },
      { id: 'rc-2-i3', name: '삼각김밥', amount: 1500, category: 'convenience_meal', source: 'OCR' },
      // 슈링크플레이션 시연: 표시 가격은 지난주와 같지만 용량이 90g → 76g으로 감소 (금액은 그대로 → 온도 불변)
      { id: 'rc-2-i4', name: '과자', amount: 2000, category: 'snack_drink', source: 'OCR', volume: 76, volumeUnit: 'g', volumeSource: 'parsed' },
      { id: 'rc-2-i5', name: '기타', amount: 6000, category: 'other', source: 'OCR' },
    ],
  },
  {
    id: 'rc-3',
    type: 'itemized',
    date: '2026-07-04',
    storeName: '샛별시장',
    storeType: 'traditional_market',
    totalAmount: 22000,
    paymentMethod: 'cash', // 현금 결제라 카드내역에 없음
    items: [
      { id: 'rc-3-i1', name: '채소', amount: 8000, category: 'fresh_food', source: 'OCR' },
      { id: 'rc-3-i2', name: '두부', amount: 2000, category: 'essential', source: 'OCR' },
      { id: 'rc-3-i3', name: '과일', amount: 12000, category: 'fresh_food', source: 'OCR' },
    ],
  },
];

// 이전 구매 기록 (생활비 온도/원인분해의 비교 기준)
export const previousData: PreviousData = {
  prices: {
    우유: 2900,
    계란: 7100,
    과자: 2000, // 이번 주와 같은 표시 가격 (가격 차이 0 → 온도 요인에 영향 없음)
  },
  // 슈링크플레이션 감지 기준: 지난주 과자는 같은 2,000원에 90g (이번 주 76g → 실질 인상)
  volumes: {
    과자: { volume: 90, volumeUnit: 'g' },
  },
  convenienceMealCount: 1, // 지난주 컵라면 등 간편식 1회
  convenienceRatio: 0.12,  // 지난주 편의점 식비 비중 12%
  totalSpending: 64500,    // 지난주 총 지출 (이번 주 76,800원과 비교)
  convenienceSpending: 7800, // 지난주 편의점 식비 금액
  localRatio: 0.34,          // 지난주 지역가게 소비 비중 34% (이번 주 29%와 비교)
};

// ---------- 절약 시나리오 샘플 (지난주보다 지출이 줄어든 주) ----------

// 절약 데모의 비교 기준: 지출이 늘었던 지난주 기록
export const previousDataSaving: PreviousData = {
  prices: {
    우유: 3200,
    계란: 7800,
    컵라면: 1800,
  },
  // 절약 데모의 단위가격 기준: 우유는 같은 900ml에 단가가 내려간 케이스 (실질 인상 없음)
  volumes: {
    우유: { volume: 900, volumeUnit: 'ml' },
  },
  convenienceMealCount: 3, // 지난주 간편식 3회
  convenienceRatio: 0.18,  // 지난주 편의점 식비 비중 18%
  totalSpending: 76800,    // 지난주 총 지출 (이번 주 48,800원과 비교)
  convenienceSpending: 13800, // 지난주 편의점 식비 금액
  localRatio: 0.2,            // 지난주 지역가게 소비 비중 20% (이번 주 33%와 비교)
};

export const sampleTransactionsSaving: Transaction[] = [
  {
    id: 'stx-1',
    date: '2026-07-08',
    merchantName: 'iM마트',
    amount: 28500,
    paymentMethod: 'card',
  },
  {
    id: 'stx-2',
    date: '2026-07-10',
    merchantName: '샛별시장',
    amount: 16000,
    paymentMethod: 'card',
  },
  {
    id: 'stx-3',
    date: '2026-07-11',
    merchantName: '미소24',
    amount: 4300,
    paymentMethod: 'card',
  },
];

// 간편식을 줄이고 행사 상품·시장 장보기 중심으로 소비한 주
export const sampleReceiptsSaving: Receipt[] = [
  {
    id: 'src-1',
    type: 'itemized',
    date: '2026-07-08',
    storeName: 'iM마트',
    storeType: 'large_mart',
    totalAmount: 28500,
    paymentMethod: 'card',
    items: [
      { id: 'src-1-i1', name: '우유', amount: 3000, category: 'essential', source: 'OCR', volume: 900, volumeUnit: 'ml', volumeSource: 'parsed' }, // 행사가 (용량 동일 → 단위가격 하락)
      { id: 'src-1-i2', name: '계란', amount: 7500, category: 'essential', source: 'OCR' }, // 행사가
      { id: 'src-1-i3', name: '두부', amount: 2000, category: 'essential', source: 'OCR' },
      { id: 'src-1-i4', name: '채소', amount: 6000, category: 'fresh_food', source: 'OCR' },
      { id: 'src-1-i5', name: '기타', amount: 10000, category: 'other', source: 'OCR' },
    ],
  },
  {
    id: 'src-2',
    type: 'itemized',
    date: '2026-07-10',
    storeName: '샛별시장',
    storeType: 'traditional_market',
    totalAmount: 16000,
    paymentMethod: 'card',
    items: [
      { id: 'src-2-i1', name: '채소', amount: 7000, category: 'fresh_food', source: 'OCR' },
      { id: 'src-2-i2', name: '과일', amount: 9000, category: 'fresh_food', source: 'OCR' },
    ],
  },
  {
    id: 'src-3',
    type: 'itemized',
    date: '2026-07-11',
    storeName: '미소24',
    storeType: 'convenience_store',
    totalAmount: 4300,
    paymentMethod: 'card',
    items: [
      { id: 'src-3-i1', name: '컵라면', amount: 1800, category: 'convenience_meal', source: 'OCR' },
      { id: 'src-3-i2', name: '생수', amount: 2500, category: 'essential', source: 'OCR' },
    ],
  },
];

// "영수증 추가" 화면에서 고를 수 있는 샘플 영수증 (mock OCR 결과)
export const ocrSampleReceipts: { label: string; description: string; receipt: Omit<Receipt, 'id'> }[] = [
  {
    label: '품목형 영수증',
    description: '품목과 금액이 모두 인식된 영수증',
    receipt: {
      type: 'itemized',
      date: '2026-07-04',
      storeName: '행복슈퍼',
      storeType: 'local_store',
      totalAmount: 12900,
      paymentMethod: 'card',
      items: [
        { id: 'ocr-a-1', name: '생수', amount: 2400, category: 'essential', source: 'OCR' },
        { id: 'ocr-a-2', name: '라면', amount: 4500, category: 'convenience_meal', source: 'OCR' },
        { id: 'ocr-a-3', name: '사과', amount: 6000, category: 'fresh_food', source: 'OCR' },
      ],
    },
  },
  {
    label: '합계형 영수증',
    description: '날짜·상호·총액만 있는 영수증 — 품목을 직접 추가할 수 있어요',
    receipt: {
      type: 'summary',
      date: '2026-07-04',
      storeName: '이모네반찬',
      storeType: 'local_store',
      totalAmount: 15000,
      paymentMethod: 'cash',
      items: [],
    },
  },
  {
    label: '카드매출전표형 영수증',
    description: '품목 분석 없이 거래내역 매칭·증빙용으로만 사용',
    receipt: {
      type: 'card_slip',
      date: '2026-07-02',
      storeName: '봄날커피',
      storeType: 'franchise',
      totalAmount: 4500,
      paymentMethod: 'card',
      items: [],
    },
  },
];
