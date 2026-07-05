// 카드·계좌 거래내역 패널: 샘플 거래내역 표시 + 새 거래내역 직접 추가
'use client';

import { CreditCard, Plus } from 'lucide-react';
import { useState } from 'react';
import AmountQuickButtons from './AmountQuickButtons';
import { Badge, Button, EmptyState } from './ui';
import { paymentMethodLabels } from '@/lib/labels';
import type { PaymentMethod, Transaction } from '@/lib/types';

type TransactionPanelProps = {
  transactions: Transaction[];
  onAdd: (transaction: Omit<Transaction, 'id'>) => void;
  onLoadSample?: () => void; // 비어 있을 때 샘플 거래내역 불러오기
};

const today = () => new Date().toISOString().slice(0, 10);

export default function TransactionPanel({
  transactions,
  onAdd,
  onLoadSample,
}: TransactionPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today());
  const [merchantName, setMerchantName] = useState('');
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const handleAdd = () => {
    if (!merchantName.trim() || amount <= 0) return;
    onAdd({ date, merchantName: merchantName.trim(), amount, paymentMethod });
    setMerchantName('');
    setAmount(0);
    setShowForm(false);
  };

  const inputClass =
    'w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        실제 서비스에서는 카드·계좌 연동으로 자동으로 불러와요. MVP에서는 샘플 거래내역을
        사용합니다.
      </p>

      {transactions.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={36} />}
          title="아직 거래내역이 없어요"
          description="샘플 거래내역을 불러오거나 아래에서 직접 추가해보세요."
          action={
            onLoadSample && (
              <Button size="sm" variant="secondary" onClick={onLoadSample}>
                샘플 거래내역 불러오기
              </Button>
            )
          }
        />
      ) : (
        <ul className="space-y-2">
          {transactions.map((transaction) => (
            <li
              key={transaction.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2 text-slate-500">
                  <CreditCard size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{transaction.merchantName}</p>
                  <p className="text-xs text-slate-400">{transaction.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="slate">{paymentMethodLabels[transaction.paymentMethod]}</Badge>
                <span className="font-semibold text-slate-900">
                  {transaction.amount.toLocaleString('ko-KR')}원
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="가맹점명"
              className={inputClass}
            />
          </div>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            className={inputClass}
          >
            {Object.entries(paymentMethodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <AmountQuickButtons value={amount} onChange={setAmount} />
          <div className="flex gap-2">
            <Button onClick={handleAdd} disabled={!merchantName.trim() || amount <= 0} className="flex-1">
              거래내역 추가
            </Button>
            <Button variant="secondary" onClick={() => setShowForm(false)}>
              취소
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={() => setShowForm(true)}>
          <span className="inline-flex items-center gap-1">
            <Plus size={14} /> 새 거래내역 직접 추가
          </span>
        </Button>
      )}
    </div>
  );
}
