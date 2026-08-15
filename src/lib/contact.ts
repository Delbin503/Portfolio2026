// Client-safe contact config. Kept out of lib/data.ts because that module
// imports `fs` for server-side content loading and can't be bundled for the
// browser.
//
// Inbound mail from this site is routed to a Gmail plus-address
// (delbinhtet+work@gmail.com) so a single Gmail filter on the To: header can
// label every website inquiry as work. The tag travels in the envelope, so —
// unlike a subject line — the sender can't accidentally strip it. The address
// shown on screen stays the clean one; only the href carries the tag.

/** The address shown to visitors. Also the canonical one in content/data.json. */
export const CONTACT_EMAIL = "delbinhtet@gmail.com";

/** Gmail plus-tag that inbound site mail is filtered on. */
const INBOX_TAG = "work";

/** Where mail from the site is actually addressed. Filter Gmail on this. */
export const CONTACT_EMAIL_TAGGED = CONTACT_EMAIL.replace("@", `+${INBOX_TAG}@`);

/** Which surface the visitor was on when they decided to write. */
export type InquirySource = "home" | "case-study" | "assistant";

const SOURCE_LABEL: Record<InquirySource, string> = {
  home: "from your homepage",
  "case-study": "from a case study",
  assistant: "via your site assistant",
};

/**
 * Prompts sent as the mail body so inquiries arrive with the details that
 * decide whether a project is a fit. Avoid parentheses — the assistant's
 * markdown link renderer terminates an href at the first ")".
 */
const BODY_TEMPLATE = [
  "Hi Delbin,",
  "",
  "Company / team:",
  "Role or project:",
  "Timeline:",
  "Budget range:",
  "",
  "What we're looking for:",
  "",
].join("\r\n");

/* ── Contact form ────────────────────────────────────────────────── */

/** Where the inline contact form POSTs. */
export const CONTACT_ENDPOINT = "/api/contact";

/** Shape shared by the form component and the /api/contact route. */
export type Inquiry = {
  name: string;
  email: string;
  company: string;
  projectType: string;
  timeline: string;
  message: string;
};

export const PROJECT_TYPES = [
  "Full-time role",
  "Contract — 3 to 6 months",
  "Freelance project",
  "Design system work",
  "Something else",
] as const;

/**
 * Per-field caps, enforced on both sides: the form sets maxLength so people
 * see the limit, the route re-checks it because a client can post anything.
 */
export const FIELD_MAX: Record<keyof Inquiry, number> = {
  name: 100,
  email: 200,
  company: 120,
  projectType: 60,
  timeline: 60,
  message: 4000,
};

/** Bots fill every input they find; humans never see this one. */
export const HONEYPOT_FIELD = "website";

/**
 * Percent-encodes a mailto query value. encodeURIComponent leaves "(" and ")"
 * alone, which would break the markdown link regex in AskAI, so escape those too.
 */
function encodeParam(value: string): string {
  return encodeURIComponent(value).replace(/\(/g, "%28").replace(/\)/g, "%29");
}

/**
 * Builds the mailto href for a work inquiry: tagged recipient, a subject that
 * names the surface it came from, and a short body skeleton.
 */
export function workMailto(source: InquirySource): string {
  const subject = `Work inquiry — ${SOURCE_LABEL[source]}`;
  return (
    `mailto:${CONTACT_EMAIL_TAGGED}` +
    `?subject=${encodeParam(subject)}` +
    `&body=${encodeParam(BODY_TEMPLATE)}`
  );
}
