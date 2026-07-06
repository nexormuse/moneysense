// 영수증 추가 패널: 샘플 영수증 선택 / 이미지 업로드(LLM Vision OCR) / 직접 입력 전환
'use client';

import { AlertTriangle, Camera, FileText, Loader2, PenLine, ReceiptText, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import ItemInputList from './ItemInputList';
import { Badge, Button, Card } from './ui';
import { ocrSampleReceipts } from '@/lib/mockData';
import { mockParseReceipt, parseReceiptImageWithVision } from '@/lib/services/ai';
import { paymentMethodLabels, receiptTypeLabels, storeTypeLabels } from '@/lib/labels';
import type { ExpenseItem, Receipt } from '@/lib/types';

type ReceiptInputPanelProps = {
  onSave: (receipt: Omit<Receipt, 'id'>) => void;
  onSwitchToManual: () => void;
};

// 업로드 상태: 로딩 / 실패 사유별 정직한 안내
type OcrStatus = 'idle' | 'loading' | 'unsupported' | 'disabled' | 'failed' | 'not_a_receipt';

// AI 인식 결과에 붙는 확인 플래그
type AiMeta = { sumMismatch: boolean; dateUncertain: boolean };

const OCR_ERROR_MESSAGES: Record<Exclude<OcrStatus, 'idle' | 'loading'>, string> = {
  unsupported: '이 이미지는 처리할 수 없어요. 다른 사진이나 직접 입력을 이용해주세요.',
  disabled:
    '이 데모 환경에서는 AI 인식이 비활성화되어 있어요. 샘플 영수증으로 체험하거나 직접 입력해주세요.',
  failed: '영수증 인식에 실패했어요. 샘플 영수증으로 체험하거나 직접 입력해주세요.',
  not_a_receipt: '영수증 사진이 아닌 것 같아요. 다른 사진을 올리거나 직접 입력해주세요.',
};

/**
 * 업로드 전 클라이언트 리사이즈: 긴 변 최대 1568px, JPEG 품질 0.8로 재인코딩.
 * 토큰 비용을 줄이고, HEIC 등 비표준 포맷도 JPEG로 통일한다.
 * 개인정보 보호: 원본 이미지는 브라우저 밖으로 나가지 않고, 재인코딩본도 서버에 저장되지 않는다.
 */
async function resizeToJpegBase64(file: File): Promise<string | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1568 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64 = dataUrl.split(',')[1];
    return base64 || null;
  } catch {
    return null;
  }
}

export default function ReceiptInputPanel({ onSave, onSwitchToManual }: ReceiptInputPanelProps) {
  // 인식/선택 결과 미리보기 상태
  const [pending, setPending] = useState<Omit<Receipt, 'id'> | null>(null);
  // AI 인식 결과이면 확인 플래그를 함께 보관 (샘플 선택이면 null)
  const [aiMeta, setAiMeta] = useState<AiMeta | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectSample = (index: number) => {
    // 샘플 영수증은 mock OCR 결과를 사용한다 (데모 결정성 유지)
    setPending(mockParseReceipt(ocrSampleReceipts[index].receipt));
    setAiMeta(null);
    setOcrStatus('idle');
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // 같은 파일 재선택 허용
    if (!file) return;

    setPending(null);
    setAiMeta(null);
    setOcrStatus('loading');

    const base64 = await resizeToJpegBase64(file);
    if (!base64) {
      setOcrStatus('unsupported');
      return;
    }

    const result = await parseReceiptImageWithVision(base64, 'image/jpeg');
    if (!result.ok) {
      setOcrStatus(
        result.reason === 'disabled'
          ? 'disabled'
          : result.reason === 'not_a_receipt'
            ? 'not_a_receipt'
            : 'failed',
      );
      return;
    }

    // 바로 저장하지 않고 확인/수정 화면을 먼저 보여준다
    setPending(result.receipt);
    setAiMeta({ sumMismatch: result.sumMismatch, dateUncertain: result.dateUncertain });
    setOcrStatus('idle');
  };

  const setPendingItems = (items: ExpenseItem[]) => {
    if (!pending) return;
    setPending({ ...pending, items });
  };

  const handleSave = () => {
    if (!pending) return;
    onSave(pending);
    setPending(null);
    setAiMeta(null);
    setOcrStatus('idle');
  };

  const isAiResult = aiMeta !== null;

  return (
    <div className="space-y-4">
      {/* 입력 방법 선택 */}
      <div className="grid grid-cols-1 gap-2">
        <button
          type="button"
          onClick={() => {
            setPending(null);
            setAiMeta(null);
            setOcrStatus('idle');
          }}
          className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700"
        >
          <ReceiptText size={16} /> 샘플 영수증 선택
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={ocrStatus === 'loading'}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        >
          <Camera size={16} /> 영수증 사진 업로드 (AI 인식)
        </button>
        <button
          type="button"
          onClick={onSwitchToManual}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <PenLine size={16} /> 직접 입력으로 전환
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* 인식 진행 중 */}
      {ocrStatus === 'loading' && (
        <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <Loader2 size={18} className="animate-spin shrink-0" />
          AI가 영수증을 읽고 있어요…
        </div>
      )}

      {/* 인식 실패/비활성화: 정직한 안내 후 기존 경로(샘플/직접 입력)로 유도 */}
      {ocrStatus !== 'idle' && ocrStatus !== 'loading' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {OCR_ERROR_MESSAGES[ocrStatus]}
          <br />
          사진이 흐릿하거나 간이영수증이라면{' '}
          <button
            type="button"
            onClick={onSwitchToManual}
            className="font-semibold underline underline-offset-2 hover:text-amber-950"
          >
            직접 입력으로 전환
          </button>
          하는 것을 추천해요.
        </div>
      )}

      {/* 샘플 영수증(mock OCR 결과) 선택 */}
      {!pending && ocrStatus !== 'loading' && (
        <div className="grid grid-cols-1 gap-3">
          {ocrSampleReceipts.map((sample, index) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => selectSample(index)}
              className="text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-emerald-400 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={16} className="text-emerald-600" />
                <span className="text-sm font-semibold text-slate-800">{sample.label}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{sample.description}</p>
              <p className="text-xs text-slate-400 mt-2">
                {sample.receipt.storeName} · {sample.receipt.totalAmount.toLocaleString('ko-KR')}원
              </p>
            </button>
          ))}
        </div>
      )}

      {/* 인식 결과 확인/수정 + 저장 */}
      {pending && (
        <Card
          title="인식 결과 확인"
          subtitle={
            isAiResult
              ? '저장 전에 인식된 내용을 확인하고 필요하면 수정해주세요.'
              : pending.type === 'summary'
                ? '합계형 영수증이에요. 품목을 직접 추가하면 분석이 더 정확해져요.'
                : pending.type === 'card_slip'
                  ? '카드매출전표는 품목 분석 없이 거래내역 매칭·증빙용으로 저장돼요.'
                  : '품목이 모두 인식됐어요. 확인 후 저장해주세요.'
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {isAiResult && (
                <Badge tone="blue">
                  <Sparkles size={11} /> AI 인식
                </Badge>
              )}
              {!isAiResult && (
                <span className="font-semibold text-slate-900">{pending.storeName}</span>
              )}
              <Badge tone="slate">{receiptTypeLabels[pending.type]}</Badge>
              <Badge tone="blue">{storeTypeLabels[pending.storeType]}</Badge>
              <Badge tone="amber">{paymentMethodLabels[pending.paymentMethod]}</Badge>
            </div>

            {/* AI 인식 결과: 날짜·상호·총액을 직접 수정할 수 있다 */}
            {isAiResult ? (
              <div className="space-y-2">
                <label className="block text-xs text-slate-500">
                  상호명
                  <input
                    type="text"
                    value={pending.storeName}
                    onChange={(event) => setPending({ ...pending, storeName: event.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </label>
                <label className="block text-xs text-slate-500">
                  날짜
                  <input
                    type="date"
                    value={pending.date}
                    onChange={(event) => setPending({ ...pending, date: event.target.value })}
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {aiMeta.dateUncertain && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle size={11} /> 날짜를 읽지 못해 오늘 날짜로 입력했어요. 확인해주세요.
                    </span>
                  )}
                </label>
                <label className="block text-xs text-slate-500">
                  총액 (원)
                  <input
                    type="number"
                    value={pending.totalAmount || ''}
                    onChange={(event) =>
                      setPending({ ...pending, totalAmount: Number(event.target.value) || 0 })
                    }
                    className="mt-1 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {aiMeta.sumMismatch && (
                    <span className="mt-1 flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle size={11} /> 품목 합계와 총액이 달라요. 금액을 확인해주세요.
                    </span>
                  )}
                </label>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {pending.date} · 총액{' '}
                <b className="text-slate-900">{pending.totalAmount.toLocaleString('ko-KR')}원</b>
              </p>
            )}

            {/* AI 인식·합계형: 품목 편집 가능 / 샘플 품목형: 읽기 전용 목록 */}
            {isAiResult || pending.type === 'summary' ? (
              <ItemInputList items={pending.items} onChange={setPendingItems} />
            ) : (
              pending.type === 'itemized' &&
              pending.items.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-slate-50 border border-slate-200 p-3">
                  {pending.items.map((item) => (
                    <li key={item.id} className="flex justify-between text-sm text-slate-700">
                      <span>{item.name}</span>
                      <span>{item.amount.toLocaleString('ko-KR')}원</span>
                    </li>
                  ))}
                </ul>
              )
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={!pending.storeName.trim() || pending.totalAmount <= 0}
                className="flex-1"
              >
                영수증 저장하기
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setPending(null);
                  setAiMeta(null);
                }}
              >
                다시 선택
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
