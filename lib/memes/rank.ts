/**
 * "Most traction" from what GIPHY tells us: trending recently counts most, then how high it
 * ranks in search (popularity-weighted), then how new it is. Club GIFs beat generic reactions.
 */
export function tractionScore(o: { club: boolean; rank: number; trendedAt: number; ageDays: number }) {
  const trendDays = o.trendedAt ? (Date.now() - o.trendedAt) / 86_400_000 : Infinity;
  const trending = trendDays <= 30 ? 100 : trendDays <= 180 ? 60 : Number.isFinite(trendDays) ? 30 : 0;
  const rank = Math.max(0, 50 - o.rank) ; // top of search = most popular
  const fresh = Math.max(0, 40 - o.ageDays / 15);
  return Math.round(trending + rank + fresh + (o.club ? 40 : 0));
}
