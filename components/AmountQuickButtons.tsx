// 재사용 가능한 금액 입력 컴포넌트: 직접 입력 + 빠른 금액 버튼 누적 + 초기화
'use client';

import { RotateCcw } from 'lucide-react';

type AmountQuickButtonsProps = {
  value: number;
  onChange: (value: number) => void;
  steps?: number[];
  showReset?: boolean;
  compact?: boolean; // 품목 입력 등 좁은 곳에서 쓰는 축소 버전
};

const formatStep = (step: number) =>
  step >= 10000 ? `+${step / 10000}만원` : `+${step / 1000}천원`;

export default function AmountQuickButtons({
  value,
  onChange,
  steps = [1000, 5000, 10000, 50000, 100000],
  showReset = true,
  compact = false,
}: AmountQuickButtonsProps) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          inputMode="numeric"
          value={value === 0 ? '' : value.toLocaleString('ko-KR')}
          placeholder="0"
          onChange={(event) => {
            // 숫자 이외 문자를 제거하고 반영한다
            const digits = event.target.value.replace(/[^0-9]/g, '');
            onChange(digits === '' ? 0 : Math.min(Number(digits), 99999999));
          }}
          className={`w-full border border-slate-300 rounded-xl bg-white text-right font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            compact ? 'px-3 py-1.5 text-sm pr-8' : 'px-4 py-2.5 text-lg pr-10'
          }`}
        />
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'text-xs' : 'text-sm'}`}
        >
          원
        </span>
      </div>
      {/* 빠른 금액 버튼: 누를 때마다 현재 금액에 누적 */}
      {!compact && <p className="text-[11px] font-medium text-slate-400">빠른 금액 입력</p>}
      <div className="flex flex-wrap gap-1.5">
        {steps.map((step) => (
          <button
            key={step}
            type="button"
            onClick={() => onChange(value + step)}
            className={`rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 font-medium hover:bg-emerald-100 transition-colors ${
              compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
            }`}
          >
            {formatStep(step)}
          </button>
        ))}
        {showReset && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className={`inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white text-slate-500 font-medium hover:bg-slate-50 transition-colors ${
              compact ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs'
            }`}
          >
            <RotateCcw size={compact ? 10 : 12} />
            초기화
          </button>
        )}
      </div>
    </div>
  );
}
