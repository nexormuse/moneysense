// 머니센스 메인 앱: 탭 네비게이션 + 전역 상태 + localStorage 저장
'use client';

import {
  ArrowRight,
  Flame,
  Home,
  ListChecks,
  PenLine,
  Receipt as ReceiptIcon,
  Sparkles,
  Thermometer,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ActionPlanPanel from './ActionPlanPanel';
import BaselineCard from './BaselineCard';
import CauseBreakdownCards from './CauseBreakdownCards';
import ManualExpenseForm from './ManualExpenseForm';
import MatchResultPanel from './MatchResultPanel';
import ReceiptCard from './ReceiptCard';
import ReceiptInputPanel from './ReceiptInputPanel';
import TemperatureCard from './TemperatureCard';
import TransactionPanel from './TransactionPanel';
import { Badge, Button, Card, EmptyState } from './ui';
import { previousData, sampleReceipts, sampleTransactions } from '@/lib/mockData';
import { analyzeAll, buildBaseline } from '@/lib/services/mockAi';
import type { AppState, MatchOverride, Receipt, Transaction, UserBaseline } from '@/lib/types';

const STORAGE_KEY = 'moneysense-state-v1';

type Tab = 'home' | 'input' | 'result';
type InputTab = 'receipt' | 'manual' | 'transactions';

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

export default function MoneySenseApp() {
  const [tab, setTab] = useState<Tab>('home');
  const [inputTab, setInputTab] = useState<InputTab>('receipt');
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [matchOverrides, setMatchOverrides] = useState<MatchOverride[]>([]);
  const [baseline, setBaseline] = useState<UserBaseline | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState('');

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

  // 샘플 데모 데이터 로딩 (데모 수치가 항상 같게 나오도록 판정·기준도 초기화)
  const loadDemo = () => {
    setReceipts(sampleReceipts);
    setTransactions(sampleTransactions);
    setMatchOverrides([]);
    setBaseline(null);
    setTab('result');
    setToast('샘플 데모 데이터를 불러왔어요.');
  };

  const resetAll = () => {
    setReceipts([]);
    setTransactions([]);
    setMatchOverrides([]);
    setBaseline(null);
    setTab('home');
    setToast('모든 데이터를 초기화했어요.');
  };

  const addReceipt = (receipt: Omit<Receipt, 'id'>) => {
    setReceipts((prev) => [...prev, { ...receipt, id: nextId('rc') }]);
    setToast('영수증이 저장됐어요. 분석 결과에서 확인해보세요.');
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
    { key: 'home', label: '홈', icon: <Home size={16} /> },
    { key: 'input', label: '입력', icon: <PenLine size={16} /> },
    { key: 'result', label: '분석 결과', icon: <Thermometer size={16} /> },
  ];

  const inputTabs: { key: InputTab; label: string }[] = [
    { key: 'receipt', label: '영수증 추가' },
    { key: 'manual', label: '직접 입력' },
    { key: 'transactions', label: '카드·계좌 거래내역' },
  ];

  return (
    <div className="min-h-screen">
      {/* 헤더 (AppShell) */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button
            type="button"
            onClick={() => setTab('home')}
            className="flex items-center gap-2"
          >
            <span className="rounded-lg bg-emerald-600 p-1.5 text-white">
              <Flame size={16} />
            </span>
            <span className="text-lg font-bold text-slate-900">머니센스</span>
            <span className="hidden sm:inline text-xs text-slate-400">
              AI 생활금융 Agent
            </span>
          </button>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  tab === item.key
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {item.icon}
                <span className="hidden sm:inline">{item.label}</span>
                {/* 데이터가 있으면 분석 결과 탭에 현재 온도를 표시 */}
                {item.key === 'result' && hasData && (
                  <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[11px] font-bold text-orange-600">
                    {analysis.temperature}℃
                  </span>
                )}
              </button>
            ))}
            {hasData && (
              <button
                type="button"
                onClick={resetAll}
                className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
                title="데이터 초기화"
              >
                <Trash2 size={15} />
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* ---------- 홈 ---------- */}
        {tab === 'home' && (
          <>
            {/* 히어로 */}
            <section className="rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-10 text-white sm:px-10">
              <Badge tone="green" className="!bg-white/15 !text-emerald-50 !border-white/20 mb-4">
                <Sparkles size={12} /> 영수증 OCR 가계부가 아니에요
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-bold leading-snug">
                이번 달 생활비,
                <br />왜 올랐을까요?
              </h1>
              <p className="mt-3 text-sm sm:text-base text-emerald-50/90 leading-relaxed max-w-md">
                머니센스가 영수증과 거래내역을 연결해 <b>생활비 온도</b>를 알려드립니다.
                무엇을 샀고, 왜 생활비가 올랐고, 다음에는 어떻게 바꾸면 좋을지까지.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadDemo}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-sm"
                >
                  샘플 데모 보기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('input');
                    setInputTab('receipt');
                  }}
                  className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  영수증 추가하기
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('input');
                    setInputTab('manual');
                  }}
                  className="rounded-xl border border-white/40 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  직접 입력하기
                </button>
              </div>
            </section>

            {/* 차별성 설명: 카드내역 총액 → 영수증 품목 보강 */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-800">
                카드내역만으로는 <span className="text-emerald-600">무엇을 샀는지</span> 알 수
                없어요
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                머니센스는 영수증을 연결해 총액 뒤에 숨은 품목을 보여주고, 생활비가 오른 이유를
                설명해요.
              </p>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-stretch gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[11px] font-medium text-slate-400 mb-1.5">
                    카드·계좌 거래내역
                  </p>
                  <p className="text-sm font-semibold text-slate-700">○○마트 41,000원</p>
                  <p className="mt-1.5 text-xs text-slate-400">
                    총액만 남고 품목 정보는 사라져요
                  </p>
                </div>
                <div className="flex items-center justify-center text-emerald-500">
                  <ArrowRight size={18} className="rotate-90 sm:rotate-0" />
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-[11px] font-medium text-emerald-600 mb-1.5">
                    + 영수증 연결 (품목 보강)
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    우유 3,200 · 계란 7,800 · 세제 12,000 …
                  </p>
                  <p className="mt-1.5 text-xs text-emerald-700">
                    품목 단위로 &ldquo;왜 올랐는지&rdquo;까지 설명해요
                  </p>
                </div>
              </div>
            </section>

            {/* 핵심 카드 3개 */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Card className="!p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Thermometer size={16} className="text-orange-500" />
                  <span className="text-sm font-semibold text-slate-800">생활비 온도</span>
                </div>
                {hasData ? (
                  <p className="text-2xl font-bold text-slate-900">
                    {analysis.temperature}℃{' '}
                    <span className="text-sm font-medium text-slate-500">
                      {analysis.temperatureLabel}
                    </span>
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    카드내역에 없는 품목 단위 소비까지 반영해 이번 주 생활비 상태를 온도로
                    보여줘요.
                  </p>
                )}
              </Card>
              <Card className="!p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <ListChecks size={16} className="text-blue-500" />
                  <span className="text-sm font-semibold text-slate-800">원인분해</span>
                </div>
                {hasData && analysis.mainReasons.length > 0 ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {analysis.mainReasons[0]}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    가격 상승·구매량 증가·소비처 변화·조정 가능한 소비, 4가지로 원인을 나눠
                    설명해요.
                  </p>
                )}
              </Card>
              <Card className="!p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <ReceiptIcon size={16} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-800">다음 장보기 플랜</span>
                </div>
                {hasData && analysis.actionPlans.length > 0 ? (
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {analysis.actionPlans[0].text}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 leading-relaxed">
                    절약 포인트와 지역상생 전환 제안까지, 다음 장보기에서 바꿀 것을 알려줘요.
                  </p>
                )}
              </Card>
            </section>

            {hasData && (
              <div className="text-center">
                <Button variant="secondary" onClick={() => setTab('result')}>
                  분석 결과 자세히 보기 →
                </Button>
              </div>
            )}
          </>
        )}

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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <ManualExpenseForm onSave={addReceipt} />
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
            <div className="space-y-5">
              {/* 한 줄 요약 */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 leading-relaxed">
                {analysis.summaryMessage}
              </div>

              {/* 심사/데모 스토리 순서: 연결 → 진단 → 원인 → 플랜 */}
              <div>
                <StepLabel step={1} text="영수증과 거래내역을 연결했어요" />
                <MatchResultPanel
                  receipts={receipts}
                  transactions={transactions}
                  matchResults={matchResults}
                  onConfirmMatch={confirmMatch}
                  onRejectMatch={rejectMatch}
                  onResetOverride={resetOverride}
                />
              </div>
              <div>
                <StepLabel step={2} text="이번 주 생활비 상태를 온도로 진단했어요" />
                <TemperatureCard analysis={analysis} />
              </div>
              <div>
                <StepLabel step={3} text="왜 올랐을까요?" />
                <CauseBreakdownCards causeDetails={analysis.causeDetails} />
              </div>
              <div>
                <StepLabel step={4} text="그래서, 다음 장보기는 이렇게" />
                <ActionPlanPanel analysis={analysis} />
              </div>
              <BaselineCard
                baseline={baseline}
                onSaveBaseline={saveBaseline}
                onCloseWeek={closeWeek}
                onResetBaseline={resetBaseline}
              />

              <p className="text-center text-[11px] text-slate-400 pb-4">
                머니센스의 분석과 제안은 입력된 기록 기반의 참고 정보이며, 금융 상품 권유나 가격
                보장이 아니에요.
              </p>
            </div>
          ))}
      </main>

      {/* 토스트 알림 */}
      {toast && (
        <div className="fixed bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
