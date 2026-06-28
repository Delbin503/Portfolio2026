import type { ReactNode } from "react";

type Props = {
  id?: string;
  num: string;
  title: string;
  /** Optional right-aligned meta shown next to the heading. */
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function SectionShell({
  id,
  num,
  title,
  meta,
  children,
  className,
}: Props) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 border-t border-line-soft py-16 ${className ?? ""}`}
    >
      <div
        className={`mb-[34px] flex flex-wrap items-end gap-x-6 gap-y-2 ${
          meta ? "justify-between" : ""
        }`}
      >
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-xs tracking-[0.06em] text-accent">
            {num}
          </span>
          <h2 className="font-display text-[34px] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
        </div>
        {meta}
      </div>
      {children}
    </section>
  );
}
