import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getArticle, getSnapshot, getDailyMeme } from "@/lib/database/queries";
import { NEWCASTLE_ID, SUNDERLAND_ID } from "@/lib/football/provider";
import { clubView, miseryView, ordinal, tyneView } from "@/lib/view";

export const runtime = "nodejs";
export const revalidate = 300;

const W = 1200, H = 630;
const INK = "#050607", CHALK = "#f4f4f0", RED = "#e0161f", SILVER = "#a7aeb7";

function Frame({ mackem = false, kicker, children }: { mackem?: boolean; kicker: string; children: React.ReactNode }) {
  const stripes = Array.from({ length: 60 });
  return (
    <div style={{ width: W, height: H, display: "flex", flexDirection: "column", background: INK, color: CHALK, fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", height: 16 }}>
        {stripes.map((_, i) => (
          <div key={i} style={{ width: 20, height: 16, background: i % 2 ? (mackem ? CHALK : INK) : mackem ? RED : CHALK }} />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "28px 56px 0" }}>
        <div style={{ display: "flex", background: mackem ? RED : CHALK, color: mackem ? CHALK : INK, padding: "6px 18px", fontSize: 28, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>{kicker}</div>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 900, fontStyle: "italic", letterSpacing: -1 }}>
          HOWAY<span style={{ color: SILVER }}>STATS</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "10px 56px", justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 56px 30px", fontSize: 22, color: SILVER, textTransform: "uppercase", letterSpacing: 3 }}>
        <span>The numbers don&apos;t lie.</span>
        <span>Real stats · fictional tears</span>
      </div>
    </div>
  );
}

const Big = ({ v, color = CHALK, size = 230 }: { v: string; color?: string; size?: number }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, lineHeight: 0.9, color, letterSpacing: -8 }}>{v}</div>
);
const Line = ({ t, size = 54, color = CHALK }: { t: string; size?: number; color?: string }) => (
  <div style={{ display: "flex", fontSize: size, fontWeight: 900, textTransform: "uppercase", lineHeight: 1, color, letterSpacing: -1 }}>{t}</div>
);

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "home";
  const download = req.nextUrl.searchParams.get("download") === "1";
  const s = await getSnapshot();
  let el: React.ReactElement;

  const safc = clubView(s, SUNDERLAND_ID);
  const nufc = clubView(s, NEWCASTLE_ID);

  const fxId = Number(req.nextUrl.searchParams.get("fixture"));
  const fx = type === "result" ? s.fixtures.find((f) => f.id === fxId && f.status === "finished") : undefined;

  if (fx) {
    const sunGame = fx.homeId === SUNDERLAND_ID || fx.awayId === SUNDERLAND_ID;
    const nm = (id: number) => s.clubs.get(id)?.shortName ?? "";
    el = (
      <Frame mackem={sunGame} kicker="Full time">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Line t={nm(fx.homeId)} size={64} />
          <Big v={`${fx.homeGoals}-${fx.awayGoals}`} size={190} color={sunGame ? RED : CHALK} />
          <Line t={nm(fx.awayId)} size={64} />
        </div>
        {sunGame && safc && <Line t={`Sunderland now ${ordinal(safc.row.position)}${safc.pred ? ` · ${(safc.pred.pRelegation * 100).toFixed(0)}% to go down` : ""}`} size={40} color={SILVER} />}
        {!sunGame && nufc && <Line t={`Newcastle now ${ordinal(nufc.row.position)} · ${nufc.row.points} pts`} size={40} color={SILVER} />}
      </Frame>
    );
  } else if (type === "relegation" && safc?.pred) {
    el = (
      <Frame mackem kicker="Sunderland relegation watch">
        <Line t="Relegation probability" size={46} color={SILVER} />
        <Big v={`${(safc.pred.pRelegation * 100).toFixed(0)}%`} color={RED} size={260} />
        <Line t={`${ordinal(safc.row.position)} · ${safc.row.points} pts · projected ${ordinal(safc.pred.projectedPosition)}`} size={42} />
      </Frame>
    );
  } else if ((type === "misery" || type === "jar") && miseryView(s)) {
    const m = miseryView(s)!;
    el =
      type === "misery" ? (
        <Frame mackem kicker="Mackem Misery Index">
          <Big v={`${m.score}`} color={RED} size={280} />
          <Line t={m.label} size={52} />
          {m.biggest && <Line t={`Biggest mover: ${m.biggest}`} size={30} color={SILVER} />}
        </Frame>
      ) : (
        <Frame mackem kicker="The Mackem Tear Jar">
          <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end", width: 210, height: 330, border: `6px solid ${CHALK}`, borderTop: "none", background: "rgba(255,255,255,.04)" }}>
              <div style={{ display: "flex", height: `${Math.max(2, m.jar.percent)}%`, background: RED }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <Big v={`${m.jar.percent.toFixed(0)}%`} size={210} />
              <Line t="full" size={50} color={SILVER} />
              <div style={{ display: "flex", marginTop: 18, fontSize: 36, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.05 }}>{`${m.jar.dropped} of ${m.jar.capacity} points dropped`}</div>
            </div>
          </div>
        </Frame>
      );
  } else if (type === "tyne" && tyneView(s)) {
    const t = tyneView(s)!;
    el = (
      <Frame kicker="Who owns the North East?">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column" }}><Line t="Newcastle" size={56} /><Big v={`${t.score.scoreA}`} size={240} /></div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}><Line t="Sunderland" size={56} color={RED} /><Big v={`${t.score.scoreB}`} size={240} color={RED} /></div>
        </div>
        <div style={{ display: "flex", height: 34, marginTop: 10 }}>
          <div style={{ display: "flex", width: `${t.score.scoreA}%`, background: CHALK }} />
          <div style={{ display: "flex", flex: 1, background: RED }} />
        </div>
      </Frame>
    );
  } else if (type === "newcastle" && nufc) {
    el = (
      <Frame kicker="Newcastle United">
        <Big v={ordinal(nufc.row.position)} size={240} />
        <Line t={`${nufc.row.points} points · form ${nufc.row.form.join("") || "—"}`} size={48} />
        {nufc.pred && <Line t={`Top-six chance ${(nufc.pred.pTop6 * 100).toFixed(0)}% · Howay the lads`} size={36} color={SILVER} />}
      </Frame>
    );
  } else if (type === "news") {
    const a = await getArticle(req.nextUrl.searchParams.get("slug") ?? "");
    el = a ? (
      <Frame mackem={a.club === "sunderland"} kicker="Mackem Newsroom">
        <div style={{ display: "flex", fontSize: 76, fontWeight: 900, textTransform: "uppercase", lineHeight: 0.95, letterSpacing: -2 }}>{a.howayHeadline ?? a.originalHeadline}</div>
        <div style={{ display: "flex", marginTop: 26, fontSize: 26, color: SILVER }}>Original: {a.originalHeadline} — {a.source}</div>
      </Frame>
    ) : (
      <Frame kicker="Mackem Newsroom"><Line t="Story not found" /></Frame>
    );
  } else if (type === "meme") {
    const d = await getDailyMeme();
    el = (
      <Frame mackem kicker="The Mackem Crying Room">
        <div style={{ display: "flex", fontSize: 70, fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>{d?.meme.caption ?? d?.meme.title ?? "Meme of the day"}</div>
        {d && <div style={{ display: "flex", marginTop: 20, fontSize: 26, color: SILVER }}>Credit: {d.meme.author ?? d.meme.source}</div>}
      </Frame>
    );
  } else {
    el = (
      <Frame kicker="Premier League · Geordie perspective">
        <Big v="HOWAYSTATS" size={170} />
        <Line t="Premier League statistics. Mackem misery." size={46} color={SILVER} />
        {nufc && safc && <Line t={`Newcastle ${ordinal(nufc.row.position)} · Sunderland ${ordinal(safc.row.position)}`} size={44} />}
      </Frame>
    );
  }

  const res = new ImageResponse(el, { width: W, height: H });
  if (download) res.headers.set("content-disposition", `attachment; filename="howaystats-${type}.png"`);
  return res;
}
