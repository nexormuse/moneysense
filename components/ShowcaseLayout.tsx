// 데스크톱: 왼쪽 휴대폰 프레임(실제 앱) + 오른쪽 화면 연동 설명 / 모바일: 앱 전체 화면
'use client';

import { useState } from 'react';
import MoneySenseApp, { type AppScreen } from './MoneySenseApp';
import ShowcasePanel from './ShowcasePanel';

export default function ShowcaseLayout() {
  // 휴대폰 화면 상태를 받아 오른쪽 패널이 해당 화면 설명을 보여준다
  const [screen, setScreen] = useState<AppScreen>({
    tab: 'home',
    inputTab: 'receipt',
    hasData: false,
  });

  return (
    <div className="min-h-screen lg:bg-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col lg:flex-row lg:items-start lg:justify-center lg:gap-14 lg:px-8 lg:py-12">
        {/* 휴대폰 프레임: 모바일에서는 프레임 없이 앱이 그대로 화면 전체를 차지한다 */}
        <div className="lg:sticky lg:top-12 lg:shrink-0">
          <div className="relative lg:rounded-[2.75rem] lg:bg-slate-900 lg:p-2.5 lg:shadow-2xl lg:shadow-slate-400/60">
            {/* 노치 (헤더의 빈 가운데 공간 위에 얹힌다) */}
            <div className="pointer-events-none absolute left-1/2 top-4 z-40 hidden h-4 w-24 -translate-x-1/2 rounded-full bg-slate-900 lg:block" />
            {/* 바깥(고정 크기, 스크롤 없음)에 transform을 걸어 fixed 모달이
                스크롤 위치와 무관하게 보이는 화면 중앙에 뜨게 한다 */}
            <div className="bg-slate-50 lg:h-[min(760px,calc(100vh-6rem))] lg:w-[375px] lg:overflow-hidden lg:rounded-[2.25rem] lg:[transform:translateZ(0)]">
              <div className="[scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:h-full lg:overflow-y-auto">
                <MoneySenseApp onScreenChange={setScreen} />
              </div>
            </div>
          </div>
        </div>

        {/* 화면 연동 설명 패널 (데스크톱 전용): 휴대폰 프레임(베젤 포함)과 위아래 라인을 맞춘다 */}
        <aside className="hidden lg:block lg:h-[calc(min(760px,100vh-6rem)+1.25rem)] lg:max-w-xl lg:flex-1 lg:overflow-hidden">
          <ShowcasePanel screen={screen} />
        </aside>
      </div>
    </div>
  );
}
