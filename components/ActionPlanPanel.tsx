// 다음 장보기 플랜 + 지역상생 소비 카드 + iM 적금 전환 CTA
'use client';

import { Landmark, Leaf, ListChecks, PiggyBank, X } from 'lucide-react';
import { useState } from 'react';
import { Badge, Button, Card } from './ui';
import type { AnalysisResult } from '@/lib/types';

type ActionPlanPanelProps = {
  analysis: AnalysisResult;
};

/** savingHint 문구("약 8,000원 절약 예상")에서 금액 텍스트를 뽑는다 */
function extractSavingAmount(analysis: AnalysisResult): string | null {
  for (const plan of analysis.actionPlans) {
    const matched = plan.savingHint?.match(/([\d,]+)원/);
    if (matched) return matched[1];
  }
  return null;
}

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
  const [showSavingModal, setShowSavingModal] = useState(false);
  const savingAmount = extractSavingAmount(analysis);

  return (
    <div className="grid grid-cols-1 gap-3">
      <Card>
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
          * 예상 절약 금액은 입력된 기록으로 계산한 참고용 추정치예요.
        </p>

        {/* 절약액 → iM 적금 전환 CTA (mock): 조언이 저축으로 이어지는 흐름을 화면으로 보여준다 */}
        {savingAmount && (
          <button
            type="button"
            onClick={() => setShowSavingModal(true)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 active:scale-[0.98]"
          >
            <Landmark size={16} />
            {savingAmount}원 아껴서 iM 적금하기
          </button>
        )}
      </Card>

      <LocalSpendingCard ratio={analysis.localSpendingRatio} />

      {/* 적금 연결 안내 모달 (mock) */}
      {showSavingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="w-full rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-sky-50 p-2 text-sky-600">
                <Landmark size={20} />
              </span>
              <button
                type="button"
                onClick={() => setShowSavingModal(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-base font-bold text-slate-900">머니센스 챌린지 적금</p>
            <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
              실제 서비스에서는 이 버튼이 iM뱅크 적금 계좌로 연결돼요. 플랜이 계산한 예상
              절약액 {savingAmount}원을 그대로 자동이체해, 절약이 조언에서 끝나지 않고
              저축으로 이어집니다.
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              * 현재 MVP에서는 흐름을 보여주는 데모 화면이에요.
            </p>
            <Button size="lg" className="mt-4 w-full" onClick={() => setShowSavingModal(false)}>
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
