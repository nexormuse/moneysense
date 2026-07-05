// "왜 이 온도인가요?" 카드: 기본 온도 + 요인별 가산값의 합이 곧 생활비 온도임을 보여준다
'use client';

import { Equal, HelpCircle } from 'lucide-react';
import { Badge, Card } from './ui';
import type { AnalysisResult, TemperatureFactorItem } from '@/lib/types';

type TemperatureBreakdownProps = {
  breakdown: TemperatureFactorItem[];
  temperature: number;
  temperatureLabel: AnalysisResult['temperatureLabel'];
};

const labelTone: Record<AnalysisResult['temperatureLabel'], 'green' | 'blue' | 'orange' | 'red'> = {
  안정: 'green',
  관심: 'blue',
  주의: 'orange',
  뜨거움: 'red',
};

export default function TemperatureBreakdown({
  breakdown,
  temperature,
  temperatureLabel,
}: TemperatureBreakdownProps) {
  const factorRows = breakdown.filter((row) => row.id !== 'base');
  const baseRow = breakdown.find((row) => row.id === 'base');
  // 막대 길이 기준: 가장 큰 가산 요인
  const maxDelta = Math.max(...factorRows.map((row) => row.delta), 1);

  return (
    <Card
      title="왜 이 온도인가요?"
      subtitle="생활비 온도는 기본 온도에 요인별 가산값을 더해 계산돼요."
    >
      <div className="space-y-2.5">
        {/* 기본 온도 */}
        {baseRow && (
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <HelpCircle size={13} className="text-slate-400" />
              <span className="text-sm text-slate-600">{baseRow.label}</span>
            </div>
            <span className="text-sm font-bold text-slate-700">{baseRow.delta}℃</span>
          </div>
        )}

        {/* 가산 요인: 라벨 + 기여도 막대 + 가산값 */}
        {factorRows.map((row) => (
          <div key={row.id} className="rounded-xl border border-slate-100 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-sm text-slate-700">{row.label}</span>
              <span className="shrink-0 text-sm font-bold text-orange-500">+{row.delta}℃</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-orange-300"
                style={{ width: `${Math.round((row.delta / maxDelta) * 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{row.description}</p>
          </div>
        ))}

        {/* 합계 = 생활비 온도 */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-3.5 py-3 text-white">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Equal size={14} /> 생활비 온도
          </span>
          <span className="flex items-center gap-2">
            <span className="text-lg font-bold">{temperature}℃</span>
            <Badge tone={labelTone[temperatureLabel]}>{temperatureLabel}</Badge>
          </span>
        </div>
      </div>
    </Card>
  );
}
