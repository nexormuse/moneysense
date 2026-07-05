// 품목 입력 리스트: 품목명 + 금액(빠른 금액 버튼 재사용) + 자동 분류 미리보기
'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import AmountQuickButtons from './AmountQuickButtons';
import { Badge, Button } from './ui';
import { categoryLabels, classifyItem } from '@/lib/services/mockAi';
import type { ExpenseItem } from '@/lib/types';

type ItemInputListProps = {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
};

let itemSeq = 0;
const nextItemId = () => `item-${Date.now()}-${itemSeq++}`;

export default function ItemInputList({ items, onChange }: ItemInputListProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);

  const addItem = () => {
    if (!name.trim() || amount <= 0) return;
    const newItem: ExpenseItem = {
      id: nextItemId(),
      name: name.trim(),
      amount,
      category: classifyItem(name),
      source: 'USER_INPUT',
    };
    onChange([...items, newItem]);
    setName('');
    setAmount(0);
  };

  return (
    <div className="space-y-3">
      {/* 추가된 품목 목록 */}
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                <Badge tone="slate">{categoryLabels[item.category]}</Badge>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-semibold text-slate-700">
                  {item.amount.toLocaleString('ko-KR')}원
                </span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((other) => other.id !== item.id))}
                  className="text-slate-400 hover:text-red-500"
                  aria-label={`${item.name} 삭제`}
                >
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 새 품목 입력 */}
      <div className="rounded-xl border border-dashed border-slate-300 p-3 space-y-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="품목명 (예: 우유, 채소)"
          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <AmountQuickButtons value={amount} onChange={setAmount} compact />
        {name.trim() && (
          <p className="text-xs text-slate-500">
            자동 분류: <Badge tone="blue">{categoryLabels[classifyItem(name)]}</Badge>
          </p>
        )}
        <Button size="sm" variant="secondary" onClick={addItem} disabled={!name.trim() || amount <= 0}>
          <span className="inline-flex items-center gap-1">
            <Plus size={12} /> 품목 추가
          </span>
        </Button>
      </div>
    </div>
  );
}
