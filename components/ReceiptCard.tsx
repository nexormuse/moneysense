// 저장된 영수증 1장을 보여주는 카드 (사후 편집 지원)
'use client';

import { Pencil, X } from 'lucide-react';
import { useState } from 'react';
import ManualExpenseForm from './ManualExpenseForm';
import { Badge } from './ui';
import { categoryLabels } from '@/lib/services/mockAi';
import {
  isLocalStoreType,
  paymentMethodLabels,
  receiptTypeLabels,
  storeTypeLabels,
} from '@/lib/labels';
import type { Receipt } from '@/lib/types';

type ReceiptCardProps = {
  receipt: Receipt;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, receipt: Omit<Receipt, 'id'>) => void;
};

export default function ReceiptCard({ receipt, onDelete, onUpdate }: ReceiptCardProps) {
  const [editing, setEditing] = useState(false);

  // 편집 모드: 같은 폼을 재사용해 날짜·상호·금액·품목까지 수정
  if (editing && onUpdate) {
    return (
      <div className="rounded-xl border border-emerald-300 bg-white p-4 sm:col-span-2">
        <p className="mb-3 text-sm font-semibold text-slate-800">
          영수증 편집 — {receipt.storeName}
          <span className="ml-2 align-middle">
            <Badge tone="slate">{receiptTypeLabels[receipt.type]}</Badge>
          </span>
        </p>
        <ManualExpenseForm
          initial={receipt}
          submitLabel="수정 내용 저장"
          onCancel={() => setEditing(false)}
          onSave={(updated) => {
            onUpdate(receipt.id, updated);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">{receipt.storeName}</span>
            <Badge tone="slate">{receiptTypeLabels[receipt.type]}</Badge>
            {isLocalStoreType(receipt.storeType) && <Badge tone="green">지역상생</Badge>}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {receipt.date} · {storeTypeLabels[receipt.storeType]} ·{' '}
            {paymentMethodLabels[receipt.paymentMethod]}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-slate-900">
            {receipt.totalAmount.toLocaleString('ko-KR')}원
          </span>
          {onUpdate && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-slate-300 hover:text-emerald-600"
              aria-label="영수증 편집"
            >
              <Pencil size={15} />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(receipt.id)}
              className="text-slate-300 hover:text-red-500"
              aria-label="영수증 삭제"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {receipt.items.length > 0 ? (
        <ul className="mt-3 space-y-1 border-t border-slate-100 pt-2">
          {receipt.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-slate-700">
                {item.name}
                <span className="text-[11px] text-slate-400">
                  {categoryLabels[item.category]}
                </span>
              </span>
              <span className="text-slate-600">{item.amount.toLocaleString('ko-KR')}원</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-slate-400 border-t border-slate-100 pt-2">
          {receipt.type === 'card_slip'
            ? '카드매출전표는 품목 분석 없이 거래내역 매칭·증빙용으로만 사용해요.'
            : onUpdate
              ? '품목 정보가 없는 영수증이에요. 편집에서 품목을 추가하면 분석이 더 정확해져요.'
              : '품목 정보가 없는 영수증이에요.'}
        </p>
      )}
      {receipt.memo && <p className="mt-2 text-xs text-slate-500">메모: {receipt.memo}</p>}
    </div>
  );
}
