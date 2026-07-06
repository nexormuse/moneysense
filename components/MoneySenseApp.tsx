// 머니센스 메인 앱: 탭 네비게이션 + 전역 상태 + localStorage 저장
'use client';

import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Flame,
  Home,
  ListChecks,
  PenLine,
  PiggyBank,
  Receipt as ReceiptIcon,
  Sparkles,
  Thermometer,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ActionPlanPanel from './ActionPlanPanel';
import AgentFlowCard from './AgentFlowCard';
import BaselineCard from './BaselineCard';
import CauseBreakdownCards from './CauseBreakdownCards';
import ComparisonPanel from './ComparisonPanel';
import ManualExpenseForm from './ManualExpenseForm';
import MatchResultPanel from './MatchResultPanel';
import PresentationSummaryCard from './PresentationSummaryCard';
import ReceiptCard from './ReceiptCard';
import ReceiptInputPanel from './ReceiptInputPanel';
import TemperatureBreakdown from './TemperatureBreakdown';
import TemperatureCard from './TemperatureCard';
import TransactionPanel from './TransactionPanel';
import { Badge, Button, Card, EmptyState } from './ui';
import {
  previousData,
  previousDataSaving,
  sampleReceipts,
  sampleReceiptsSaving,
  sampleTransactions,
  sampleTransactionsSaving,
} from '@/lib/mockData';
import { analyzeAll, buildBaseline } from '@/lib/services/ai';
import type { AppState, MatchOverride, Receipt, Transaction, UserBaseline } from '@/lib/types';

// v2: 상호명 개편(iM마트 등) 이전에 저장된 옛 데이터를 무시하기 위해 키를 올림
const STORAGE_KEY = 'moneysense-state-v2';

export type Tab = 'home' | 'input' | 'result';
export type InputTab = 'receipt' | 'manual' | 'transactions';

// 현재 휴대폰 화면 정보 (오른쪽 설명 패널이 화면에 맞는 안내를 보여주는 데 사용)
export type AppScreen = {
  tab: Tab;
  inputTab: InputTab;
  hasData: boolean;
};

type MoneySenseAppProps = {
  onScreenChange?: (screen: AppScreen) => void;
};

let idSeq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idSeq++}`;

// 분석 결과 페이지의 단계 라벨 (데모 스토리를 따라가기 쉽게)
function StepLabel({ step, text }: { step: number; text: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-emerald-600">
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-[10px] text-white">
        {step}
      </span>
      STEP {step} · {text}
    </p>
  );
}

export default function MoneySenseApp({ onScreenChange }: MoneySenseAppProps) {
  const [tab, setTab] = useState<Tab>('home');
  const [inputTab, setInputTab] = useState<InputTab>('receipt');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matchOverrides, setMatchOverrides] = useState<MatchOverride[]>([]);
  const [baseline, setBaseline] = useState<UserBaseline | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState('');
  // 직접 입력 저장 완료 모달에 보여줄 영수증
  const [savedReceipt, setSavedReceipt] = useState<Receipt | null>(null);
  // 분석 결과 페이지의 현재 단계 (1 매칭 → 2 온도 → 3 원인 → 4 플랜)
  const [resultStep, setResultStep] = useState(1);
  // 화면/단계 전환 시 스크롤을 맨 위로 되돌리기 위한 앵커
  const topRef = useRef<HTMLDivElement>(null);

  // 첫 로딩 시 localStorage에서 상태 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const state = JSON.parse(saved) as AppState;
        setReceipts(state.receipts ?? []);
        setTransactions(state.transactions ?? []);
        setMatchOverrides(state.matchOverrides ?? []);
        setBaseline(state.baseline ?? null);
      }
    } catch {
      // 저장 데이터가 깨졌으면 무시하고 새로 시작
    }
    setHydrated(true);
  }, []);

  // 상태가 바뀔 때마다 localStorage에 저장
  useEffect(() => {
    if (!hydrated) return;
    const state: AppState = { receipts, transactions, matchOverrides, baseline };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [receipts, transactions, matchOverrides, baseline, hydrated]);

  // 토스트 자동 숨김
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  // 영수증·거래내역·수동 판정이 바뀔 때마다 매칭/분석을 다시 계산 (mock AI 파이프라인)
  // 비교 기준은 사용자가 저장한 기록이 있으면 그것을, 없으면 샘플 이전 기록을 사용한다
  const { matchResults, analysis } = useMemo(
    () => analyzeAll(receipts, transactions, baseline ?? previousData, matchOverrides),
    [receipts, transactions, baseline, matchOverrides],
  );

  const hasData = receipts.length > 0;

  // 현재 화면 정보를 오른쪽 설명 패널에 알린다
  useEffect(() => {
    onScreenChange?.({ tab, inputTab, hasData });
  }, [tab, inputTab, hasData, onScreenChange]);

  // 탭이나 분석 단계가 바뀌면 스크롤을 맨 위로
  useEffect(() => {
    topRef.current?.scrollIntoView({ block: 'start' });
  }, [tab, resultStep]);

  // 홈 화면 소비 비교: 지난 소비(비교 기준) vs 이번 소비(현재 영수증 합계)
  const currentTotal = receipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
  const previousTotal = (baseline ?? previousData).totalSpending ?? 0;

  // AI Agent 분석 흐름 카드용: 매칭 완료·품목 보강 건수
  const matchedCount = matchResults.filter(
    (match) => match.status === 'matched' || match.status === 'item_enriched',
  ).length;

  // 샘플 데모 데이터 로딩 (데모 수치가 항상 같게 나오도록 판정·기준도 초기화)
  // 'increase': 지출이 늘어난 주, 'saving': 지출을 아낀 주
  const loadDemo = (kind: 'increase' | 'saving' = 'increase') => {
    if (kind === 'saving') {
      setReceipts(sampleReceiptsSaving);
      setTransactions(sampleTransactionsSaving);
      // 절약 데모는 "지난주 마감 기록"과 비교하는 시나리오
      setBaseline({ ...previousDataSaving, savedAt: '2026-07-07' });
    } else {
      setReceipts(sampleReceipts);
      setTransactions(sampleTransactions);
      setBaseline(null);
    }
    setMatchOverrides([]);
    setResultStep(1);
    setTab('result');
    setToast(
      kind === 'saving' ? '지출 절약 데모를 불러왔어요.' : '지출 증가 데모를 불러왔어요.',
    );
  };

  const resetAll = () => {
    setReceipts([]);
    setTransactions([]);
    setMatchOverrides([]);
    setBaseline(null);
    setTab('home');
    setToast('모든 데이터를 초기화했어요.');
  };

  const addReceipt = (receipt: Omit<Receipt, 'id'>, showModal = false) => {
    const saved: Receipt = { ...receipt, id: nextId('rc') };
    setReceipts((prev) => [...prev, saved]);
    if (showModal) {
      // 직접 입력은 저장된 내용을 모달로 확인시켜준다
      setSavedReceipt(saved);
    } else {
      setToast('영수증이 저장됐어요. 분석 결과에서 확인해보세요.');
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions((prev) => [...prev, { ...transaction, id: nextId('tx') }]);
    setToast('거래내역이 추가됐어요.');
  };

  const deleteReceipt = (id: string) => {
    setReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
    // 삭제된 영수증의 수동 판정도 함께 정리
    setMatchOverrides((prev) => prev.filter((override) => override.receiptId !== id));
  };

  // 영수증 사후 편집 (편집하면 자동 매칭이 다시 계산되도록 수동 판정도 초기화)
  const updateReceipt = (id: string, updated: Omit<Receipt, 'id'>) => {
    setReceipts((prev) =>
      prev.map((receipt) => (receipt.id === id ? { ...updated, id } : receipt)),
    );
    setMatchOverrides((prev) => prev.filter((override) => override.receiptId !== id));
    setToast('영수증을 수정했어요. 매칭과 분석이 다시 계산됐어요.');
  };

  // needs_review 매칭에 대한 수동 판정
  const confirmMatch = (receiptId: string, transactionId: string) => {
    setMatchOverrides((prev) => [
      ...prev.filter((override) => override.receiptId !== receiptId),
      { receiptId, action: 'confirm', transactionId },
    ]);
    setToast('매칭을 확정했어요.');
  };

  const rejectMatch = (receiptId: string) => {
    setMatchOverrides((prev) => [
      ...prev.filter((override) => override.receiptId !== receiptId),
      { receiptId, action: 'reject' },
    ]);
    setToast('직접 입력 소비로 기록했어요.');
  };

  const resetOverride = (receiptId: string) => {
    setMatchOverrides((prev) => prev.filter((override) => override.receiptId !== receiptId));
    setToast('자동 판정으로 되돌렸어요.');
  };

  // 이번 주 기록을 다음 분석의 비교 기준으로 저장
  const saveBaseline = () => {
    const today = new Date().toISOString().slice(0, 10);
    setBaseline(buildBaseline(receipts, today));
    setToast('이번 주 기록을 비교 기준으로 저장했어요.');
  };

  // 주간 마감: 비교 기준으로 저장하고 기록을 비워 새 주를 시작
  const closeWeek = () => {
    const today = new Date().toISOString().slice(0, 10);
    setBaseline(buildBaseline(receipts, today));
    setReceipts([]);
    setTransactions([]);
    setMatchOverrides([]);
    setTab('input');
    setToast('이번 주를 마감했어요. 다음 분석부터 내 기록과 비교해요.');
  };

  const resetBaseline = () => {
    setBaseline(null);
    setToast('비교 기준을 샘플 이전 기록으로 되돌렸어요.');
  };

  const navItems: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'home', label: '홈', icon: <Home size={18} /> },
    { key: 'input', label: '입력', icon: <PenLine size={18} /> },
    { key: 'result', label: '분석 결과', icon: <Thermometer size={18} /> },
  ];

  const inputTabs: { key: InputTab; label: string }[] = [
    { key: 'receipt', label: '영수증 추가' },
    { key: 'manual', label: '직접 입력' },
    { key: 'transactions', label: '카드·계좌 거래내역' },
  ];

  // 분석 결과 단계 정의
  const resultSteps = [
    { step: 1, short: '매칭', title: '영수증과 거래내역을 연결했어요' },
    { step: 2, short: '온도', title: '생활비 온도로 진단했어요' },
    {
      step: 3,
      short: '원인',
      title: analysis.spendingDelta < 0 ? '어떻게 아꼈을까요?' : '왜 올랐을까요?',
    },
    { step: 4, short: '플랜', title: '다음 장보기는 이렇게' },
  ];

  // 요약 히어로 배경색: 온도 상태에 따라
  const resultGradient = {
    안정: 'from-emerald-500 to-teal-600',
    관심: 'from-blue-500 to-indigo-600',
    주의: 'from-orange-500 to-amber-600',
    뜨거움: 'from-red-500 to-rose-600',
  }[analysis.temperatureLabel];

  return (
    // 모바일 앱 셸: 상단 헤더 + 콘텐츠 + 하단 탭바 (데스크톱에서는 휴대폰 프레임 안에 들어간다)
    <div className="flex min-h-screen flex-col lg:min-h-full">
      {/* 스크롤 복귀용 앵커 */}
      <div ref={topRef} />
      {/* 헤더 (AppShell) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setTab('home')}
            className="flex items-center gap-2"
          >
            <span className="rounded-lg bg-emerald-600 p-1.5 text-white">
              <Flame size={16} />
            </span>
            <span className="text-lg font-bold text-slate-900">머니센스</span>
          </button>
          {hasData && (
            <button
              type="button"
              onClick={resetAll}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
              title="데이터 초기화"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </header>

      {/* 토스트 알림: 헤더 바로 아래에 떠 있다 (레이아웃을 밀지 않음) */}
      {toast && (
        <div className="sticky top-[3.3rem] z-30 h-0">
          <div className="flex justify-center pt-2">
            <div className="rounded-full bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-lg">
              {toast}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 py-5 space-y-5">
        {/* ---------- 홈 ---------- */}
        {tab === 'home' &&
          (hasData ? (
            <>
              {/* 지난 소비 → 이번 소비 비교 (숫자 중심) */}
              <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">이번 주 소비 리포트</p>
                  <button
                    type="button"
                    onClick={() => setTab('result')}
                    className="flex items-center gap-0.5 rounded-full bg-white/15 py-1 pl-2.5 pr-1.5 text-xs font-bold text-white transition-colors hover:bg-white/25 active:scale-95"
                  >
                    {analysis.temperature}℃ {analysis.temperatureLabel}
                    <ChevronRight size={13} />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-[1fr_auto_1.2fr] items-center gap-2">
                  <div>
                    <p className="text-[11px] text-emerald-100/80">지난 소비</p>
                    <p className="mt-0.5 text-xl font-semibold text-emerald-50/95">
                      {previousTotal > 0 ? `${previousTotal.toLocaleString('ko-KR')}원` : '기록 없음'}
                    </p>
                  </div>
                  <ArrowRight size={20} className="text-emerald-200" />
                  <div className="text-right">
                    <p className="text-[11px] text-emerald-100/80">이번 소비</p>
                    <p className="mt-0.5 text-3xl font-bold tracking-tight">
                      {currentTotal.toLocaleString('ko-KR')}원
                    </p>
                  </div>
                </div>
                {previousTotal > 0 && (
                  <p className="mt-3.5 rounded-xl bg-white/10 px-3 py-2 text-xs text-emerald-50">
                    지난 지출보다{' '}
                    <b>
                      {Math.abs(currentTotal - previousTotal).toLocaleString('ko-KR')}원 (
                      {currentTotal >= previousTotal ? '+' : '-'}
                      {Math.abs(Math.round(((currentTotal - previousTotal) / previousTotal) * 100))}
                      %)
                    </b>{' '}
                    {currentTotal >= previousTotal ? '늘었어요' : '줄었어요'}
                  </p>
                )}
              </section>

              {/* AI Agent 분석 흐름: 실제 수치가 들어간 5단계 */}
              <AgentFlowCard
                receiptsCount={receipts.length}
                transactionsCount={transactions.length}
                matchedCount={matchedCount}
                analysis={analysis}
              />

              {/* 원인 미리보기: 주요 원인 3개 + 자세히 보기 유도 */}
              {analysis.mainReasons.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('result')}
                  className="group block w-full text-left"
                  aria-label="원인분해 자세히 보기"
                >
                  <Card className="!p-4 transition-all group-hover:border-emerald-400 group-hover:shadow-md group-active:scale-[0.99]">
                    <div className="mb-2 flex items-center gap-2">
                      <ListChecks size={16} className="text-blue-500" />
                      <span className="text-sm font-semibold text-slate-800">
                        {analysis.spendingDelta < 0 ? '어떻게 아꼈을까요?' : '왜 올랐을까요?'}
                      </span>
                    </div>
                    <ol className="space-y-1.5">
                      {analysis.mainReasons.map((reason, index) => (
                        <li key={reason} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-500">
                            {index + 1}
                          </span>
                          {reason}
                        </li>
                      ))}
                    </ol>
                    {/* 이동 유도: 오른쪽 정렬로 구분 */}
                    <div className="mt-3 flex justify-end border-t border-slate-100 pt-2.5">
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                        원인분해 자세히 보기
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </Card>
                </button>
              )}

              {/* 플랜 미리보기: 플랜 목록 + 절약 힌트 + 자세히 보기 유도 */}
              {analysis.actionPlans.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('result')}
                  className="group block w-full text-left"
                  aria-label="다음 장보기 플랜 자세히 보기"
                >
                  <Card className="!p-4 transition-all group-hover:border-emerald-400 group-hover:shadow-md group-active:scale-[0.99]">
                    <div className="mb-2 flex items-center gap-2">
                      <ReceiptIcon size={16} className="text-emerald-600" />
                      <span className="text-sm font-semibold text-slate-800">
                        다음 장보기 플랜
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {analysis.actionPlans.slice(0, 2).map((plan, index) => (
                        <li key={plan.text} className="flex items-start gap-2">
                          <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm leading-relaxed text-slate-600">{plan.text}</p>
                            {plan.savingHint && (
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                                <PiggyBank size={11} /> {plan.savingHint}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {/* 이동 유도: 오른쪽 정렬로 구분 */}
                    <div className="mt-3 flex justify-end border-t border-slate-100 pt-2.5">
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                        전체 플랜 {analysis.actionPlans.length}개 보기
                        <ChevronRight size={13} />
                      </span>
                    </div>
                  </Card>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={() => setTab('result')}>분석 결과 보기</Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTab('input');
                    setInputTab('receipt');
                  }}
                >
                  영수증 추가하기
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* 첫 방문: 시작 화면 */}
              <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-8 text-white">
                <Badge tone="green" className="!bg-white/15 !text-emerald-50 !border-white/20 mb-4">
                  <Sparkles size={12} /> AI 생활금융 에이전트
                </Badge>
                <h1 className="text-2xl font-bold leading-snug">
                  이번 달 생활비,
                  <br />왜 올랐을까요?
                </h1>
                <p className="mt-3 text-sm text-emerald-50/90 leading-relaxed">
                  영수증과 거래내역을 연결해 <b>생활비 온도</b>를 알려드려요. 무엇을 샀고, 왜
                  올랐고, 다음에는 어떻게 바꾸면 좋을지까지.
                </p>
                <div className="mt-6 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => loadDemo('increase')}
                      className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors shadow-sm"
                    >
                      지출 증가 데모
                    </button>
                    <button
                      type="button"
                      onClick={() => loadDemo('saving')}
                      className="rounded-xl bg-white px-3 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                    >
                      지출 절약 데모
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('input');
                      setInputTab('receipt');
                    }}
                    className="w-full rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                  >
                    영수증 추가하기
                  </button>
                </div>
              </section>

              <Card className="!p-4">
                <p className="text-sm font-semibold text-slate-800">
                  지난 소비 → 이번 소비, 숫자로 한눈에
                </p>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  기록이 쌓이면 이 화면에서 지난 소비와 이번 소비를 바로 비교하고, 생활비
                  온도와 원인, 다음 장보기 플랜까지 확인할 수 있어요.
                </p>
              </Card>
            </>
          ))}

        {/* ---------- 입력 ---------- */}
        {tab === 'input' && (
          <>
            <div className="flex gap-1.5 flex-wrap">
              {inputTabs.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setInputTab(item.key)}
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                    inputTab === item.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {inputTab === 'receipt' && (
              <div className="space-y-5">
                <Card
                  title="영수증 추가"
                  subtitle="샘플 영수증을 고르거나 이미지를 업로드해보세요. OCR이 어려우면 직접 입력을 추천해요."
                >
                  <ReceiptInputPanel
                    onSave={addReceipt}
                    onSwitchToManual={() => setInputTab('manual')}
                  />
                </Card>

                {/* 저장된 영수증 목록 */}
                <Card title={`저장된 영수증 ${receipts.length ? `(${receipts.length})` : ''}`}>
                  {receipts.length === 0 ? (
                    <EmptyState
                      icon={<ReceiptIcon size={36} />}
                      title="아직 저장된 영수증이 없어요"
                      description="샘플 영수증을 추가하거나 홈에서 샘플 데모를 불러와보세요."
                    />
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-3">
                        {receipts.map((receipt) => (
                          <ReceiptCard
                            key={receipt.id}
                            receipt={receipt}
                            onDelete={deleteReceipt}
                            onUpdate={updateReceipt}
                          />
                        ))}
                      </div>
                      {/* 저장 후 다음 행동 유도 */}
                      <div className="mt-4 text-center">
                        <Button onClick={() => setTab('result')}>
                          생활비 온도 분석 결과 보기 →
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            )}

            {inputTab === 'manual' && (
              <Card
                title="직접 입력"
                subtitle="영수증이 없거나 사진이 흐릿해도 괜찮아요. 총액만으로도 기록할 수 있어요."
              >
                <ManualExpenseForm onSave={(receipt) => addReceipt(receipt, true)} />
              </Card>
            )}

            {inputTab === 'transactions' && (
              <Card title="카드·계좌 거래내역">
                <TransactionPanel
                  transactions={transactions}
                  onAdd={addTransaction}
                  onLoadSample={() => {
                    setTransactions(sampleTransactions);
                    setToast('샘플 거래내역을 불러왔어요.');
                  }}
                />
              </Card>
            )}
          </>
        )}

        {/* ---------- 분석 결과 ---------- */}
        {tab === 'result' &&
          (!hasData ? (
            <Card>
              <EmptyState
                icon={<Thermometer size={40} />}
                title="아직 분석할 소비 기록이 없어요"
                description="샘플 데모를 불러오면 영수증 매칭부터 생활비 온도, 장보기 플랜까지 한 번에 볼 수 있어요."
                action={<Button onClick={loadDemo}>샘플 데모 보기</Button>}
              />
            </Card>
          ) : (
            <div className="space-y-4">
              {/* 요약 히어로: 온도 · 상태 · 지난주 대비 증감을 한 영역에서 구분해 보여준다 */}
              <section
                className={`rounded-3xl bg-gradient-to-br ${resultGradient} p-5 text-white shadow-lg`}
              >
                <div className="grid grid-cols-3 divide-x divide-white/25 text-center">
                  <div className="px-1">
                    <p className="text-[11px] font-medium text-white/75">생활비 온도</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {analysis.temperature}
                      <span className="text-lg">℃</span>
                    </p>
                  </div>
                  <div className="px-1">
                    <p className="text-[11px] font-medium text-white/75">상태</p>
                    <p className="mt-1 text-3xl font-bold tracking-tight">
                      {analysis.temperatureLabel}
                    </p>
                  </div>
                  <div className="px-1">
                    <p className="text-[11px] font-medium text-white/75">지난주 대비</p>
                    {previousTotal > 0 ? (
                      <>
                        <p className="mt-1.5 text-xl font-bold tracking-tight">
                          {analysis.spendingDelta >= 0 ? '+' : '-'}
                          {Math.abs(analysis.spendingDelta).toLocaleString('ko-KR')}원
                        </p>
                        <p className="text-[11px] font-semibold text-white/85">
                          {analysis.spendingDelta >= 0 ? '소비 증가' : '소비 절약'}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-lg font-bold">기록 없음</p>
                    )}
                  </div>
                </div>
                <p className="mt-4 border-t border-white/25 pt-3 text-xs leading-relaxed text-white/90">
                  {analysis.summaryMessage}
                </p>
              </section>

              {/* 단계 선택: 클릭하면 해당 단계로 이동 */}
              <div className="grid grid-cols-4 gap-1.5">
                {resultSteps.map((item) => (
                  <button
                    key={item.step}
                    type="button"
                    onClick={() => setResultStep(item.step)}
                    className={`rounded-xl px-1 py-2 text-xs font-semibold transition-all ${
                      resultStep === item.step
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                        : 'border border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-[10px] opacity-70">STEP {item.step}</span>
                    {item.short}
                  </button>
                ))}
              </div>

              {/* 현재 단계 콘텐츠 */}
              <div>
                <StepLabel step={resultStep} text={resultSteps[resultStep - 1].title} />
                {resultStep === 1 && (
                  <MatchResultPanel
                    receipts={receipts}
                    transactions={transactions}
                    matchResults={matchResults}
                    onConfirmMatch={confirmMatch}
                    onRejectMatch={rejectMatch}
                    onResetOverride={resetOverride}
                  />
                )}
                {resultStep === 2 && (
                  <div className="space-y-4">
                    <TemperatureCard analysis={analysis} />
                    {/* 온도 계산 근거: 기본 온도 + 요인별 가산 = 최종 온도 */}
                    <TemperatureBreakdown
                      breakdown={analysis.temperatureBreakdown}
                      temperature={analysis.temperature}
                      temperatureLabel={analysis.temperatureLabel}
                    />
                  </div>
                )}
                {resultStep === 3 && (
                  <div className="space-y-4">
                    <CauseBreakdownCards
                      causeDetails={analysis.causeDetails}
                      saving={analysis.spendingDelta < 0}
                    />
                    {/* 지난 소비 vs 이번 소비: 숫자 변화가 원인으로 이어지는 근거 */}
                    <ComparisonPanel comparisons={analysis.comparisons} />
                  </div>
                )}
                {resultStep === 4 && (
                  <div className="space-y-4">
                    <ActionPlanPanel analysis={analysis} />
                    {/* 발표용 요약: 총액 → 품목 복원 → 원인 → 다음 행동 */}
                    <PresentationSummaryCard summary={analysis.presentationSummary} />
                    <BaselineCard
                      baseline={baseline}
                      onSaveBaseline={saveBaseline}
                      onCloseWeek={closeWeek}
                      onResetBaseline={resetBaseline}
                    />
                  </div>
                )}
              </div>

              {/* 단계 이동 버튼 */}
              <div className="flex gap-2">
                {resultStep > 1 && (
                  <Button variant="secondary" onClick={() => setResultStep(resultStep - 1)}>
                    ← 이전
                  </Button>
                )}
                {resultStep < 4 ? (
                  <Button className="flex-1" onClick={() => setResultStep(resultStep + 1)}>
                    다음 단계: {resultSteps[resultStep].short} →
                  </Button>
                ) : (
                  <Button className="flex-1" variant="secondary" onClick={() => setTab('home')}>
                    홈으로 돌아가기
                  </Button>
                )}
              </div>

              <p className="text-center text-[11px] text-slate-400 pb-4">
                머니센스의 분석과 제안은 입력된 기록을 바탕으로 한 참고 정보예요.
              </p>
            </div>
          ))}
      </main>

      {/* 하단 탭바 */}
      <nav className="sticky bottom-0 z-20 mt-auto flex border-t border-slate-200 bg-white/95 backdrop-blur">
        {navItems.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex flex-1 flex-col items-center gap-0.5 pb-2.5 pt-2 text-[10px] font-medium transition-colors ${
              tab === item.key ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className="relative">
              {item.icon}
              {/* 데이터가 있으면 분석 결과 탭에 현재 온도 배지를 표시 */}
              {item.key === 'result' && hasData && (
                <span className="absolute -right-6 -top-1.5 rounded-full bg-orange-100 px-1 py-px text-[9px] font-bold text-orange-600">
                  {analysis.temperature}℃
                </span>
              )}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* 직접 입력 저장 완료 모달 (데스크톱에서는 휴대폰 프레임 안에만 뜬다) */}
      {savedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-sm">
          <div className="w-full max-h-[85%] overflow-y-auto rounded-2xl bg-white p-5 shadow-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 size={40} className="text-emerald-500" />
              <p className="mt-2 text-base font-bold text-slate-900">지출이 저장됐어요</p>
              <p className="mt-0.5 text-xs text-slate-500">
                저장된 내용을 확인해주세요. 매칭과 분석에 바로 반영돼요.
              </p>
            </div>
            <div className="mt-4">
              <ReceiptCard receipt={savedReceipt} />
            </div>
            <Button
              size="lg"
              className="mt-4 w-full"
              onClick={() => {
                // 확인을 누르면 저장된 영수증 화면으로 이동
                setSavedReceipt(null);
                setTab('input');
                setInputTab('receipt');
              }}
            >
              확인
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
