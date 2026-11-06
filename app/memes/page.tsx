import type { Metadata } from "next";
import { getDailyMeme, getMemes } from "@/lib/database/queries";
import { MemeFrame } from "@/components/editorial";
import { Divider, SectionTitle } from "@/components/stadium";
import { SubmitMeme } from "./submit";

export const revalidate = 300;
export const metadata: Metadata = { title: "The Terrace", description: "Sunderland memes from sources that allow it, always credited, plus whatever you lot hand in." };

export default async function Memes() {
  const [daily, latest, popular, community] = await Promise.all([getDailyMeme(), getMemes({ limit: 12 }), getMemes({ sort: "popular", limit: 6 }), getMemes({ source: "community", limit: 6 })]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
            <h1 className="tabloid text-[clamp(3.2rem,10vw,7rem)]">The Terrace</h1>
      <p className="serif mt-2 max-w-2xl text-xl text-mist">Memes about the neighbours. Every one credited to whoever made it. Got a better one? Hand it in.</p>
      <Divider />
      <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <SectionTitle title="Today's pick" mackem />
          {daily ? <MemeFrame m={daily.meme} featured fromArchive={daily.fromArchive} /> : <div className="panel p-6 text-mist">Nowt on the wall yet. Be the first.</div>}
        </div>
        <div>
          <SectionTitle title="Hand one in" />
          <SubmitMeme />
        </div>
      </div>
      {latest.length > 0 && (
        <>
          <Divider />
          <SectionTitle title="Latest" mackem />
          <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
            {latest.map((m) => <div key={m.id} id={m.id}><MemeFrame m={m} /></div>)}
          </div>
        </>
      )}
      {popular.length > 0 && (
        <>
          <Divider />
          <SectionTitle title="Most shared" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{popular.map((m) => <MemeFrame key={m.id} m={m} />)}</div>
        </>
      )}
      {community.length > 0 && (
        <>
          <Divider />
          <SectionTitle title="From you lot" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{community.map((m) => <MemeFrame key={m.id} m={m} />)}</div>
        </>
      )}
    </div>
  );
}
