// mock AI 함수 모음
// 나중에 실제 OCR/LLM API로 교체할 때 이 파일의 함수 시그니처를 유지한 채 내부만 바꾸면 된다.
import type {
  ActionPlan,
  AnalysisResult,
  CauseDetail,
  ComparisonInsight,
  ExpenseItem,
  ItemCategory,
  MatchOverride,
  MatchResult,
  PreviousData,
  Receipt,
  TemperatureFactorItem,
  Transaction,
  UserBaseline,
} from '../types';

// ---------- 유틸 ----------

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export const formatWon = (amount: number) => `${amount.toLocaleString('ko-KR')}원`;

// ---------- 품목 분류 (룰 기반) ----------

const CATEGORY_RULES: { category: ItemCategory; keywords: string[] }[] = [
  { category: 'essential', keywords: ['우유', '계란', '두부', '쌀', '생수', '식용유', '소금', '설탕'] },
  { category: 'fresh_food', keywords: ['채소', '과일', '정육', '생선', '사과', '바나나', '상추', '고기', '돼지', '소고기', '닭'] },
  { category: 'convenience_meal', keywords: ['컵라면', '라면', '즉석밥', '즉석식품', '도시락', '냉동식품', '삼각김밥', '김밥', '햄버거', '샌드위치'] },
  { category: 'snack_drink', keywords: ['과자', '커피', '에너지드링크', '탄산음료', '음료', '아이스크림', '초콜릿', '빵', '케이크'] },
  { category: 'daily_goods', keywords: ['세제', '휴지', '샴푸', '주방용품', '치약', '칫솔', '비누', '수세미'] },
];

/** 품목명을 룰 기반으로 분류한다. 나중에 LLM 분류로 교체 가능. */
export function classifyItem(name: string): ItemCategory {
  const normalized = name.replace(/\s/g, '');
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      return rule.category;
    }
  }
  return 'other';
}

/**
 * 품목 카테고리별 전통시장·동네가게 대체 가능성.
 * 신선식품·기본 식재료는 시장에서 살 수 있지만,
 * 공산품·브랜드 상품(세제, 밀키트, 브랜드 간식 등)은 억지로 전환을 제안하지 않는다.
 */
const SUBSTITUTABLE_CATEGORIES: ReadonlySet<ItemCategory> = new Set(['essential', 'fresh_food']);

export const isSubstitutableItem = (item: ExpenseItem) =>
  SUBSTITUTABLE_CATEGORIES.has(item.category);

export const categoryLabels: Record<ItemCategory, string> = {
  essential: '필수 식료품',
  fresh_food: '신선식품',
  convenience_meal: '간편식',
  snack_drink: '간식·음료',
  daily_goods: '생활용품',
  adjustable: '조정 가능한 소비',
  local_friendly: '지역상생 소비',
  other: '기타',
};

// ---------- mock OCR ----------

/**
 * mock OCR: 실제 OCR API 대신 미리 준비한 결과를 돌려준다.
 * 실제 연동 시 이미지 파일을 받아 OCR API를 호출하도록 교체한다.
 */
export function mockParseReceipt(receipt: Omit<Receipt, 'id'>): Omit<Receipt, 'id'> {
  // 품목 카테고리를 룰 기반으로 다시 분류해 보정한다
  return {
    ...receipt,
    items: receipt.items.map((item) => ({
      ...item,
      category: item.category === 'other' ? classifyItem(item.name) : item.category,
    })),
  };
}

// ---------- 영수증-거래내역 매칭 ----------

/** 상호명 유사도: 한쪽이 다른 쪽을 포함하거나 공통 글자 비율로 판단 */
function isSimilarName(a: string, b: string): boolean {
  const na = a.replace(/\s/g, '').toLowerCase();
  const nb = b.replace(/\s/g, '').toLowerCase();
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const setA = new Set(na.split(''));
  const common = nb.split('').filter((ch) => setA.has(ch)).length;
  return common / Math.max(na.length, nb.length) >= 0.5;
}

/**
 * 영수증과 거래내역을 금액(45)·날짜(25)·상호명(20)·결제수단(10) 점수로 대조한다.
 * 80점 이상: matched/item_enriched, 50~79: needs_review, 50 미만: manual_entry
 */
export function matchReceiptsToTransactions(
  receipts: Receipt[],
  transactions: Transaction[],
): MatchResult[] {
  const usedTransactionIds = new Set<string>();

  return receipts.map((receipt) => {
    // 현금 결제 영수증은 카드 거래내역과 매칭하지 않는다
    if (receipt.paymentMethod === 'cash') {
      return {
        receiptId: receipt.id,
        status: 'manual_entry' as const,
        score: 0,
        message: '현금 결제 영수증입니다. 입력된 거래내역에서는 찾지 못해 직접 입력 소비로 기록했습니다.',
      };
    }

    // 가장 점수가 높은 거래내역을 찾는다
    let best: { tx: Transaction; score: number } | null = null;
    for (const tx of transactions) {
      if (usedTransactionIds.has(tx.id)) continue;
      let score = 0;
      if (tx.amount === receipt.totalAmount) score += 45;
      if (tx.date === receipt.date) score += 25;
      if (isSimilarName(tx.merchantName, receipt.storeName)) score += 20;
      if (tx.paymentMethod === receipt.paymentMethod) score += 10;
      if (!best || score > best.score) best = { tx, score };
    }

    const score = best?.score ?? 0;

    if (best && score >= 80) {
      usedTransactionIds.add(best.tx.id);
      const hasItems = receipt.items.length > 0;
      // 품목 보강 메시지: "총액만 남은 카드내역 → 품목 복원"이 드러나게 쓴다
      const itemNames = receipt.items.slice(0, 4).map((item) => item.name).join('·');
      return {
        receiptId: receipt.id,
        transactionId: best.tx.id,
        // 품목이 있으면 거래내역을 품목 정보로 보강한 것이므로 item_enriched
        status: hasItems ? ('item_enriched' as const) : ('matched' as const),
        score,
        message: hasItems
          ? `카드내역에는 ${best.tx.merchantName} ${formatWon(best.tx.amount)} 총액만 있었어요. 영수증으로 ${itemNames}${receipt.items.length > 4 ? ' 등' : ''} ${receipt.items.length}개 품목 정보를 보강했습니다.`
          : `${best.tx.merchantName} 카드 거래와 매칭을 완료했습니다.`,
      };
    }

    if (best && score >= 50) {
      return {
        receiptId: receipt.id,
        transactionId: best.tx.id,
        status: 'needs_review' as const,
        score,
        message: `${best.tx.merchantName} 거래와 비슷하지만 정보가 일부 달라 확인이 필요합니다.`,
      };
    }

    return {
      receiptId: receipt.id,
      status: 'manual_entry' as const,
      score,
      message:
        '입력된 카드·계좌 거래내역에서는 같은 거래를 찾지 못했습니다. 현금 또는 다른 결제수단 소비로 기록했습니다.',
    };
  });
}

/**
 * 사용자의 수동 판정(매칭 확정/거절)을 매칭 결과에 반영한다.
 * needs_review 상태에서 사용자가 확인한 결과가 자동 판정보다 우선한다.
 */
export function applyMatchOverrides(
  results: MatchResult[],
  receipts: Receipt[],
  transactions: Transaction[],
  overrides: MatchOverride[],
): MatchResult[] {
  if (overrides.length === 0) return results;
  const overrideByReceipt = new Map(overrides.map((override) => [override.receiptId, override]));

  return results.map((result) => {
    const override = overrideByReceipt.get(result.receiptId);
    if (!override) return result;
    const receipt = receipts.find((r) => r.id === result.receiptId);
    if (!receipt) return result;

    if (override.action === 'confirm') {
      const transactionId = override.transactionId ?? result.transactionId;
      const transaction = transactions.find((tx) => tx.id === transactionId);
      // 확정했던 거래가 삭제됐으면 오버라이드를 무시한다
      if (!transaction) return result;
      const hasItems = receipt.items.length > 0;
      return {
        ...result,
        transactionId: transaction.id,
        status: hasItems ? ('item_enriched' as const) : ('matched' as const),
        overridden: true,
        message: hasItems
          ? `사용자 확인으로 ${transaction.merchantName} 거래와 매칭하고 품목 ${receipt.items.length}건으로 보강했습니다.`
          : `사용자 확인으로 ${transaction.merchantName} 거래와 매칭을 완료했습니다.`,
      };
    }

    // reject: 직접 입력 소비로 기록
    return {
      ...result,
      transactionId: undefined,
      status: 'manual_entry' as const,
      overridden: true,
      message: '사용자 확인으로 직접 입력 소비로 기록했습니다.',
    };
  });
}

// ---------- 주간 비교 기준 축적 ----------

/**
 * 이번 주 영수증 기록으로 다음 주 분석의 비교 기준(이전 가격·구매 패턴)을 만든다.
 * '기타' 품목은 실제 상품이 아니므로 가격 기준에서 제외하고,
 * 같은 품목이 여러 번 나오면 최고가를 기준값으로 저장해 가짜 상승을 막는다.
 */
export function buildBaseline(receipts: Receipt[], savedAt: string): UserBaseline {
  const prices: Record<string, number> = {};
  let convenienceMealCount = 0;

  for (const receipt of receipts) {
    for (const item of receipt.items) {
      if (item.category !== 'other') {
        const key = item.name.replace(/\s/g, '');
        prices[key] = Math.max(prices[key] ?? 0, item.amount);
      }
      if (item.category === 'convenience_meal') convenienceMealCount++;
    }
  }

  const totalSpending = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) || 1;
  const convenienceSpending = receipts
    .filter(
      (receipt) =>
        receipt.storeType === 'convenience_store' || receipt.storeType === 'franchise',
    )
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);

  const localSpending = receipts
    .filter(
      (receipt) =>
        receipt.storeType === 'traditional_market' || receipt.storeType === 'local_store',
    )
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);

  return {
    prices,
    convenienceMealCount,
    convenienceRatio: convenienceSpending / totalSpending,
    totalSpending: receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0),
    convenienceSpending,
    localRatio: localSpending / totalSpending,
    savedAt,
  };
}

// ---------- 생활비 온도 계산 ----------

type TemperatureFactors = {
  priceIncrease: number;
  quantityIncrease: number;
  storeShift: number;
  adjustableSpending: number;
  unmatchedRatio: number;
  priceDetails: string[];
  quantityDetails: string[];
  storeDetails: string[];
  adjustableDetails: string[];
  newBaselineItems: string[];
  convenienceMealCount: number;
  convenienceMealTotal: number;
  currentConvenienceRatio: number;
  adjustableRatio: number;
  // 절약(감소) 분석: 지난 기록보다 줄어든 요인
  priceDecreaseWon: number;
  priceDecreaseDetails: string[];
  quantityDecreaseCount: number;
  quantityDecreaseDetails: string[];
  storeDecreaseDetails: string[];
  previousConvenienceMealCount: number;
  // 비교 카드용 원자료
  convenienceSpendingWon: number; // 이번 주 편의점·프랜차이즈 지출 금액
  priceTopChange: { name: string; prev: number; cur: number } | null; // 단가 변화가 가장 큰 품목
};

/** 온도 가산 요인을 계산한다 (원인분해와 온도 계산이 함께 사용) */
function computeFactors(
  receipts: Receipt[],
  matchResults: MatchResult[],
  previous: PreviousData,
): TemperatureFactors {
  const allItems = receipts.flatMap((receipt) => receipt.items);
  const totalSpending = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) || 1;

  // 1) 가격 상승/하락: 이전 가격 기록이 있는 품목의 단가 변화 (상승은 100원당 1점, 최대 20점)
  let priceIncreaseWon = 0;
  let priceDecreaseWon = 0;
  const priceDetails: string[] = [];
  const priceDecreaseDetails: string[] = [];
  const newBaselineItems: string[] = [];
  let priceTopChange: { name: string; prev: number; cur: number } | null = null;
  for (const item of allItems) {
    const prevPrice = previous.prices[item.name.replace(/\s/g, '')];
    if (prevPrice === undefined) {
      newBaselineItems.push(item.name);
      continue;
    }
    const diff = item.amount - prevPrice;
    // 단가 변화 폭이 가장 큰 품목을 비교 카드용으로 기억한다
    if (
      diff !== 0 &&
      (!priceTopChange || Math.abs(diff) > Math.abs(priceTopChange.cur - priceTopChange.prev))
    ) {
      priceTopChange = { name: item.name, prev: prevPrice, cur: item.amount };
    }
    if (diff > 0) {
      priceIncreaseWon += diff;
      priceDetails.push(`${item.name} +${formatWon(diff)} (${formatWon(prevPrice)} → ${formatWon(item.amount)})`);
    } else if (diff < 0) {
      priceDecreaseWon += -diff;
      priceDecreaseDetails.push(
        `${item.name} -${formatWon(-diff)} (${formatWon(prevPrice)} → ${formatWon(item.amount)})`,
      );
    }
  }
  const priceIncrease = clamp(Math.round(priceIncreaseWon / 100), 0, 20);

  // 2) 구매량 증가/감소: 간편식 구매 횟수를 지난주와 비교 (증가 1회당 4점, 최대 20점)
  const convenienceMealItems = allItems.filter((item) => item.category === 'convenience_meal');
  const convenienceMealCount = convenienceMealItems.length;
  const convenienceMealTotal = convenienceMealItems.reduce((sum, item) => sum + item.amount, 0);
  const countIncrease = Math.max(0, convenienceMealCount - previous.convenienceMealCount);
  const quantityDecreaseCount = Math.max(0, previous.convenienceMealCount - convenienceMealCount);
  const quantityIncrease = clamp(countIncrease * 4, 0, 20);
  const quantityDetails =
    countIncrease > 0
      ? [`간편식 구매 ${previous.convenienceMealCount}회 → ${convenienceMealCount}회`]
      : [];
  const quantityDecreaseDetails =
    quantityDecreaseCount > 0
      ? [`간편식 구매 ${previous.convenienceMealCount}회 → ${convenienceMealCount}회`]
      : [];

  // 3) 소비처 변화: 편의점·프랜차이즈 지출 비중을 지난주와 비교 (증가 1%p당 1.5점, 최대 15점)
  const convenienceSpending = receipts
    .filter((receipt) => receipt.storeType === 'convenience_store' || receipt.storeType === 'franchise')
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const currentConvenienceRatio = convenienceSpending / totalSpending;
  const ratioDiff = Math.max(0, currentConvenienceRatio - previous.convenienceRatio);
  const ratioDecrease = Math.max(0, previous.convenienceRatio - currentConvenienceRatio);
  const storeShift = clamp(Math.round(ratioDiff * 100 * 1.5), 0, 15);
  const storeDetails =
    ratioDiff > 0
      ? [
          `편의점·프랜차이즈 지출 비중 ${Math.round(previous.convenienceRatio * 100)}% → ${Math.round(currentConvenienceRatio * 100)}%`,
        ]
      : [];
  const storeDecreaseDetails =
    ratioDecrease >= 0.01
      ? [
          `편의점·프랜차이즈 지출 비중 ${Math.round(previous.convenienceRatio * 100)}% → ${Math.round(currentConvenienceRatio * 100)}%`,
        ]
      : [];

  // 4) 조정 가능한 소비: 간편식·간식·음료 비중 (비중 × 40점, 최대 20점)
  const adjustableSpendingWon = allItems
    .filter((item) =>
      item.category === 'convenience_meal' ||
      item.category === 'snack_drink' ||
      item.category === 'adjustable',
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const adjustableRatio = adjustableSpendingWon / totalSpending;
  const adjustableSpending = clamp(Math.round(adjustableRatio * 40), 0, 20);
  const adjustableDetails =
    adjustableSpendingWon > 0
      ? [`간편식·간식·음료가 전체 지출의 ${Math.round(adjustableRatio * 100)}% (${formatWon(adjustableSpendingWon)})`]
      : [];

  // 5) 거래내역 미매칭(직접 입력) 소비 비중 (비중 × 20점, 최대 10점)
  const manualReceiptIds = new Set(
    matchResults.filter((match) => match.status === 'manual_entry').map((match) => match.receiptId),
  );
  const manualSpending = receipts
    .filter((receipt) => manualReceiptIds.has(receipt.id))
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const unmatchedRatio = clamp(Math.round((manualSpending / totalSpending) * 20), 0, 10);

  return {
    priceIncrease,
    quantityIncrease,
    storeShift,
    adjustableSpending,
    unmatchedRatio,
    priceDetails,
    quantityDetails,
    storeDetails,
    adjustableDetails,
    newBaselineItems,
    convenienceMealCount,
    convenienceMealTotal,
    currentConvenienceRatio,
    adjustableRatio,
    priceDecreaseWon,
    priceDecreaseDetails,
    quantityDecreaseCount,
    quantityDecreaseDetails,
    storeDecreaseDetails,
    previousConvenienceMealCount: previous.convenienceMealCount,
    convenienceSpendingWon: convenienceSpending,
    priceTopChange,
  };
}

/** 생활비 온도(0~100℃)를 계산한다. 기본값 35℃ + 가산 요인 */
export function calculateTemperature(factors: TemperatureFactors): number {
  const temperature =
    35 +
    factors.priceIncrease +
    factors.quantityIncrease +
    factors.storeShift +
    factors.adjustableSpending +
    factors.unmatchedRatio;
  return clamp(Math.round(temperature), 0, 100);
}

function temperatureLabel(temp: number): AnalysisResult['temperatureLabel'] {
  if (temp < 40) return '안정';
  if (temp < 70) return '관심';
  if (temp < 85) return '주의';
  return '뜨거움';
}

// ---------- 생활비 온도 계산 근거 ("왜 이 온도인가요?") ----------

/**
 * 온도 계산 근거를 항목별로 만든다. delta 합계가 곧 생활비 온도가 되어
 * 온도가 임의 숫자가 아니라 계산된 결과임을 보여준다.
 */
export function buildTemperatureBreakdown(factors: TemperatureFactors): TemperatureFactorItem[] {
  const rows: TemperatureFactorItem[] = [
    {
      id: 'base',
      label: '기본 온도',
      delta: 35,
      description: '모든 분석이 시작되는 기준값이에요.',
    },
  ];

  if (factors.priceIncrease > 0) {
    const names = factors.priceDetails.map((detail) => detail.split(' ')[0]).join('·');
    rows.push({
      id: 'price',
      label: `${names} 단가 상승`,
      delta: factors.priceIncrease,
      description: factors.priceDetails.join(', '),
    });
  }
  if (factors.quantityIncrease > 0) {
    rows.push({
      id: 'quantity',
      label: '편의점 간편식 구매 증가',
      delta: factors.quantityIncrease,
      description: factors.quantityDetails[0] ?? '간편식 구매 횟수가 늘었어요.',
    });
  }
  if (factors.storeShift > 0) {
    rows.push({
      id: 'store',
      label: '소비처 변화 (편의점 비중 증가)',
      delta: factors.storeShift,
      description: factors.storeDetails[0] ?? '편의점·프랜차이즈 비중이 늘었어요.',
    });
  }
  if (factors.adjustableSpending > 0) {
    rows.push({
      id: 'adjustable',
      label: '간식·음료 등 조정 가능한 소비',
      delta: factors.adjustableSpending,
      description: factors.adjustableDetails[0] ?? '조정 가능한 소비가 차지하는 비중이에요.',
    });
  }
  if (factors.unmatchedRatio > 0) {
    rows.push({
      id: 'unmatched',
      label: '직접 입력(현금 등) 소비 비중',
      delta: factors.unmatchedRatio,
      description: '거래내역에 없는 소비는 변동 가능성을 조금 더 반영해요.',
    });
  }

  return rows;
}

// ---------- 지난 소비 vs 이번 소비 비교 ----------

/** 지난 기록과 이번 주를 항목별로 비교해 온도 원인과 연결되는 인사이트를 만든다 */
export function buildComparisons(
  factors: TemperatureFactors,
  previous: PreviousData,
  localSpendingRatio: number,
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];

  // 1) 편의점 식비 금액
  if (previous.convenienceSpending !== undefined) {
    const diff = factors.convenienceSpendingWon - previous.convenienceSpending;
    if (diff !== 0) {
      insights.push({
        id: 'convenience-spending',
        label: '편의점 식비',
        previousLabel: formatWon(previous.convenienceSpending),
        currentLabel: formatWon(factors.convenienceSpendingWon),
        changeLabel: `${diff > 0 ? '+' : '-'}${formatWon(Math.abs(diff))}`,
        changeDirection: diff > 0 ? 'up' : 'down',
        description:
          diff > 0
            ? `소비처 변화 +${factors.storeShift}℃의 배경이 된 변화예요.`
            : '편의점 소비를 줄인 것이 이번 주 절약의 큰 배경이에요.',
      });
    }
  }

  // 2) 단가 변화가 가장 큰 품목
  if (factors.priceTopChange) {
    const { name, prev, cur } = factors.priceTopChange;
    const diff = cur - prev;
    insights.push({
      id: 'price-top',
      label: `${name} 가격`,
      previousLabel: formatWon(prev),
      currentLabel: formatWon(cur),
      changeLabel: `${diff > 0 ? '+' : '-'}${formatWon(Math.abs(diff))}`,
      changeDirection: diff > 0 ? 'up' : 'down',
      description:
        diff > 0
          ? `가격 상승 +${factors.priceIncrease}℃에 반영된 대표 품목이에요.`
          : '행사·대체 구매로 단가를 낮춘 대표 품목이에요.',
    });
  }

  // 3) 간편식 구매 횟수
  if (factors.convenienceMealCount !== factors.previousConvenienceMealCount) {
    const diff = factors.convenienceMealCount - factors.previousConvenienceMealCount;
    insights.push({
      id: 'convenience-count',
      label: '간편식 구매',
      previousLabel: `${factors.previousConvenienceMealCount}회`,
      currentLabel: `${factors.convenienceMealCount}회`,
      changeLabel: `${diff > 0 ? '+' : '-'}${Math.abs(diff)}회`,
      changeDirection: diff > 0 ? 'up' : 'down',
      description:
        diff > 0
          ? `구매량 증가 +${factors.quantityIncrease}℃로 이어진 변화예요.`
          : '간편식을 줄인 만큼 생활비 온도도 낮게 유지됐어요.',
    });
  }

  // 4) 지역가게(전통시장·동네가게) 소비 비중
  if (previous.localRatio !== undefined) {
    const prevPct = Math.round(previous.localRatio * 100);
    const curPct = Math.round(localSpendingRatio * 100);
    if (prevPct !== curPct) {
      const diff = curPct - prevPct;
      insights.push({
        id: 'local-ratio',
        label: '지역가게 소비 비중',
        previousLabel: `${prevPct}%`,
        currentLabel: `${curPct}%`,
        changeLabel: `${diff > 0 ? '+' : '-'}${Math.abs(diff)}%p`,
        changeDirection: diff > 0 ? 'up' : 'down',
        description:
          diff > 0
            ? '동네시장·동네가게 소비가 늘어 지역상생에도 힘이 됐어요.'
            : '동네시장·동네가게 소비 비중이 줄었어요. 다음 장보기에서 회복을 제안해요.',
      });
    }
  }

  return insights;
}

// ---------- 원인분해 ----------

/** 4가지 원인 카드 데이터를 생성한다. 감소한 요인은 절약 관점으로 설명한다. */
export function analyzeCauses(factors: TemperatureFactors): CauseDetail[] {
  // 가격: 상승이 있으면 상승 우선, 없고 하락이 있으면 절약으로 설명
  const priceSaved = factors.priceDetails.length === 0 && factors.priceDecreaseDetails.length > 0;
  const quantitySaved =
    factors.quantityDetails.length === 0 && factors.quantityDecreaseDetails.length > 0;
  const storeSaved = factors.storeDetails.length === 0 && factors.storeDecreaseDetails.length > 0;

  return [
    {
      key: 'priceIncrease',
      title: priceSaved ? '가격 변화 (절약)' : '가격 상승',
      points: factors.priceIncrease,
      description: factors.priceDetails.length > 0
        ? '자주 사는 품목의 단가가 지난 기록보다 올랐어요.'
        : priceSaved
          ? '행사·대체 구매로 단가가 내려간 품목이 있어요. 절약에 기여했어요.'
          : '이전 가격 기록과 비교했을 때 눈에 띄는 단가 상승은 없어요.',
      details:
        factors.priceDetails.length > 0
          ? factors.priceDetails
          : priceSaved
            ? factors.priceDecreaseDetails
            : factors.newBaselineItems.length > 0
              ? [`${factors.newBaselineItems.slice(0, 3).join(', ')} 등은 이번 가격을 기준값으로 저장합니다.`]
              : [],
    },
    {
      key: 'quantityIncrease',
      title: quantitySaved ? '구매량 변화 (절약)' : '구매량 증가',
      points: factors.quantityIncrease,
      description: factors.quantityDetails.length > 0
        ? '같은 카테고리의 구매 횟수가 늘었어요.'
        : quantitySaved
          ? '간편식 구매 횟수가 지난주보다 줄었어요. 절약에 크게 기여했어요.'
          : '구매 횟수는 지난주와 비슷한 수준이에요.',
      details: factors.quantityDetails.length > 0
        ? factors.quantityDetails
        : quantitySaved
          ? factors.quantityDecreaseDetails
          : [],
    },
    {
      key: 'storeShift',
      title: storeSaved ? '소비처 변화 (절약)' : '소비처 변화',
      points: factors.storeShift,
      description: factors.storeDetails.length > 0
        ? '대형마트·전통시장보다 편의점·프랜차이즈 비중이 늘었어요.'
        : storeSaved
          ? '편의점 비중이 줄고 마트·시장 장보기 중심으로 소비했어요.'
          : '소비처 구성은 지난주와 비슷해요.',
      details: factors.storeDetails.length > 0
        ? factors.storeDetails
        : storeSaved
          ? factors.storeDecreaseDetails
          : [],
    },
    {
      key: 'adjustableSpending',
      title: '조정 가능한 소비',
      points: factors.adjustableSpending,
      description:
        factors.adjustableRatio <= 0.08 && factors.adjustableDetails.length > 0
          ? '간편식·간식·음료 비중이 낮게 잘 관리되고 있어요.'
          : factors.adjustableDetails.length > 0
            ? '간편식·간식·음료 등 조정 가능한 소비가 차지하는 비중이에요.'
            : '조정 가능한 소비 비중이 낮은 편이에요.',
      details: factors.adjustableDetails,
    },
  ];
}

// ---------- 다음 장보기 플랜 ----------

/** mock AI: 다음 장보기 액션 플랜을 생성한다. 실제 연동 시 LLM 호출로 교체. */
export function generateActionPlans(
  receipts: Receipt[],
  factors: TemperatureFactors,
  spendingDelta = 0,
  localSpendingRatio = 0,
): ActionPlan[] {
  const plans: ActionPlan[] = [];

  // 절약한 주: 잘한 패턴을 유지하도록 제안한다
  if (spendingDelta < 0) {
    if (factors.quantityDecreaseCount > 0) {
      plans.push({
        text: `간편식 구매를 ${factors.previousConvenienceMealCount}회에서 ${factors.convenienceMealCount}회로 줄인 패턴, 다음 장보기에도 유지해보세요.`,
        savingHint: `이번 주 약 ${formatWon(Math.abs(spendingDelta))} 절약`,
      });
    }
    if (factors.priceDecreaseWon > 0) {
      const savedItems = factors.priceDecreaseDetails
        .map((detail) => detail.split(' ')[0])
        .join('·');
      plans.push({
        text: `${savedItems}은(는) 행사·대체 구매로 단가를 낮췄어요. 다음 장보기에도 행사 주기를 확인해보세요.`,
      });
    }
  }

  // 1) 간편식 대체 제안
  if (factors.convenienceMealCount >= 2) {
    const replaceCount = Math.min(2, factors.convenienceMealCount);
    const estimatedSaving = Math.round((factors.convenienceMealTotal * 0.6) / 1000) * 1000;
    plans.push({
      text: `편의점 간편식 ${replaceCount}회를 장보기 식재료로 대체해보세요.`,
      savingHint: `약 ${formatWon(Math.max(estimatedSaving, 5000))} 절약 예상`,
    });
  }

  // 2) 가격 상승 품목 대응
  if (factors.priceDetails.length > 0) {
    const risingItems = factors.priceDetails.map((detail) => detail.split(' ')[0]).join('·');
    plans.push({
      text: `${risingItems}은(는) 이번 달 가격 상승 품목이에요. 행사 상품이나 대체 브랜드를 확인해보세요.`,
    });
  }

  // 3) 지역상생 전환 제안
  const hasLocalSpending = receipts.some(
    (receipt) =>
      receipt.storeType === 'traditional_market' || receipt.storeType === 'local_store',
  );
  plans.push({
    text: hasLocalSpending
      ? '채소·두부·과일은 동네시장 장보기를 유지하면 지역상생 소비 비중도 함께 높일 수 있어요.'
      : '채소·과일 같은 신선식품은 동네시장에서 사면 지역상생 소비 비중을 높일 수 있어요.',
    isLocal: true,
  });

  // 4) 동일 예산 안에서 지역상생 비중을 높이는 전환 제안
  //    대체 가능한 품목(신선식품·기본 식재료)의 금액만 전환 대상으로 계산해 제안의 근거를 보여준다.
  //    세제·밀키트 같은 공산품·브랜드 상품을 시장에서 사라고 제안하는 실수를 막는다.
  const totalSpending = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) || 1;
  const localSpending = receipts
    .filter(
      (receipt) =>
        receipt.storeType === 'traditional_market' || receipt.storeType === 'local_store',
    )
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const substitutableItems = receipts
    .filter(
      (receipt) =>
        receipt.storeType !== 'traditional_market' && receipt.storeType !== 'local_store',
    )
    .flatMap((receipt) => receipt.items)
    .filter(isSubstitutableItem);
  const substitutableTotal = substitutableItems.reduce((sum, item) => sum + item.amount, 0);
  if (substitutableTotal > 0 && localSpendingRatio < 0.5) {
    const currentPct = Math.round(localSpendingRatio * 100);
    // 대체 가능 품목을 모두 옮겼을 때의 비중이 상한. 전량 전환은 비현실적이므로 60%로 제한한다
    const targetPct = Math.min(
      Math.floor(((localSpending + substitutableTotal) / totalSpending) * 100),
      60,
    );
    if (targetPct > currentPct) {
      const topNames = [...substitutableItems]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 2)
        .map((item) => item.name)
        .join('·');
      plans.push({
        text: `이번 장보기에서 대체 가능한 품목(${topNames} 등 ${formatWon(substitutableTotal)}) 중 일부를 동네시장으로 옮기면 지역상생 소비 비중을 ${currentPct}%에서 약 ${targetPct}%까지 높일 수 있어요.`,
        isLocal: true,
      });
    }
  }

  // 플랜이 부족하면 기본 제안으로 채운다
  if (plans.length < 3) {
    plans.push({
      text: '장보기 전에 필요한 품목 목록을 만들어두면 반복 소액 소비를 줄이는 데 도움이 돼요.',
    });
  }

  return plans.slice(0, 4);
}

// ---------- 요약 메시지 ----------

/** mock AI: 대시보드 상단 한 줄 요약을 생성한다 */
export function generateSummaryMessage(
  temperature: number,
  label: AnalysisResult['temperatureLabel'],
  mainReasons: string[],
  spendingDelta = 0,
): string {
  if (mainReasons.length === 0) {
    return `이번 주 생활비 온도는 ${temperature}℃ (${label}) 이에요. 아직 분석할 소비 기록이 부족해요.`;
  }
  if (spendingDelta < 0) {
    return `지난주보다 ${formatWon(Math.abs(spendingDelta))}을 아꼈어요. 가장 큰 절약 요인은 "${mainReasons[0]}"이에요.`;
  }
  return `이번 주 생활비 온도는 ${temperature}℃ (${label}) — 가장 큰 요인은 "${mainReasons[0]}"이에요.`;
}

// ---------- 발표용 요약 ----------

/**
 * mock AI: 발표용 3~4문장 요약을 생성한다.
 * "총액만 남은 카드내역 → 영수증 품목 복원 → 온도 변화 원인 → 다음 행동 제안" 흐름을 담는다.
 */
export function generatePresentationSummary(
  receipts: Receipt[],
  matchResults: MatchResult[],
  temperature: number,
  label: AnalysisResult['temperatureLabel'],
  mainReasons: string[],
  spendingDelta: number,
  factors: TemperatureFactors,
): string {
  if (receipts.length === 0) return '';

  // 문장 1: 총액만 남아 있던 카드내역 (매칭된 영수증 중 금액이 큰 2건)
  const matchedReceipts = matchResults
    .filter((match) => match.transactionId && (match.status === 'matched' || match.status === 'item_enriched'))
    .map((match) => receipts.find((receipt) => receipt.id === match.receiptId))
    .filter((receipt): receipt is Receipt => Boolean(receipt))
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 2);
  const sentence1 =
    matchedReceipts.length > 0
      ? `카드내역에는 ${matchedReceipts.map((receipt) => `${receipt.storeName} ${formatWon(receipt.totalAmount)}`).join(', ')}처럼 총액만 남아 있었어요.`
      : '카드·계좌 내역에는 어디서 얼마 썼는지 총액만 남아 있었어요.';

  // 문장 2: 품목 복원 + 온도 변화의 원인
  const reasonPhrase =
    mainReasons.length > 0
      ? `'${mainReasons[0]}'${mainReasons[1] ? `, '${mainReasons[1]}'` : ''}`
      : '';
  const sentence2 =
    spendingDelta < 0
      ? `머니센스는 영수증 ${receipts.length}장으로 품목 정보를 복원했고, 지난주보다 ${formatWon(Math.abs(spendingDelta))}을 아낀 비결이 ${reasonPhrase || '장보기 패턴의 변화'} 덕분임을 확인했어요.`
      : `머니센스는 영수증 ${receipts.length}장으로 품목 정보를 복원했고, 생활비 온도가 ${temperature}℃(${label})까지 오른 이유가 ${reasonPhrase || '소비 패턴의 변화'} 때문임을 확인했어요.`;

  // 문장 3: 다음 행동 제안
  const sentence3 =
    spendingDelta < 0
      ? '다음 주에도 간편식을 줄인 장보기 패턴을 유지하고, 동네시장 소비 비중을 이어가는 플랜을 제안해요.'
      : factors.convenienceMealCount >= 2
        ? `다음 주에는 편의점 간편식 ${Math.min(2, factors.convenienceMealCount)}회를 장보기 식재료로 바꾸고, 채소·두부·과일은 동네시장 장보기를 유지하는 플랜을 제안해요.`
        : '다음 주에는 장보기 목록을 미리 만들어 반복 소액 소비를 줄이는 플랜을 제안해요.';

  return `${sentence1} ${sentence2} ${sentence3}`;
}

// ---------- 전체 분석 파이프라인 ----------

/** 영수증·거래내역·이전 기록으로 전체 분석 결과를 만든다 */
export function analyzeAll(
  receipts: Receipt[],
  transactions: Transaction[],
  previous: PreviousData,
  overrides: MatchOverride[] = [],
): { matchResults: MatchResult[]; analysis: AnalysisResult } {
  const matchResults = applyMatchOverrides(
    matchReceiptsToTransactions(receipts, transactions),
    receipts,
    transactions,
    overrides,
  );
  const factors = computeFactors(receipts, matchResults, previous);
  const temperature = calculateTemperature(factors);
  const label = temperatureLabel(temperature);
  const causeDetails = analyzeCauses(factors);

  // 지난주 대비 지출 증감 (비교 기준이 없으면 0)
  const totalSpending = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0) || 1;
  const previousTotal = previous.totalSpending ?? 0;
  const spendingDelta = previousTotal > 0 ? totalSpending - previousTotal : 0;

  // 지역상생 소비 비중: 전통시장·동네가게 지출 / 전체 지출
  const localSpending = receipts
    .filter(
      (receipt) =>
        receipt.storeType === 'traditional_market' || receipt.storeType === 'local_store',
    )
    .reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const localSpendingRatio = localSpending / totalSpending;

  // 주요 원인 3개: 지출이 늘었으면 상승 요인, 줄었으면 절약 요인을 뽑는다
  let mainReasons: string[];
  if (spendingDelta < 0) {
    const savingCandidates: { weight: number; text: string }[] = [
      {
        weight: factors.quantityDecreaseCount * 4,
        text: `간편식 구매 ${factors.previousConvenienceMealCount}회 → ${factors.convenienceMealCount}회로 감소`,
      },
      {
        weight: factors.storeDecreaseDetails.length > 0 ? 8 : 0,
        text: '편의점 대신 마트·시장 장보기 중심으로 소비',
      },
      {
        weight: Math.round(factors.priceDecreaseWon / 100),
        text:
          factors.priceDecreaseDetails.length > 0
            ? `${factors.priceDecreaseDetails.map((detail) => detail.split(' ')[0]).join('·')} 행사가 구매로 단가 하락`
            : '행사 상품 활용으로 단가 하락',
      },
      {
        weight: localSpendingRatio >= 0.2 ? 5 : 0,
        text: `전통시장·동네가게 소비 비중 ${Math.round(localSpendingRatio * 100)}% 유지`,
      },
    ];
    mainReasons = savingCandidates
      .filter((reason) => reason.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 3)
      .map((reason) => reason.text);
  } else {
    const reasonCandidates: { points: number; text: string }[] = [
      {
        points: factors.adjustableSpending + factors.quantityIncrease,
        text: '편의점 간편식·음료 소비 증가',
      },
      {
        points: factors.priceIncrease,
        text:
          factors.priceDetails.length > 0
            ? `${factors.priceDetails.map((detail) => detail.split(' ')[0]).join('·')} 단가 상승`
            : '자주 사는 품목의 단가 상승',
      },
      { points: factors.storeShift, text: '소비처가 편의점 중심으로 이동' },
      { points: factors.unmatchedRatio, text: '현금 등 직접 입력 소비 비중 증가' },
    ];
    mainReasons = reasonCandidates
      .filter((reason) => reason.points > 0)
      .sort((a, b) => b.points - a.points)
      .slice(0, 3)
      .map((reason) => reason.text);
  }

  const actionPlans = generateActionPlans(receipts, factors, spendingDelta, localSpendingRatio);

  const analysis: AnalysisResult = {
    temperature,
    temperatureLabel: label,
    mainReasons,
    causeBreakdown: {
      priceIncrease: factors.priceIncrease,
      quantityIncrease: factors.quantityIncrease,
      storeShift: factors.storeShift,
      adjustableSpending: factors.adjustableSpending,
    },
    causeDetails,
    localSpendingRatio,
    actionPlans,
    summaryMessage: generateSummaryMessage(temperature, label, mainReasons, spendingDelta),
    spendingDelta,
    temperatureBreakdown: buildTemperatureBreakdown(factors),
    comparisons: buildComparisons(factors, previous, localSpendingRatio),
    presentationSummary: generatePresentationSummary(
      receipts,
      matchResults,
      temperature,
      label,
      mainReasons,
      spendingDelta,
      factors,
    ),
  };

  return { matchResults, analysis };
}
