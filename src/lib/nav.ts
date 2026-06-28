// Client-safe navigation config. Kept out of lib/data.ts because that module
// imports `fs` for server-side content loading and can't be bundled for the browser.
export type NavLink = { href: string; label: string };

export const navLinks: NavLink[] = [
  { href: "#about", label: "About" },
  { href: "#work", label: "Work" },
  { href: "#experience", label: "Experience" },
];
