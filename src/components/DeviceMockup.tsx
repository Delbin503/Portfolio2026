import type { ReactNode } from "react";

/** Plain screen, full width — no forced ratio, so nothing is ever cropped. */
export function MacMockup({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[900px] overflow-hidden rounded-[var(--rmock)] border border-line bg-black shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)]">
      {children}
    </div>
  );
}

/** Plain screen, narrower — for mobile-shaped content. */
export function PhoneMockup({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[380px] overflow-hidden rounded-[var(--rmock)] border border-line bg-black shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)]">
      {children}
    </div>
  );
}
