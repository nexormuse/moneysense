import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '머니센스 — 생활비가 오른 이유를 알려주는 AI 생활금융 Agent',
  description:
    '영수증과 거래내역을 연결해 생활비 온도가 왜 올라갔는지 알려주고, 다음 장보기 플랜까지 제안합니다.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
