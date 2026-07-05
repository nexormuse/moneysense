// enum 값 → 한국어 라벨 매핑
import type { MatchStatus, PaymentMethod, ReceiptType, StoreType } from './types';

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  card: '카드',
  cash: '현금',
  bank_transfer: '계좌이체',
  easy_pay: '간편결제',
  other: '기타',
};

export const storeTypeLabels: Record<StoreType, string> = {
  large_mart: '대형마트',
  convenience_store: '편의점',
  traditional_market: '전통시장',
  local_store: '동네가게',
  franchise: '프랜차이즈',
  online: '온라인몰',
  other: '기타',
};

export const matchStatusLabels: Record<MatchStatus, string> = {
  matched: '매칭 완료',
  item_enriched: '품목 보강',
  needs_review: '확인 필요',
  manual_entry: '직접 입력 소비',
};

export const receiptTypeLabels: Record<ReceiptType, string> = {
  itemized: '품목형',
  summary: '합계형',
  card_slip: '카드매출전표',
  manual: '직접 입력',
};

/** 지역상생 소비처 여부 */
export const isLocalStoreType = (storeType: StoreType) =>
  storeType === 'traditional_market' || storeType === 'local_store';
