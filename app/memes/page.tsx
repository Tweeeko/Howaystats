import type { Metadata } from "next";
import { getDailyMeme, getMemes } from "@/lib/database/queries";
import { MemeFrame } from "@/components/editorial";
import { PitchDivider, SectionHead } from "@/components/stadium";
import { SubmitMeme } from "./submit";

export const revalidate = 300;
export const metadata: Metadata = { title: "The Mackem Crying Room", description: "Daily Sunderland memes from permitted sources, always credited — plus community submissions." };

export default async function Memes() {
  const [daily, latest, popular, community] = await Promise.all([getDailyMeme(), getMemes({ limit: 12 }), getMemes({ sort: "popular", limit: 6 }), getMemes({ source: "community", limit: 6 })]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="stripe-bar mackem mb-4" />
      <h1 className="tabloid text-[clamp(3.2rem,10vw,8rem)]">The Mackem <span className="text-mackem">Crying Room</span></h1>
      <p className="mt-2 max-w-2xl text-mist">Refreshed daily from sources that allow it. Every meme is credited and linked to where it came from. If nothing new turns up, you get the best of the archive — never a fake.</p>
      <PitchDivider />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionHead title="Meme of the Day" mackem />
          {daily ? <MemeFrame m={daily.meme} featured fromArchive={daily.fromArchive} /> : <div className="panel seats p-6 text-mist">No approved memes yet. The daily job is on it.</div>}
        </div>
        <div>
          <SectionHead title="Hand One In" sub="Community submissions" />
          <SubmitMeme />
        </div>
      </div>
      {latest.length > 0 && (
        <>
          <PitchDivider />
          <SectionHead title="Latest" mackem />
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {latest.map((m) => <div key={m.id} id={m.id}><MemeFrame m={m} /></div>)}
          </div>
        </>
      )}
      {popular.length > 0 && (
        <>
          <PitchDivider />
          <SectionHead title="Most Shared" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{popular.map((m) => <MemeFrame key={m.id} m={m} />)}</div>
        </>
      )}
      {community.length > 0 && (
        <>
          <PitchDivider />
          <SectionHead title="From the Terraces" sub="Approved community submissions" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{community.map((m) => <MemeFrame key={m.id} m={m} />)}</div>
        </>
      )}
    </div>
  );
}
