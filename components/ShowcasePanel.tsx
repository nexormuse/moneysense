// 데스크톱 오른쪽 패널: 상단은 휴대폰 화면과 연동되는 안내, 하단은 서비스 참고 정보 탭
'use client';

import {
  ArrowRight,
  BookOpen,
  Leaf,
  Link2,
  ListChecks,
  MonitorSmartphone,
  Search,
  Sparkles,
  Thermometer,
  Workflow,
} from 'lucide-react';
import { useState } from 'react';
import type { AppScreen } from './MoneySenseApp';

type ReferenceTab = 'intro' | 'how' | 'temperature' | 'features';

const referenceTabs: { key: ReferenceTab; label: string; icon: React.ReactNode }[] = [
  { key: 'intro', label: '소개', icon: <BookOpen size={13} /> },
  { key: 'how', label: '동작 방식', icon: <Workflow size={13} /> },
  { key: 'temperature', label: '생활비 온도', icon: <Thermometer size={13} /> },
  { key: 'features', label: '주요 기능', icon: <Sparkles size={13} /> },
];

// ---------- 화면별 안내 (왼쪽 휴대폰 화면과 연동) ----------

type ScreenGuide = {
  title: string;
  points: string[];
};

function getScreenGuide(screen: AppScreen): ScreenGuide {
  const { tab, inputTab, hasData } = screen;

  if (tab === 'home' && !hasData) {
    return {
      title: '시작 화면',
      points: [
        '"지출 증가 데모"는 생활비가 오른 주(77℃ 주의), "지출 절약 데모"는 아낀 주(36℃ 안정)를 보여줘요.',
        '"영수증 추가하기"로 내 기록을 직접 쌓기 시작할 수도 있어요.',
        '하단 탭바로 홈 · 입력 · 분석 결과 화면을 오갈 수 있어요.',
      ],
    };
  }
  if (tab === 'home') {
    return {
      title: '홈 — 이번 주 소비 리포트',
      points: [
        '"지난 소비"는 비교 기준(지난주 기록), "이번 소비"는 이번 주 영수증 합계예요.',
        '오른쪽 위 온도 칩과 아래 카드들을 누르면 분석 결과 화면으로 이동해요.',
        '"왜 올랐을까요?"와 "다음 장보기 플랜" 카드는 요약본이에요. "자세히 보기"로 전체 분석을 확인하세요.',
      ],
    };
  }
  if (tab === 'input' && inputTab === 'receipt') {
    return {
      title: '입력 — 영수증 추가',
      points: [
        '샘플 영수증 3종: 품목형(품목까지 인식), 합계형(총액만 — 품목을 직접 추가), 카드매출전표형(매칭·증빙용).',
        '이미지를 업로드하면 mock OCR 안내 후 인식 결과로 쓸 샘플을 고르게 돼요.',
        '저장된 영수증은 연필 아이콘으로 편집, X로 삭제할 수 있어요.',
      ],
    };
  }
  if (tab === 'input' && inputTab === 'manual') {
    return {
      title: '입력 — 직접 입력',
      points: [
        '영수증이 없어도 날짜·상호·총액만으로 기록할 수 있어요.',
        '빠른 금액 버튼은 누를 때마다 누적돼요. +1만원, +5천원을 누르면 15,000원이 돼요.',
        '"지출 저장하기"를 누르면 저장된 내용을 모달로 확인하고, 확인을 누르면 저장된 영수증 화면으로 이동해요.',
      ],
    };
  }
  if (tab === 'input') {
    return {
      title: '입력 — 카드·계좌 거래내역',
      points: [
        '실제 서비스에서는 카드·계좌 연동으로 자동으로 불러와요. 데모에서는 샘플을 사용해요.',
        '"샘플 거래내역 불러오기" 또는 직접 추가로 거래를 채우면 영수증과 자동 매칭돼요.',
      ],
    };
  }
  // result
  return {
    title: '분석 결과 — 4단계 리포트',
    points: [
      '맨 위 요약에서 생활비 온도 · 상태 · 지난주 대비 증감을 한눈에 확인해요.',
      'STEP 1 매칭에서 영수증 카드를 누르면 총액만 남았던 카드내역에 어떤 품목이 보강됐는지 보여요.',
      'STEP 2 "왜 이 온도인가요?"는 기본 온도 + 요인별 가산값의 합이 곧 온도임을 보여줘요.',
      'STEP 3에는 지난 소비와의 항목별 비교가, STEP 4에는 절약+지역상생 플랜과 발표용 요약이 있어요.',
    ],
  };
}

// ---------- 참고 정보 콘텐츠 ----------

// 생활비 온도 구간 (가로 온도계 바의 폭 비율 포함)
const temperatureBands = [
  { range: '0~39℃', label: '안정', color: 'bg-emerald-400', text: 'text-emerald-700', width: 'w-[39%]' },
  { range: '40~69℃', label: '관심', color: 'bg-blue-400', text: 'text-blue-700', width: 'w-[30%]' },
  { range: '70~84℃', label: '주의', color: 'bg-orange-400', text: 'text-orange-700', width: 'w-[16%]' },
  { range: '85℃~', label: '뜨거움', color: 'bg-red-500', text: 'text-red-700', width: 'w-[15%]' },
];

// 온도를 올리는 요인
const temperatureFactors = [
  { name: '가격 상승', max: 20, description: '같은 품목의 단가가 이전 기록보다 오름' },
  { name: '구매량 증가', max: 20, description: '간편식 등 같은 카테고리 구매 횟수 증가' },
  { name: '소비처 변화', max: 15, description: '편의점·프랜차이즈 지출 비중 증가' },
  { name: '조정 가능한 소비', max: 20, description: '간편식·간식·음료가 차지하는 비중' },
  { name: '직접 입력 소비', max: 10, description: '거래내역에 없는 현금성 소비 비중' },
];

const steps = [
  {
    icon: <Link2 size={15} />,
    title: '영수증·거래내역 연결',
    description: '금액·날짜·상호·결제수단을 대조해 총액만 남은 카드내역을 품목 단위로 복원해요.',
  },
  {
    icon: <Thermometer size={15} />,
    title: '생활비 온도 진단',
    description: '이번 주 소비를 이전 기록과 비교해 0~100℃ 온도 하나로 상태를 보여줘요.',
  },
  {
    icon: <Search size={15} />,
    title: '원인 4가지 분해',
    description: '가격 상승 · 구매량 증가 · 소비처 변화 · 조정 가능한 소비로 원인을 짚어줘요.',
  },
  {
    icon: <ListChecks size={15} />,
    title: '다음 장보기 플랜',
    description: '절약 포인트와 동네시장·동네가게로의 지역상생 전환까지 함께 제안해요.',
  },
];

const features = [
  { title: '자동 매칭', description: '금액·날짜·상호·결제수단 점수제로 영수증과 거래를 연결' },
  { title: '품목 직접 추가', description: '총액만 있는 합계형 영수증에 품목을 채워 분석 정확도 향상' },
  { title: '빠른 금액 버튼', description: '+1천원 ~ +10만원 버튼으로 금액을 누적 입력' },
  { title: '수동 매칭 확정', description: '확인이 필요한 매칭은 사용자가 직접 확정·거절' },
  { title: '주간 기준 축적', description: '이번 주 기록을 마감해 다음 주 비교 기준으로 저장' },
  { title: '사후 편집', description: '저장된 영수증을 수정하면 매칭·분석이 자동 재계산' },
  { title: '지역상생 리포트', description: '전통시장·동네가게 소비 비중을 함께 보여줌' },
  { title: '어댑터 구조', description: 'mock OCR·AI를 실제 API로 바로 교체 가능한 설계' },
];

export default function ShowcasePanel({ screen }: { screen: AppScreen }) {
  const [referenceTab, setReferenceTab] = useState<ReferenceTab>('intro');
  const guide = getScreenGuide(screen);

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="shrink-0">
        <p className="text-xs font-bold tracking-widest text-emerald-600">
          AI 생활금융 에이전트
        </p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">머니센스</h1>
          <p className="text-sm font-medium text-slate-500">
            영수증과 거래내역으로 생활비가 오른 이유를 알려드립니다
          </p>
        </div>

        {/* 3단 차별 포인트: 카드내역 확인 → 품목 복원 → 원인분해 */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            {
              step: 1,
              title: '카드내역 확인',
              description: '어디서 얼마 썼는지만 남은 금융 데이터를 확인해요',
            },
            {
              step: 2,
              title: '영수증 품목 복원',
              description: '총액만 보이던 소비에 실제 구매 품목을 연결해요',
            },
            {
              step: 3,
              title: '생활비 원인분해',
              description: '왜 올랐는지 설명하고 다음 장보기 플랜을 제안해요',
            },
          ].map((point) => (
            <div
              key={point.step}
              className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm"
            >
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
                  {point.step}
                </span>
                {point.title}
              </p>
              <p className="mt-1 text-[11px] leading-snug text-slate-500">
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 현재 화면 안내: 왼쪽 휴대폰 화면을 따라 자동으로 바뀐다 */}
      <section className="mt-4 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-lg shadow-emerald-600/25">
        <div className="flex items-baseline justify-between gap-2">
          <p className="flex items-center gap-2 text-[11px] font-bold tracking-widest text-emerald-100">
            <MonitorSmartphone size={14} /> 지금 보고 있는 화면
          </p>
          <h2 className="text-base font-bold">{guide.title}</h2>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {guide.points.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-[13px] leading-snug text-emerald-50/95"
            >
              <ArrowRight size={13} className="mt-0.5 shrink-0 text-emerald-200" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      {/* 서비스 참고 정보: 탭으로 구분 */}
      <section className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900">서비스 참고</h2>
          <span className="h-px flex-1 bg-slate-200" />
          <div className="flex gap-1.5">
            {referenceTabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setReferenceTab(item.key)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  referenceTab === item.key
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          {/* 소개 */}
          {referenceTab === 'intro' && (
            <div className="space-y-3">
              <p className="text-[13px] leading-snug text-slate-600">
                카드·계좌 내역에는{' '}
                <b className="text-slate-900">&ldquo;iM마트 41,000원&rdquo;</b>처럼 총액만
                남습니다. 머니센스는 영수증으로 품목 단위 소비를 복원하고, 생활비 상승의 원인을
                분해한 뒤 다음 장보기 플랜까지 제안합니다.
              </p>
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-[11px] font-bold text-slate-400">
                    카드·계좌 거래내역
                  </p>
                  <p className="text-sm font-bold text-slate-700">iM마트 41,000원</p>
                  <p className="mt-0.5 text-xs text-slate-400">총액만 남아요</p>
                </div>
                <div className="flex items-center justify-center text-emerald-500">
                  <ArrowRight size={18} />
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <p className="mb-1 text-[11px] font-bold text-emerald-600">+ 영수증 연결</p>
                  <p className="text-sm font-bold text-slate-700">우유 3,200 · 계란 7,800 …</p>
                  <p className="mt-0.5 text-xs text-emerald-700">품목 단위로 복원돼요</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: '0~100℃', label: '생활비 온도 진단' },
                  { value: '4가지', label: '상승 원인 분해' },
                  { value: '절약+상생', label: '다음 장보기 플랜' },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    className="rounded-xl bg-gradient-to-b from-emerald-50 to-white p-2.5 text-center ring-1 ring-emerald-100"
                  >
                    <p className="text-base font-bold text-emerald-700">{chip.value}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-500">{chip.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 동작 방식 */}
          {referenceTab === 'how' && (
            <div className="grid grid-cols-2 gap-2">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/80 to-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                      {step.icon}
                    </span>
                    <span className="text-[11px] font-bold tracking-wide text-emerald-600">
                      STEP {index + 1}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-800">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* 생활비 온도 */}
          {referenceTab === 'temperature' && (
            <div className="space-y-3">
              {/* 가로 온도계 */}
              <div>
                <div className="flex h-3 overflow-hidden rounded-full">
                  {temperatureBands.map((band) => (
                    <div key={band.label} className={`${band.width} ${band.color}`} />
                  ))}
                </div>
                <div className="mt-2 flex">
                  {temperatureBands.map((band) => (
                    <div key={band.label} className={`${band.width} text-center`}>
                      <p className={`text-xs font-bold ${band.text}`}>{band.label}</p>
                      <p className="text-[10px] text-slate-400">{band.range}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 온도를 올리는 요인 */}
              <div className="grid grid-cols-2 gap-2">
                {temperatureFactors.map((factor) => (
                  <div
                    key={factor.name}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700">{factor.name}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                        {factor.description}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-600">
                      +{factor.max}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-center rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-2.5">
                  <p className="text-center text-[11px] font-medium leading-snug text-emerald-700">
                    기본 <b className="text-sm">35℃</b>에서 시작 —<br />
                    높을수록 생활비를 돌아볼 신호예요
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 주요 기능 */}
          {referenceTab === 'features' && (
            <div className="grid grid-cols-2 gap-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5"
                >
                  <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <Leaf size={12} className="shrink-0 text-emerald-500" />
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-500">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
