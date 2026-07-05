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
      { id: 'rc-2-i4', name: '과자', amount: 2000, category: 'snack_drink', source: 'OCR' },
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
  },
  convenienceMealCount: 1, // 지난주 컵라면 등 간편식 1회
  convenienceRatio: 0.12,  // 지난주 편의점 식비 비중 12%
  totalSpending: 64500,    // 지난주 총 지출 (이번 주 76,800원과 비교)
};

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
