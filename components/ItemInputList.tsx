// 품목 입력 리스트: 품목명 + 금액(빠른 금액 버튼 재사용) + 자동 분류 미리보기
'use client';

import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import AmountQuickButtons from './AmountQuickButtons';
import { Badge, Button } from './ui';
import { categoryLabels, classifyItem, classifyItemWithLLM } from '@/lib/services/mockAi';
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
  const [classifying, setClassifying] = useState(false);

  const addItem = async () => {
    if (!name.trim() || amount <= 0 || classifying) return;
    setClassifying(true);
    // LLM 분류 시도 → 키 없음·오류·타임아웃이면 룰 기반 폴백 (분석 흐름은 항상 이어진다)
    const { category, classifiedBy } = await classifyItemWithLLM(name.trim());
    const newItem: ExpenseItem = {
      id: nextItemId(),
      name: name.trim(),
      amount,
      category,
      source: 'USER_INPUT',
      classifiedBy,
    };
    onChange([...items, newItem]);
    setName('');
    setAmount(0);
    setClassifying(false);
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
                {/* 분류 출처 배지: "숫자는 코드가, 언어는 LLM이" 하이브리드 구조의 시각적 증거 */}
                {item.classifiedBy === 'llm' && <Badge tone="blue">AI 분류</Badge>}
                {item.classifiedBy === 'rule' && <Badge tone="slate">룰 기반</Badge>}
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
            <span className="ml-1 text-slate-400">— 추가 시 AI 분류를 시도해요</span>
          </p>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={addItem}
          disabled={!name.trim() || amount <= 0 || classifying}
        >
          <span className="inline-flex items-center gap-1">
            <Plus size={12} /> {classifying ? '분류 중…' : '품목 추가'}
          </span>
        </Button>
      </div>
    </div>
  );
}
