// 단위가격 파수꾼: 슈링크플레이션(표시 가격 동결·용량 감소 = 실질 인상) 고지 카드
// v0은 고지 기능만 — 생활비 온도 계산에는 반영하지 않는다.
// 원칙: 용량 정보가 있는 품목만 비교하고, 감지 분모(대상 품목 수)를 정직하게 노출한다.
'use client';

import { ScanSearch } from 'lucide-react';
import { Badge, Card } from './ui';
import type { ShrinkflationAlert, VolumeUnit } from '@/lib/types';

type ShrinkflationCardProps = {
  alerts: ShrinkflationAlert[];
  trackedCount: number; // 용량 정보가 있어 감지 대상이 된 품목 수 (분모)
};

// 단위가격은 1원 미만 단위가 흔해 소수 1자리까지 표시한다 (예: g당 22.2원)
const formatUnitPrice = (value: number) =>
  value >= 100 ? Math.round(value).toLocaleString('ko-KR') : String(Math.round(value * 10) / 10);

const unitLabel: Record<VolumeUnit, string> = { g: 'g당', ml: 'ml당', 개: '개당' };

export default function ShrinkflationCard({ alerts, trackedCount }: ShrinkflationCardProps) {
  return (
    <Card className="!p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-violet-50 p-1.5 text-violet-600">
            <ScanSearch size={16} />
          </span>
          <span className="text-sm font-semibold text-slate-800">단위가격 파수꾼</span>
        </div>
        <Badge tone="slate">고지 전용 · 온도 미반영</Badge>
      </div>

      {alerts.length > 0 ? (
        <>
          <p className="text-xs text-slate-500 leading-relaxed">
            가격은 그대로인데 용량이 줄었어요. 표시 가격 대신 단위가격으로 본 실질 인상이에요.
          </p>
          <ul className="mt-2 space-y-1">
            {alerts.map((alert) => (
              <li
                key={alert.itemName}
                className="rounded-lg border border-violet-100 bg-violet-50/60 px-2.5 py-1.5 text-xs text-slate-700"
              >
                <b>{alert.itemName}</b>: {alert.prevVolume.toLocaleString('ko-KR')}
                {alert.volumeUnit} → {alert.currVolume.toLocaleString('ko-KR')}
                {alert.volumeUnit} · {unitLabel[alert.volumeUnit]}{' '}
                {formatUnitPrice(alert.prevUnitPrice)}원 → {formatUnitPrice(alert.currUnitPrice)}원{' '}
                <b className="text-violet-700">(+{alert.ratePercent}%)</b>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-slate-500 leading-relaxed">
          {trackedCount > 0
            ? `이번 주 감지된 실질 인상 없음 · 용량 정보가 있는 품목 ${trackedCount}개 기준`
            : '용량 정보가 있는 품목이 아직 없어요. 품목에 용량을 입력하면 단위가격 변화까지 감지해요.'}
        </p>
      )}
      <p className="mt-2 text-[11px] text-slate-400">
        동일 품목의 단위가격이 이전 기록보다 5% 이상 오르고 표시 가격은 같거나 내린 경우만
        알려드려요. 용량 정보가 없는 품목은 감지 대상에서 제외돼요.
      </p>
    </Card>
  );
}
