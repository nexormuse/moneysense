// 주간 비교 기준 카드: 이번 주 기록을 다음 분석의 비교 기준으로 저장/마감
'use client';

import { CalendarCheck, FlaskConical, RefreshCw } from 'lucide-react';
import { Badge, Button, Card } from './ui';
import type { UserBaseline } from '@/lib/types';

type BaselineCardProps = {
  baseline: UserBaseline | null;
  onSaveBaseline: () => void;
  onCloseWeek: () => void;
  onResetBaseline: () => void;
};

export default function BaselineCard({
  baseline,
  onSaveBaseline,
  onCloseWeek,
  onResetBaseline,
}: BaselineCardProps) {
  return (
    <Card className="!p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-blue-50 p-1.5 text-blue-600">
              {baseline ? <CalendarCheck size={15} /> : <FlaskConical size={15} />}
            </span>
            <span className="text-sm font-semibold text-slate-800">비교 기준</span>
            {baseline ? (
              <Badge tone="blue">내 기록 ({baseline.savedAt} 저장)</Badge>
            ) : (
              <Badge tone="slate">샘플 이전 기록 (데모용)</Badge>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
            {baseline
              ? '가격 상승·구매량 비교는 내가 저장한 지난 기록을 기준으로 계산돼요.'
              : '이번 주 기록을 저장해두면 다음 주부터는 샘플이 아닌 내 기록과 비교해요.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="secondary" onClick={onSaveBaseline}>
            이번 주 기록을 비교 기준으로 저장
          </Button>
          <Button size="sm" variant="secondary" onClick={onCloseWeek}>
            <span className="inline-flex items-center gap-1">
              <RefreshCw size={12} /> 마감하고 새 주 시작
            </span>
          </Button>
          {baseline && (
            <Button size="sm" variant="ghost" onClick={onResetBaseline}>
              샘플 기준으로 되돌리기
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
