"use client";
import { useState } from "react";

/** Publisher photo. If it doesn't load (hotlink block, dead link), the slot disappears rather than showing a broken box. */
export function StoryImage({ src, className = "" }: { src: string | null; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!src || !ok) return null;
  return (
    <div className={`overflow-hidden bg-steel ${className}`}>
      <img src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setOk(false)} className="h-full w-full object-cover" />
    </div>
  );
}
