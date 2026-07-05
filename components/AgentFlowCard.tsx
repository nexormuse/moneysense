// "AI Agent가 이렇게 분석했어요" 카드: 실제 데이터 수치가 들어간 5단계 분석 흐름
'use client';

import { Bot, CheckCircle2 } from 'lucide-react';
import { Card } from './ui';
import type { AgentStep, AnalysisResult } from '@/lib/types';

type AgentFlowCardProps = {
  receiptsCount: number;
  transactionsCount: number;
  matchedCount: number; // 매칭 완료 + 품목 보강 건수
  analysis: AnalysisResult;
};

export default function AgentFlowCard({
  receiptsCount,
  transactionsCount,
  matchedCount,
  analysis,
}: AgentFlowCardProps) {
  // 각 단계 설명에 실제 분석 결과 수치를 넣어 "동작한 흐름"처럼 보여준다
  const steps: AgentStep[] = [
    {
      id: 'read',
      title: '거래내역 읽기',
      description: `카드·계좌 내역 ${transactionsCount}건의 날짜·가맹점·금액을 확인했어요.`,
      status: 'done',
    },
    {
      id: 'enrich',
      title: '영수증 품목 연결',
      description: `영수증 ${receiptsCount}장을 대조해 ${matchedCount}건을 매칭하고, 총액만 남은 소비에 품목을 보강했어요.`,
      status: 'done',
    },
    {
      id: 'temperature',
      title: '생활비 온도 계산',
      description: `가격·구매량·소비처·조정 가능한 소비를 반영해 ${analysis.temperature}℃(${analysis.temperatureLabel})로 계산했어요.`,
      status: 'done',
    },
    {
      id: 'causes',
      title: analysis.spendingDelta < 0 ? '절약 요인분해' : '상승 원인분해',
      description:
        analysis.mainReasons.length > 0
          ? `생활비가 ${analysis.spendingDelta < 0 ? '줄어든' : '오른'} 이유를 ${analysis.mainReasons.length}가지로 정리했어요.`
          : '생활비 변화 요인을 4가지 관점으로 살펴봤어요.',
      status: 'done',
    },
    {
      id: 'plan',
      title: '다음 장보기 플랜 제안',
      description: `절약과 지역상생을 함께 고려한 플랜 ${analysis.actionPlans.length}개를 제안했어요.`,
      status: 'done',
    },
  ];

  return (
    <Card className="!p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-emerald-600 p-1.5 text-white">
          <Bot size={14} />
        </span>
        <span className="text-sm font-semibold text-slate-800">AI Agent가 이렇게 분석했어요</span>
      </div>
      <ol className="relative space-y-0">
        {steps.map((step, index) => (
          <li key={step.id} className="relative flex gap-2.5 pb-3 last:pb-0">
            {/* 단계 연결선 */}
            {index < steps.length - 1 && (
              <span className="absolute left-[7px] top-5 h-full w-px bg-emerald-100" />
            )}
            <CheckCircle2 size={15} className="relative z-10 mt-0.5 shrink-0 text-emerald-500" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-700">
                {index + 1}. {step.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
