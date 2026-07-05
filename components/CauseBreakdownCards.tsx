// 원인분해 4개 카드: 가격 상승 / 구매량 증가 / 소비처 변화 / 조정 가능한 소비
'use client';

import { ArrowUpRight, Repeat, ShoppingCart, Store } from 'lucide-react';
import { Card } from './ui';
import type { CauseDetail } from '@/lib/types';

type CauseBreakdownCardsProps = {
  causeDetails: CauseDetail[];
  saving?: boolean; // 지난주보다 지출이 줄어든 주인지
};

const icons: Record<CauseDetail['key'], React.ReactNode> = {
  priceIncrease: <ArrowUpRight size={16} />,
  quantityIncrease: <Repeat size={16} />,
  storeShift: <Store size={16} />,
  adjustableSpending: <ShoppingCart size={16} />,
};

const maxPoints: Record<CauseDetail['key'], number> = {
  priceIncrease: 20,
  quantityIncrease: 20,
  storeShift: 15,
  adjustableSpending: 20,
};

export default function CauseBreakdownCards({ causeDetails, saving }: CauseBreakdownCardsProps) {
  return (
    <div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {saving ? '생활비 절약 분석' : '생활비 원인분해'}
      </h3>
      <p className="text-sm text-slate-500 mb-3">
        {saving
          ? '지난주보다 지출이 줄어든 이유를 4가지 관점으로 살펴봤어요.'
          : '생활비 온도를 올린 요인을 4가지로 나눠 살펴봤어요.'}
      </p>
      <div className="grid grid-cols-1 gap-3">
        {causeDetails.map((cause) => {
          const ratio = Math.min(1, cause.points / maxPoints[cause.key]);
          return (
            <Card key={cause.key} className="!p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600">
                    {icons[cause.key]}
                  </span>
                  <span className="text-sm font-semibold text-slate-800">{cause.title}</span>
                </div>
                <span className="text-sm font-bold text-slate-700">+{cause.points}℃</span>
              </div>

              {/* 기여도 바 */}
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-2.5">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                  style={{ width: `${ratio * 100}%` }}
                />
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{cause.description}</p>
              {cause.details.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {cause.details.map((detail) => (
                    <li
                      key={detail}
                      className="text-xs text-slate-700 bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5"
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
