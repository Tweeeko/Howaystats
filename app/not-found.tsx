import Link from "next/link";
import { EMPTY } from "@/lib/voice";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24">
      <div className="kicker">404</div>
      <h1 className="tabloid mt-2 text-7xl">Page relegated.</h1>
      <p className="mt-3 text-mist">{EMPTY.notFound}</p>
      <Link href="/" className="display mt-6 inline-block bg-chalk px-5 py-2 text-xl text-ink">Back to the Toon</Link>
    </div>
  );
}
