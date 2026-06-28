import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWriting } from "@/lib/data";

export function generateStaticParams() {
  return getWriting().map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getWriting().find((w) => w.slug === slug);
  if (!post) return {};
  return { title: post.title, description: post.excerpt };
}

export default async function WritingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getWriting().find((w) => w.slug === slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-[680px] px-6 py-[72px] sm:px-10">
      <Link
        href="/#writing"
        className="font-mono text-xs uppercase tracking-[0.1em] text-dim transition-colors hover:text-text"
      >
        ← Back to writing
      </Link>

      <div className="mt-10 font-mono text-[11px] uppercase tracking-[0.1em] text-dim">
        {post.date}
      </div>
      <h1 className="mt-3 font-display text-[clamp(34px,6vw,48px)] font-semibold leading-[1.06] tracking-[-0.01em]">
        {post.title}
      </h1>
      <p className="mt-5 text-[19px] leading-[1.6] text-muted">
        {post.excerpt}
      </p>

      <div className="mt-10 space-y-5 border-t border-line-soft pt-8 text-[17px] leading-[1.8] text-[#bcbcc4]">
        <p>
          This is a placeholder for the essay. Replace it with the full piece
          when you publish — the layout, type scale, and reading width are
          already tuned for long-form text.
        </p>
        <p>
          The design language carries over from the portfolio: Familjen Grotesk
          for headings, Hanken Grotesk for body, JetBrains Mono for metadata.
        </p>
      </div>
    </article>
  );
}
