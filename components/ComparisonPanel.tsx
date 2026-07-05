// "지난 소비와 비교해봤어요" 패널: 항목별 지난 기록 vs 이번 주 변화를 보여준다
'use client';

import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { Card } from './ui';
import type { ComparisonInsight } from '@/lib/types';

type ComparisonPanelProps = {
  comparisons: ComparisonInsight[];
};

export default function ComparisonPanel({ comparisons }: ComparisonPanelProps) {
  if (comparisons.length === 0) return null;

  return (
    <Card
      title="지난 소비와 비교해봤어요"
      subtitle="숫자의 변화가 생활비 온도의 원인으로 이어져요."
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {comparisons.map((insight) => {
          const isUp = insight.changeDirection === 'up';
          return (
            <div
              key={insight.id}
              className="rounded-xl border border-slate-100 bg-slate-50/60 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">{insight.label}</span>
                {/* 증가는 주황, 감소는 파랑: 차분하지만 방향이 분명하게 */}
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    isUp ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {insight.changeLabel}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                <span className="text-slate-400">{insight.previousLabel}</span>
                <ArrowRight size={12} className="shrink-0 text-slate-300" />
                <span className="font-bold text-slate-800">{insight.currentLabel}</span>
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">
                {insight.description}
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
