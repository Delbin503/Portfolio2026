import type { ReactNode } from "react";

/** Front-on laptop frame — screen + camera notch + a slim base lip. */
export function MacMockup({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[900px]">
      <div className="relative overflow-hidden rounded-t-[14px] border-[10px] border-b-0 border-[#1c1c1e] bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
        <div className="absolute left-1/2 top-0 z-10 h-[6px] w-[8px] -translate-x-1/2 translate-y-[1px] rounded-full bg-[#3a3a3c]" />
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {children}
        </div>
      </div>
      <div className="relative mx-[-2%] h-[10px] rounded-b-[6px] bg-gradient-to-b from-[#2c2c2e] to-[#161616]">
        <div className="absolute left-1/2 top-0 h-[4px] w-[90px] -translate-x-1/2 rounded-b-[4px] bg-[#0c0b0f]" />
      </div>
    </div>
  );
}

/** Front-on phone frame — rounded shell, notch, side buttons. */
export function PhoneMockup({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[220px]">
      <div className="relative overflow-hidden rounded-[32px] border-[8px] border-[#1c1c1e] bg-black shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
        <div className="absolute left-1/2 top-[10px] z-10 h-[16px] w-[70px] -translate-x-1/2 rounded-full bg-[#0c0b0f]" />
        <div className="relative aspect-[9/19.5] w-full overflow-hidden bg-black">
          {children}
        </div>
        <div className="absolute -left-[8px] top-[70px] h-[24px] w-[2px] rounded-l bg-[#2c2c2e]" />
        <div className="absolute -left-[8px] top-[104px] h-[40px] w-[2px] rounded-l bg-[#2c2c2e]" />
        <div className="absolute -right-[8px] top-[90px] h-[50px] w-[2px] rounded-r bg-[#2c2c2e]" />
      </div>
    </div>
  );
}
