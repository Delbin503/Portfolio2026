import type { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getKeys(): string[] {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Remember the last key that worked so we don't re-hit an exhausted one first.
let keyCursor = 0;

type IncomingMsg = { role?: string; content?: string; text?: string };

export async function POST(req: NextRequest) {
  const keys = getKeys();
  if (!keys.length) {
    return new Response(
      "The AI assistant isn't configured yet — add GEMINI_API_KEYS to .env.local.",
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid request body.", { status: 400 });
  }

  const raw = (body as { messages?: IncomingMsg[] })?.messages;
  const messages = Array.isArray(raw) ? raw : [];
  const contents = messages
    .slice(-16)
    .map((m) => ({
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: [{ text: String(m.content ?? m.text ?? "").slice(0, 4000) }],
    }))
    .filter((c) => c.parts[0].text);

  if (!contents.length) {
    return new Response("No message provided.", { status: 400 });
  }

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt() }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 800 },
  };

  // Try keys in rotation; skip any that fail (rate-limited, invalid, quota)
  // and only give up once every key has been tried.
  const ordered = [...keys.slice(keyCursor), ...keys.slice(0, keyCursor)];
  let upstream: Response | null = null;
  let lastStatus = 0;
  let lastDetail = "";

  for (let i = 0; i < ordered.length; i++) {
    const key = ordered[i];
    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${key}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
    } catch {
      continue; // network blip → try next key
    }

    if (res.ok) {
      upstream = res;
      keyCursor = (keyCursor + i) % keys.length; // start here next time
      break;
    }

    // Any failure (429 rate limit, 403 quota, 400 invalid key, …) → next key.
    lastStatus = res.status;
    lastDetail = await res.text().catch(() => "");
  }

  if (!upstream?.body) {
    const exhausted = lastStatus === 429;
    return new Response(
      exhausted
        ? "All AI keys are rate-limited right now. Please try again shortly."
        : `The AI service is unavailable (last error ${lastStatus}). ${lastDetail.slice(0, 180)}`,
      { status: exhausted ? 429 : 502 }
    );
  }

  // Transform Gemini's SSE stream into a plain-text token stream for the client.
  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const text: string =
            json?.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text ?? "")
              .join("") ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          /* ignore keep-alive / partial frames */
        }
      }
    },
    cancel() {
      reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
