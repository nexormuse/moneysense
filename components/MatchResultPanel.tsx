// 거래 매칭 결과 패널: 영수증 ↔ 거래내역 매칭 상태 표시 + 영수증을 누르면 구매 품목 확인
'use client';

import { Check, ChevronDown, Link2, Link2Off, Undo2, UserCheck, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Card, EmptyState } from './ui';
import { matchStatusLabels } from '@/lib/labels';
import { categoryLabels } from '@/lib/services/mockAi';
import type { MatchResult, MatchStatus, Receipt, Transaction } from '@/lib/types';

type MatchResultPanelProps = {
  receipts: Receipt[];
  transactions: Transaction[];
  matchResults: MatchResult[];
  onConfirmMatch?: (receiptId: string, transactionId: string) => void;
  onRejectMatch?: (receiptId: string) => void;
  onResetOverride?: (receiptId: string) => void;
};

const statusTone: Record<MatchStatus, 'green' | 'blue' | 'amber' | 'slate'> = {
  item_enriched: 'green',
  matched: 'blue',
  needs_review: 'amber',
  manual_entry: 'slate',
};

export default function MatchResultPanel({
  receipts,
  transactions,
  matchResults,
  onConfirmMatch,
  onRejectMatch,
  onResetOverride,
}: MatchResultPanelProps) {
  // 펼쳐진 영수증 id (품목 상세 보기)
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (receipts.length === 0) {
    return (
      <Card title="거래 매칭 결과">
        <EmptyState
          icon={<Link2 size={36} />}
          title="매칭할 영수증이 없어요"
          description="영수증을 추가하면 카드·계좌 거래내역과 자동으로 대조해드려요."
        />
      </Card>
    );
  }

  return (
    <Card
      title="거래 매칭 결과"
      subtitle="영수증을 누르면 무엇을 샀는지 품목을 확인할 수 있어요."
    >
      <ul className="space-y-2.5">
        {matchResults.map((match) => {
          const receipt = receipts.find((r) => r.id === match.receiptId);
          const transaction = transactions.find((t) => t.id === match.transactionId);
          if (!receipt) return null;
          const isLinked = match.status === 'matched' || match.status === 'item_enriched';
          const expanded = expandedId === match.receiptId;
          return (
            <li
              key={match.receiptId}
              className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60"
            >
              {/* 영수증 헤더: 누르면 품목 상세가 펼쳐진다 */}
              <button
                type="button"
                onClick={() => setExpandedId(expanded ? null : match.receiptId)}
                className="w-full p-3.5 text-left transition-colors hover:bg-slate-100/70 active:bg-slate-100"
                aria-expanded={expanded}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex min-w-0 items-center gap-2">
                    {isLinked ? (
                      <Link2 size={15} className="shrink-0 text-emerald-600" />
                    ) : (
                      <Link2Off size={15} className="shrink-0 text-slate-400" />
                    )}
                    <span className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      영수증
                    </span>
                    <span className="truncate text-sm font-medium text-slate-800">
                      {receipt.storeName} · {receipt.totalAmount.toLocaleString('ko-KR')}원
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {match.overridden && (
                      <Badge tone="green">
                        <UserCheck size={11} /> 직접 확인함
                      </Badge>
                    )}
                    <Badge tone={statusTone[match.status]}>
                      {matchStatusLabels[match.status]}
                    </Badge>
                    <ChevronDown
                      size={15}
                      className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* 매칭된 카드·계좌 거래내역 */}
                {transaction && (
                  <div className="mt-1.5 flex items-center gap-2 pl-6">
                    <span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                      거래내역
                    </span>
                    <span className="truncate text-xs text-slate-600">
                      {transaction.merchantName} · {transaction.amount.toLocaleString('ko-KR')}원
                      · {transaction.date}
                    </span>
                  </div>
                )}
                <p className="mt-1.5 pl-6 text-xs text-slate-500">{match.message}</p>

                {/* 펼치기 유도 */}
                {!expanded && (
                  <p className="mt-1.5 pl-6 text-[11px] font-semibold text-emerald-600">
                    {receipt.items.length > 0
                      ? `눌러서 구매 품목 ${receipt.items.length}건 보기`
                      : '눌러서 영수증 정보 보기'}
                  </p>
                )}
              </button>

              {/* 품목 상세 */}
              {expanded && (
                <div className="border-t border-slate-200 bg-white px-3.5 py-3">
                  <p className="mb-2 text-[11px] font-semibold text-slate-400">
                    {receipt.date} · 구매 품목
                  </p>
                  {receipt.items.length > 0 ? (
                    <ul className="space-y-1.5">
                      {receipt.items.map((item) => (
                        <li key={item.id} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-1.5 text-slate-700">
                            {item.name}
                            <Badge tone="slate">{categoryLabels[item.category]}</Badge>
                          </span>
                          <span className="font-medium text-slate-600">
                            {item.amount.toLocaleString('ko-KR')}원
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs leading-relaxed text-slate-400">
                      {receipt.type === 'card_slip'
                        ? '카드매출전표는 품목 분석 없이 거래내역 매칭·증빙용으로 사용해요.'
                        : '품목 정보가 없는 영수증이에요. 입력 탭에서 편집하면 품목을 추가할 수 있어요.'}
                    </p>
                  )}
                </div>
              )}

              {/* 확인 필요: 사용자가 매칭을 직접 확정/거절 (펼침과 무관하게 항상 표시) */}
              {match.status === 'needs_review' &&
                !match.overridden &&
                match.transactionId &&
                onConfirmMatch &&
                onRejectMatch && (
                  <div className="flex gap-2 border-t border-slate-200 bg-white px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => onConfirmMatch(match.receiptId, match.transactionId!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 active:scale-95"
                    >
                      <Check size={12} /> 이 거래가 맞아요
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectMatch(match.receiptId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 active:scale-95"
                    >
                      <X size={12} /> 다른 소비예요
                    </button>
                  </div>
                )}

              {/* 수동 판정 되돌리기 */}
              {match.overridden && onResetOverride && (
                <div className="border-t border-slate-200 bg-white px-3.5 py-2">
                  <button
                    type="button"
                    onClick={() => onResetOverride(match.receiptId)}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
                  >
                    <Undo2 size={11} /> 자동 판정으로 되돌리기
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
