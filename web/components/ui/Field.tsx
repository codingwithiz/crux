import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Text entry, in one place.
 *
 * The same ninety-character class string was pasted fourteen times, in two
 * inconsistent surface treatments that appeared two steps apart in the same
 * flow, plus private copies inside the Studio and the conviction flow.
 *
 * `text-base` below `sm` is not a style choice: iOS zooms the viewport on focus
 * for any field under 16px and never zooms back out, which made every text field
 * in the Studio a one-way trip.
 */
const BASE =
  "w-full rounded-control border border-line bg-ink px-3 py-2 text-base outline-none transition focus:border-accent sm:text-sm";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={`${BASE} ${className}`} />;
}

export function Textarea({
  className = "",
  ...rest
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={`${BASE} resize-y ${className}`} />;
}
