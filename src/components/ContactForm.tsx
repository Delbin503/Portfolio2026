"use client";

import { useState } from "react";
import {
  CONTACT_EMAIL,
  CONTACT_ENDPOINT,
  FIELD_MAX,
  HONEYPOT_FIELD,
  PROJECT_TYPES,
  workMailto,
} from "@/lib/contact";

type Status = "idle" | "sending" | "sent" | "error";

const FIELD_CLASS =
  "w-full rounded-xl border border-line bg-panel px-3.5 py-2.5 text-[14.5px] text-text outline-none transition-colors placeholder:text-dim focus:border-accent";

const LABEL_CLASS =
  "mb-1.5 block font-mono text-[10.5px] uppercase tracking-[0.12em] text-dim";

export default function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;

    const data = Object.fromEntries(new FormData(e.currentTarget));
    setStatus("sending");
    setError("");

    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please email me directly.");
        setStatus("error");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Couldn't send that — check your connection, or email me directly.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div
        className="mx-auto mt-10 max-w-[560px] rounded-[var(--rcard)] border border-line bg-panel px-8 py-10 text-center"
        role="status"
      >
        <div className="font-display text-[22px] font-semibold text-text-strong">
          Thanks — that&apos;s landed.
        </div>
        <p className="mt-2 text-[14.5px] leading-[1.6] text-muted">
          I read everything that comes through here and usually reply within a
          couple of days.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto mt-10 max-w-[560px] text-left"
      noValidate
    >
      {/* Honeypot — off-screen rather than display:none, which some bots skip. */}
      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Leave this field empty</label>
        <input
          id="contact-website"
          name={HONEYPOT_FIELD}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="contact-name">
            Name *
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            autoComplete="name"
            maxLength={FIELD_MAX.name}
            placeholder="Jane Doe"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="contact-email">
            Email *
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            maxLength={FIELD_MAX.email}
            placeholder="jane@company.com"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="contact-company">
            Company
          </label>
          <input
            id="contact-company"
            name="company"
            type="text"
            autoComplete="organization"
            maxLength={FIELD_MAX.company}
            placeholder="Optional"
            className={FIELD_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} htmlFor="contact-timeline">
            Timeline
          </label>
          <input
            id="contact-timeline"
            name="timeline"
            type="text"
            maxLength={FIELD_MAX.timeline}
            placeholder="e.g. starting in Q4"
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className={LABEL_CLASS} htmlFor="contact-project-type">
          What are you looking for?
        </label>
        <select
          id="contact-project-type"
          name="projectType"
          defaultValue=""
          className={`${FIELD_CLASS} appearance-none`}
        >
          <option value="">Choose one — optional</option>
          {PROJECT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4">
        <label className={LABEL_CLASS} htmlFor="contact-message">
          Message *
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          maxLength={FIELD_MAX.message}
          placeholder="A little about the team, the problem, and what you'd want me on."
          className={`${FIELD_CLASS} resize-y leading-[1.6]`}
        />
      </div>

      {error && (
        <p
          className="mt-4 rounded-xl border border-[#4a2530] bg-[#1c1216] px-3.5 py-2.5 text-[13.5px] text-[#f0a8b4]"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-3">
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-full bg-[#e9e9ee] px-6 py-[13px] text-[14.5px] font-semibold text-[#0a0a0c] transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "sending" ? "Sending…" : "Send message"}
        </button>
        <span className="text-[13.5px] text-dim">
          or email{" "}
          <a
            href={workMailto("home")}
            className="text-muted underline underline-offset-2 transition-colors hover:text-text"
          >
            {CONTACT_EMAIL}
          </a>
        </span>
      </div>
    </form>
  );
}
