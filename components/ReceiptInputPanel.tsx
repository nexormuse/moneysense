// 영수증 추가 패널: 샘플 영수증 선택 / 이미지 업로드 mock / 직접 입력 전환
'use client';

import { Camera, FileText, PenLine, ReceiptText } from 'lucide-react';
import { useRef, useState } from 'react';
import ItemInputList from './ItemInputList';
import { Badge, Button, Card } from './ui';
import { ocrSampleReceipts } from '@/lib/mockData';
import { mockParseReceipt } from '@/lib/services/mockAi';
import { paymentMethodLabels, receiptTypeLabels, storeTypeLabels } from '@/lib/labels';
import type { ExpenseItem, Receipt } from '@/lib/types';

type ReceiptInputPanelProps = {
  onSave: (receipt: Omit<Receipt, 'id'>) => void;
  onSwitchToManual: () => void;
};

export default function ReceiptInputPanel({ onSave, onSwitchToManual }: ReceiptInputPanelProps) {
  // OCR 결과 미리보기 상태 (합계형이면 품목을 직접 추가할 수 있다)
  const [pending, setPending] = useState<Omit<Receipt, 'id'> | null>(null);
  const [uploadNotice, setUploadNotice] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectSample = (index: number) => {
    // 실제 OCR 대신 mock OCR 결과를 사용한다
    setPending(mockParseReceipt(ocrSampleReceipts[index].receipt));
  };

  const handleUpload = () => {
    // 실제 OCR은 하지 않고 안내 후 샘플 결과를 고르게 한다
    setUploadNotice(true);
    setPending(null);
  };

  const setPendingItems = (items: ExpenseItem[]) => {
    if (!pending) return;
    setPending({ ...pending, items });
  };

  const handleSave = () => {
    if (!pending) return;
    onSave(pending);
    setPending(null);
    setUploadNotice(false);
  };

  return (
    <div className="space-y-4">
      {/* 입력 방법 선택 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setUploadNotice(false);
            setPending(null);
          }}
          className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-700"
        >
          <ReceiptText size={16} /> 샘플 영수증 선택
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          <Camera size={16} /> 이미지 업로드
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
          onChange={handleUpload}
        />
      </div>

      {uploadNotice && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          MVP에서는 실제 OCR 대신 <b>mock OCR 결과</b>를 사용합니다. 아래에서 인식 결과로 사용할
          샘플 영수증을 선택해주세요.
          <br />
          사진이 흐릿하거나 간이영수증이라면 억지로 분석하는 대신{' '}
          <button
            type="button"
            onClick={onSwitchToManual}
            className="font-semibold underline underline-offset-2 hover:text-blue-900"
          >
            직접 입력으로 전환
          </button>
          하는 것을 추천해요.
        </div>
      )}

      {/* 샘플 영수증(mock OCR 결과) 선택 */}
      {!pending && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

      {/* OCR 결과 미리보기 + 저장 */}
      {pending && (
        <Card
          title="인식 결과 확인"
          subtitle={
            pending.type === 'summary'
              ? '합계형 영수증이에요. 품목을 직접 추가하면 분석이 더 정확해져요.'
              : pending.type === 'card_slip'
                ? '카드매출전표는 품목 분석 없이 거래내역 매칭·증빙용으로 저장돼요.'
                : '품목이 모두 인식됐어요. 확인 후 저장해주세요.'
          }
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-slate-900">{pending.storeName}</span>
              <Badge tone="slate">{receiptTypeLabels[pending.type]}</Badge>
              <Badge tone="blue">{storeTypeLabels[pending.storeType]}</Badge>
              <Badge tone="amber">{paymentMethodLabels[pending.paymentMethod]}</Badge>
            </div>
            <p className="text-sm text-slate-600">
              {pending.date} · 총액{' '}
              <b className="text-slate-900">{pending.totalAmount.toLocaleString('ko-KR')}원</b>
            </p>

            {/* 품목형: 인식된 품목 목록 표시 */}
            {pending.type === 'itemized' && pending.items.length > 0 && (
              <ul className="space-y-1 rounded-lg bg-slate-50 border border-slate-200 p-3">
                {pending.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm text-slate-700">
                    <span>{item.name}</span>
                    <span>{item.amount.toLocaleString('ko-KR')}원</span>
                  </li>
                ))}
              </ul>
            )}

            {/* 합계형: 품목 직접 추가 */}
            {pending.type === 'summary' && (
              <ItemInputList items={pending.items} onChange={setPendingItems} />
            )}

            <div className="flex gap-2">
              <Button onClick={handleSave} className="flex-1">
                영수증 저장하기
              </Button>
              <Button variant="secondary" onClick={() => setPending(null)}>
                다시 선택
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
