import type { NextRequest } from "next/server";
import {
  CONTACT_EMAIL_TAGGED,
  FIELD_MAX,
  HONEYPOT_FIELD,
  type Inquiry,
} from "@/lib/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sender for the notification. Resend's shared test sender works with no domain
 * setup, but it may only deliver to the address the Resend account is
 * registered under — verify a domain and set CONTACT_FROM to send from it.
 */
const FROM = process.env.CONTACT_FROM || "Portfolio <onboarding@resend.dev>";

/** Override if Resend's test mode refuses the plus-tagged recipient. */
const TO = process.env.CONTACT_TO || CONTACT_EMAIL_TAGGED;

/* ── Rate limiting ───────────────────────────────────────────────────
 * Best-effort only: serverless instances don't share memory, so a burst
 * spread across cold starts can slip past. It's here to blunt casual abuse,
 * not as a hard guarantee — the honeypot does the heavier lifting.
 * ------------------------------------------------------------------ */
const RATE_LIMIT = 3;
const RATE_WINDOW_MS = 10 * 60_000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  // Drop stale buckets so the map can't grow without bound on a warm instance.
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (!times.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  hits.set(ip, [...recent, now]);
  return false;
}

function clientIp(req: NextRequest): string {
  // `request.ip` was removed from NextRequest; the proxy header is the way now.
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

/* ── Validation ──────────────────────────────────────────────────── */

// Deliberately loose: the point is to catch typos, not to adjudicate RFC 5322.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function validate(body: Record<string, unknown>): {
  inquiry?: Inquiry;
  error?: string;
} {
  const inquiry: Inquiry = {
    name: str(body.name),
    email: str(body.email),
    company: str(body.company),
    projectType: str(body.projectType),
    timeline: str(body.timeline),
    message: str(body.message),
  };

  if (!inquiry.name) return { error: "Please add your name." };
  if (!EMAIL_RE.test(inquiry.email))
    return { error: "That email address doesn't look right." };
  if (inquiry.message.length < 10)
    return { error: "Please add a little more detail about the project." };

  for (const [field, max] of Object.entries(FIELD_MAX)) {
    if (inquiry[field as keyof Inquiry].length > max)
      return { error: `That ${field} is too long — ${max} characters max.` };
  }

  return { inquiry };
}

function textBody(inquiry: Inquiry): string {
  return [
    `From:      ${inquiry.name} <${inquiry.email}>`,
    `Company:   ${inquiry.company || "—"}`,
    `Looking for: ${inquiry.projectType || "—"}`,
    `Timeline:  ${inquiry.timeline || "—"}`,
    "",
    "-".repeat(48),
    "",
    inquiry.message,
    "",
    "-".repeat(48),
    "Sent from the contact form on your portfolio.",
    "Reply directly to this email to reach them.",
  ].join("\n");
}

/* ── Handler ─────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return Response.json(
      { error: "The contact form isn't configured yet — add RESEND_API_KEY." },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: report success so the bot moves on instead of retrying.
  if (str(body[HONEYPOT_FIELD])) return Response.json({ ok: true });

  const { inquiry, error } = validate(body);
  if (!inquiry) return Response.json({ error }, { status: 400 });

  // Checked only after validation passes: a rejected payload sends no mail, so
  // someone mistyping their email three times shouldn't burn their budget.
  if (rateLimited(clientIp(req))) {
    return Response.json(
      { error: "That's a few messages in a row — try again in a little while." },
      { status: 429 }
    );
  }

  const subject = inquiry.company
    ? `Work inquiry — ${inquiry.name} at ${inquiry.company}`
    : `Work inquiry — ${inquiry.name}`;

  let res: Response;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        // Hitting Reply in Gmail goes to the visitor, not to Resend.
        reply_to: `${inquiry.name} <${inquiry.email}>`,
        subject,
        text: textBody(inquiry),
      }),
    });
  } catch {
    return Response.json(
      { error: "Couldn't reach the mail service. Please email me directly." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    // Log the upstream reason for debugging; don't leak it to the visitor.
    console.error("[contact] Resend error", res.status, await res.text().catch(() => ""));
    return Response.json(
      { error: "Something went wrong sending that. Please email me directly." },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
