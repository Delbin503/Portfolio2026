import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getProfile } from "@/lib/data";

/**
 * Link-preview card for the site root — what renders when the URL is pasted
 * into iMessage, Slack, LinkedIn, X, WhatsApp, etc.
 *
 * Rendered by Satori, which supports only a subset of CSS: every element that
 * has children needs an explicit `display: flex`, and fonts must be TTF/OTF/
 * WOFF (the .woff2 that next/font emits will not parse). The two faces are
 * committed under _og-assets so the build never depends on the network.
 */
export const alt = "Delbin (Toe Htet Arkar) — Product Designer, AI & Enterprise";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const profile = getProfile();
  const [display, body] = await Promise.all([
    readFile(join(process.cwd(), "src/app/_og-assets/FamiljenGrotesk-Bold.ttf")),
    readFile(join(process.cwd(), "src/app/_og-assets/HankenGrotesk-Regular.ttf")),
  ]);

  // The full name only appears inside the bio ("I'm Delbin (Toe Htet Arkar), …"),
  // never in profile.name — so the second display line is parsed from there.
  const line1 = profile.name.trim();
  const line2 = (profile.bio.match(/\(([^)]+)\)/)?.[1] ?? "").trim();

  // Second sentence of the bio — the first just restates the name/role.
  const sentences = profile.bio.split(/(?<=\.)\s+/);
  const blurb = (sentences[1] ?? sentences[0] ?? "").trim();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px 72px",
          backgroundColor: "#08080a",
          // Purple bloom off the top-right, as in the reference.
          backgroundImage:
            "radial-gradient(1100px 780px at 88% 12%, #7c3aed 0%, rgba(88,42,168,0.55) 32%, rgba(20,12,40,0.35) 58%, rgba(8,8,10,0) 78%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Display",
            lineHeight: 0.88,
            letterSpacing: "-0.03em",
            textTransform: "uppercase",
            color: "#8b5cf6",
          }}
        >
          <div style={{ display: "flex", fontSize: 150 }}>{line1}</div>
          {line2 ? (
            // Sized down so the longer second line still clears the 1056px
            // content width instead of overflowing the card.
            <div style={{ display: "flex", fontSize: 104, color: "#a78bfa" }}>
              {line2}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 34,
            fontFamily: "Body",
            fontSize: 27,
            color: "#c9b7f5",
          }}
        >
          {profile.role} · AI &amp; Enterprise
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 20,
            maxWidth: 985,
            fontFamily: "Body",
            fontSize: 27,
            lineHeight: 1.45,
            color: "#b9a6ee",
          }}
        >
          {blurb}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Display", data: display, style: "normal", weight: 700 },
        { name: "Body", data: body, style: "normal", weight: 400 },
      ],
    }
  );
}
