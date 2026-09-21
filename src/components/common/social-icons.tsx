// lucide-react dropped brand/logo glyphs; these are minimal inline replacements.
import type { SVGProps } from "react";

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.5 21v-7.5H16l.4-3H13.5V8.4c0-.87.24-1.46 1.5-1.46H16.5V4.34C16.2 4.3 15.2 4.2 14 4.2c-2.4 0-4 1.47-4 4.16V10.5H7.5v3H10V21h3.5Z" />
    </svg>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function LinkedInIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.94 8.5H4V20h2.94V8.5ZM5.47 4a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4ZM20 13.34c0-3.1-1.66-4.54-3.87-4.54-1.79 0-2.59.98-3.04 1.67V8.5H10.15c.04.86 0 12 0 12h2.94v-6.7c0-.36.03-.72.13-.98.29-.72.95-1.47 2.06-1.47 1.45 0 2.03 1.11 2.03 2.73V20H20v-6.66Z" />
    </svg>
  );
}

export function XIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M13.9 10.9 20.3 3.5h-1.9l-5.6 6.4-4.4-6.4H3l6.7 9.7L3 21h1.9l5.9-6.8 4.7 6.8H21l-7.1-10.1Zm-2.1 2.4-.7-1L5.8 4.9h2.1l4.4 6.3.7 1 5.7 8.1h-2.1l-4.7-6.9Z" />
    </svg>
  );
}
