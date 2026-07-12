// 품목 입력 리스트: 품목명 + 금액(빠른 금액 버튼 재사용) + 자동 분류 미리보기 + 용량(선택)
'use client';

import { Plus, Ruler, X } from 'lucide-react';
import { useState } from 'react';
import AmountQuickButtons from './AmountQuickButtons';
import { Badge, Button } from './ui';
import { categoryLabels, classifyItem, classifyItemWithLLM, parseVolumeFromName } from '@/lib/services/ai';
import type { ExpenseItem, VolumeUnit } from '@/lib/types';

type ItemInputListProps = {
  items: ExpenseItem[];
  onChange: (items: ExpenseItem[]) => void;
};

let itemSeq = 0;
const nextItemId = () => `item-${Date.now()}-${itemSeq++}`;

const VOLUME_UNITS: VolumeUnit[] = ['g', 'ml', '개'];

// 용량 미입력 품목에 붙는 인라인 보완 폼 (최초 1회 입력하면 단위가격 감지 대상이 된다)
function VolumeEditor({
  onConfirm,
  onCancel,
}: {
  onConfirm: (volume: number, unit: VolumeUnit) => void;
  onCancel: () => void;
}) {
  const [volume, setVolume] = useState('');
  const [unit, setUnit] = useState<VolumeUnit>('g');
  const parsed = parseInt(volume, 10);

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <input
        type="number"
        inputMode="numeric"
        min={1}
        value={volume}
        onChange={(event) => setVolume(event.target.value)}
        placeholder="용량"
        className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />
      <select
        value={unit}
        onChange={(event) => setUnit(event.target.value as VolumeUnit)}
        className="rounded-lg border border-slate-300 px-1.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {VOLUME_UNITS.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => Number.isFinite(parsed) && parsed > 0 && onConfirm(parsed, unit)}
        disabled={!Number.isFinite(parsed) || parsed <= 0}
        className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
      >
        저장
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-1.5 py-1 text-xs text-slate-400 hover:text-slate-600"
      >
        취소
      </button>
    </div>
  );
}

export default function ItemInputList({ items, onChange }: ItemInputListProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState(0);
  const [classifying, setClassifying] = useState(false);
  // 용량 보완 폼이 열려 있는 품목 id
  const [volumeEditingId, setVolumeEditingId] = useState<string | null>(null);

  const addItem = async () => {
    if (!name.trim() || amount <= 0 || classifying) return;
    setClassifying(true);
    // LLM 분류 시도 → 키 없음·오류·타임아웃이면 룰 기반 폴백 (분석 흐름은 항상 이어진다)
    const { category, classifiedBy } = await classifyItemWithLLM(name.trim());
    // 품명에 용량 표기가 있으면 자동 파싱 (예: "우유 900ml") — 없으면 목록에서 나중에 보완 가능
    const volumeInfo = parseVolumeFromName(name);
    const newItem: ExpenseItem = {
      id: nextItemId(),
      name: name.trim(),
      amount,
      category,
      source: 'USER_INPUT',
      classifiedBy,
      ...(volumeInfo ? { ...volumeInfo, volumeSource: 'parsed' as const } : {}),
    };
    onChange([...items, newItem]);
    setName('');
    setAmount(0);
    setClassifying(false);
  };

  // 용량 보완: 해당 품목만 갱신 (사용자 직접 입력이므로 volumeSource: 'user')
  const setItemVolume = (id: string, volume: number, volumeUnit: VolumeUnit) => {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, volume, volumeUnit, volumeSource: 'user' as const } : item,
      ),
    );
    setVolumeEditingId(null);
  };

  return (
    <div className="space-y-3">
      {/* 추가된 품목 목록 */}
      {items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-slate-800 truncate">{item.name}</span>
                  <Badge tone="slate">{categoryLabels[item.category]}</Badge>
                  {/* 분류 출처 배지: "숫자는 코드가, 언어는 LLM이" 하이브리드 구조의 시각적 증거 */}
                  {item.classifiedBy === 'llm' && <Badge tone="blue">AI 분류</Badge>}
                  {item.classifiedBy === 'rule' && <Badge tone="slate">룰 기반</Badge>}
                  {item.volume && item.volumeUnit && (
                    <Badge tone="green">
                      {item.volume.toLocaleString('ko-KR')}
                      {item.volumeUnit}
                    </Badge>
                  )}
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
              </div>
              {/* 용량이 없는 품목: 선택 입력으로 보완하면 단위가격(슈링크플레이션) 감지 대상이 된다 */}
              {!item.volume &&
                (volumeEditingId === item.id ? (
                  <VolumeEditor
                    onConfirm={(volume, unit) => setItemVolume(item.id, volume, unit)}
                    onCancel={() => setVolumeEditingId(null)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setVolumeEditingId(item.id)}
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600"
                  >
                    <Ruler size={11} /> 용량 입력 (선택) — 단위가격 변화까지 감지해요
                  </button>
                ))}
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
          placeholder="품목명 (예: 우유 900ml, 채소)"
          className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
        <AmountQuickButtons value={amount} onChange={setAmount} compact />
        {name.trim() && (
          <p className="text-xs text-slate-500">
            자동 분류: <Badge tone="blue">{categoryLabels[classifyItem(name)]}</Badge>
            {parseVolumeFromName(name) && (
              <span className="ml-1">
                · 용량{' '}
                <Badge tone="green">
                  {parseVolumeFromName(name)!.volume.toLocaleString('ko-KR')}
                  {parseVolumeFromName(name)!.volumeUnit}
                </Badge>
              </span>
            )}
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
