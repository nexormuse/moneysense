// 발표용 요약 카드: "총액 → 품목 복원 → 원인 → 다음 행동" 흐름을 3~4문장으로 정리
'use client';

import { Quote } from 'lucide-react';

type PresentationSummaryCardProps = {
  summary: string;
};

export default function PresentationSummaryCard({ summary }: PresentationSummaryCardProps) {
  if (!summary) return null;

  return (
    <section className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white p-4">
      <p className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
        <Quote size={13} />
        머니센스가 찾은 이번 주 생활비 변화
      </p>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{summary}</p>
      <p className="mt-2 text-[11px] text-slate-400">샘플 데이터 기준의 참고 정보예요.</p>
    </section>
  );
}
