// 다음 장보기 플랜 + 지역상생 소비 카드
'use client';

import { Leaf, ListChecks, PiggyBank } from 'lucide-react';
import { Badge, Card } from './ui';
import type { AnalysisResult } from '@/lib/types';

type ActionPlanPanelProps = {
  analysis: AnalysisResult;
};

export function LocalSpendingCard({ ratio }: { ratio: number }) {
  const percent = Math.round(ratio * 100);
  return (
    <Card className="!p-4 bg-gradient-to-br from-emerald-50 to-white">
      <div className="flex items-center gap-2 mb-2">
        <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-700">
          <Leaf size={16} />
        </span>
        <span className="text-sm font-semibold text-slate-800">지역상생 소비 비중</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="text-3xl font-bold text-emerald-700">{percent}%</span>
        <span className="text-xs text-slate-500 mb-1">전통시장·동네가게 지출 기준</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-emerald-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs text-slate-500 leading-relaxed">
        동네시장·동네가게에서의 장보기를 유지하면 생활비 관리와 지역상생을 함께 챙길 수 있어요.
      </p>
    </Card>
  );
}

export default function ActionPlanPanel({ analysis }: ActionPlanPanelProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <Card className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
            <ListChecks size={16} />
          </span>
          <h3 className="text-base font-semibold text-slate-900">다음 장보기 플랜</h3>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          이번 주 소비 패턴을 바탕으로 제안해요. 사용자 선택에 따라 조정할 수 있습니다.
        </p>
        <ol className="space-y-2.5">
          {analysis.actionPlans.map((plan, index) => (
            <li
              key={plan.text}
              className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3.5"
            >
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-700 leading-relaxed">{plan.text}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {plan.savingHint && (
                    <Badge tone="amber">
                      <PiggyBank size={11} /> {plan.savingHint}
                    </Badge>
                  )}
                  {plan.isLocal && (
                    <Badge tone="green">
                      <Leaf size={11} /> 지역상생 전환 제안
                    </Badge>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-slate-400">
          * 예상 절약 금액은 참고용 추정치이며, 실제 가격을 보장하지 않아요.
        </p>
      </Card>

      <LocalSpendingCard ratio={analysis.localSpendingRatio} />
    </div>
  );
}
