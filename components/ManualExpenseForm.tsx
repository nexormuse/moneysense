// 직접 입력 폼: 날짜/상호/소비처/결제수단/금액(빠른 버튼)/품목/메모
'use client';

import { useState } from 'react';
import AmountQuickButtons from './AmountQuickButtons';
import ItemInputList from './ItemInputList';
import { Button } from './ui';
import { paymentMethodLabels, storeTypeLabels } from '@/lib/labels';
import type { ExpenseItem, PaymentMethod, Receipt, StoreType } from '@/lib/types';

type ManualExpenseFormProps = {
  onSave: (receipt: Omit<Receipt, 'id'>) => void;
  initial?: Receipt; // 있으면 편집 모드
  submitLabel?: string;
  onCancel?: () => void;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ManualExpenseForm({
  onSave,
  initial,
  submitLabel = '지출 저장하기',
  onCancel,
}: ManualExpenseFormProps) {
  const [date, setDate] = useState(initial?.date ?? today());
  const [storeName, setStoreName] = useState(initial?.storeName ?? '');
  const [storeType, setStoreType] = useState<StoreType>(initial?.storeType ?? 'large_mart');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    initial?.paymentMethod ?? 'card',
  );
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount ?? 0);
  const [items, setItems] = useState<ExpenseItem[]>(initial?.items ?? []);
  const [memo, setMemo] = useState(initial?.memo ?? '');
  const [error, setError] = useState('');

  // 카드매출전표는 품목 분석을 하지 않으므로 품목 입력을 숨긴다
  const hideItems = initial?.type === 'card_slip';

  const itemsTotal = items.reduce((sum, item) => sum + item.amount, 0);

  const handleSave = () => {
    if (!storeName.trim()) {
      setError('상호명을 입력해주세요.');
      return;
    }
    if (totalAmount <= 0) {
      setError('총액을 입력해주세요.');
      return;
    }
    onSave({
      type: initial?.type ?? 'manual', // 편집 시 원래 영수증 유형 유지
      date,
      storeName: storeName.trim(),
      storeType,
      totalAmount,
      paymentMethod,
      items: hideItems ? [] : items,
      memo: memo.trim() || undefined,
    });
    if (initial) return; // 편집 모드에서는 폼을 초기화하지 않는다
    // 저장 후 폼 초기화
    setStoreName('');
    setTotalAmount(0);
    setItems([]);
    setMemo('');
    setError('');
  };

  const labelClass = 'block text-xs font-medium text-slate-500 mb-1';
  const inputClass =
    'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>날짜</label>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>상호명</label>
          <input
            type="text"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            placeholder="예: iM마트, 샛별시장"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>소비처 유형</label>
          <select
            value={storeType}
            onChange={(event) => setStoreType(event.target.value as StoreType)}
            className={inputClass}
          >
            {Object.entries(storeTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>결제수단</label>
          <select
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
            className={inputClass}
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>총액</label>
        <AmountQuickButtons value={totalAmount} onChange={setTotalAmount} />
      </div>

      {!hideItems && (
        <div>
          <label className={labelClass}>품목 목록 (선택)</label>
          <ItemInputList items={items} onChange={setItems} />
          {items.length > 0 && itemsTotal !== totalAmount && (
            <p className="mt-1.5 text-xs text-amber-600">
              품목 합계({itemsTotal.toLocaleString('ko-KR')}원)와 총액이 달라요. 총액 기준으로
              기록돼요.
            </p>
          )}
        </div>
      )}

      <div>
        <label className={labelClass}>메모 (선택)</label>
        <input
          type="text"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
          placeholder="예: 주말 장보기"
          className={inputClass}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex gap-2">
        <Button onClick={handleSave} size="lg" className="flex-1">
          {submitLabel}
        </Button>
        {onCancel && (
          <Button variant="secondary" size="lg" onClick={onCancel}>
            취소
          </Button>
        )}
      </div>
    </div>
  );
}
