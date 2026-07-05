// 생활비 온도 카드: 온도 숫자 + 상태 라벨 + 온도계 UI + 주요 원인
'use client';

import { Thermometer } from 'lucide-react';
import { Badge, Card } from './ui';
import type { AnalysisResult } from '@/lib/types';

type TemperatureCardProps = {
  analysis: AnalysisResult;
};

const labelTone: Record<AnalysisResult['temperatureLabel'], 'green' | 'blue' | 'orange' | 'red'> = {
  안정: 'green',
  관심: 'blue',
  주의: 'orange',
  뜨거움: 'red',
};

const labelColor: Record<AnalysisResult['temperatureLabel'], string> = {
  안정: 'text-emerald-600',
  관심: 'text-blue-600',
  주의: 'text-orange-500',
  뜨거움: 'text-red-500',
};

const barColor: Record<AnalysisResult['temperatureLabel'], string> = {
  안정: 'bg-emerald-400',
  관심: 'bg-blue-400',
  주의: 'bg-orange-400',
  뜨거움: 'bg-red-500',
};

export default function TemperatureCard({ analysis }: TemperatureCardProps) {
  const { temperature, temperatureLabel, mainReasons } = analysis;

  return (
    <Card>
      <div className="flex gap-5">
        {/* 온도계 UI */}
        <div className="flex flex-col items-center shrink-0">
          <div className="relative h-40 w-5 rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
            <div
              className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-700 ${barColor[temperatureLabel]}`}
              style={{ height: `${temperature}%` }}
            />
          </div>
          <div className={`mt-2 ${labelColor[temperatureLabel]}`}>
            <Thermometer size={18} />
          </div>
        </div>

        {/* 온도 숫자 + 원인 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-500">이번 주 생활비 온도</p>
          <div className="flex items-end gap-2 mt-1">
            <span className={`text-5xl font-bold tracking-tight ${labelColor[temperatureLabel]}`}>
              {temperature}
              <span className="text-2xl align-top">℃</span>
            </span>
            <Badge tone={labelTone[temperatureLabel]} className="mb-2">
              {temperatureLabel}
            </Badge>
          </div>

          {mainReasons.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-slate-400 mb-1.5">
                {analysis.spendingDelta < 0 ? '주요 절약 요인' : '주요 원인'}
              </p>
              <ol className="space-y-1">
                {mainReasons.map((reason, index) => (
                  <li key={reason} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                      {index + 1}
                    </span>
                    {reason}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </div>

      {/* 온도 구간 안내 */}
      <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-400">
        <span className="text-emerald-500">0~39 안정</span>·
        <span className="text-blue-500">40~69 관심</span>·
        <span className="text-orange-500">70~84 주의</span>·
        <span className="text-red-500">85+ 뜨거움</span>
      </div>
    </Card>
  );
}
