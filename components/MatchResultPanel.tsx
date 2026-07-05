// 거래 매칭 결과 패널: 영수증 ↔ 거래내역 매칭 상태를 카드로 표시
'use client';

import { Check, Link2, Link2Off, Undo2, UserCheck, X } from 'lucide-react';
import { Badge, Card, EmptyState } from './ui';
import { matchStatusLabels } from '@/lib/labels';
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
      subtitle="영수증과 카드·계좌 거래내역을 금액·날짜·상호명·결제수단으로 대조했어요."
    >
      <ul className="space-y-2.5">
        {matchResults.map((match) => {
          const receipt = receipts.find((r) => r.id === match.receiptId);
          const transaction = transactions.find((t) => t.id === match.transactionId);
          if (!receipt) return null;
          const isLinked = match.status === 'matched' || match.status === 'item_enriched';
          return (
            <li
              key={match.receiptId}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {isLinked ? (
                    <Link2 size={15} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Link2Off size={15} className="text-slate-400 shrink-0" />
                  )}
                  <span className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
                    영수증
                  </span>
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {receipt.storeName} · {receipt.totalAmount.toLocaleString('ko-KR')}원 ·{' '}
                    {receipt.date}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {match.overridden && (
                    <Badge tone="green">
                      <UserCheck size={11} /> 직접 확인함
                    </Badge>
                  )}
                  <Badge tone={statusTone[match.status]}>{matchStatusLabels[match.status]}</Badge>
                </div>
              </div>
              {/* 매칭된 카드·계좌 거래내역 표시 */}
              {transaction && (
                <div className="mt-1.5 flex items-center gap-2 pl-6">
                  <span className="shrink-0 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-500">
                    거래내역
                  </span>
                  <span className="text-xs text-slate-600 truncate">
                    {transaction.merchantName} · {transaction.amount.toLocaleString('ko-KR')}원 ·{' '}
                    {transaction.date}
                  </span>
                </div>
              )}
              <p className="mt-1.5 text-xs text-slate-500 pl-6">{match.message}</p>

              {/* 확인 필요: 사용자가 매칭을 직접 확정/거절할 수 있다 */}
              {match.status === 'needs_review' &&
                !match.overridden &&
                match.transactionId &&
                onConfirmMatch &&
                onRejectMatch && (
                  <div className="mt-2.5 flex gap-2 pl-6">
                    <button
                      type="button"
                      onClick={() => onConfirmMatch(match.receiptId, match.transactionId!)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
                    >
                      <Check size={12} /> 이 거래가 맞아요
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectMatch(match.receiptId)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <X size={12} /> 다른 소비예요 (직접 입력으로 기록)
                    </button>
                  </div>
                )}

              {/* 수동 판정 되돌리기 */}
              {match.overridden && onResetOverride && (
                <div className="mt-2 pl-6">
                  <button
                    type="button"
                    onClick={() => onResetOverride(match.receiptId)}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
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
