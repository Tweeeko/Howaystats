export const SITE = {
  name: "HOWAYSTATS",
  tagline: "Written on the Tyne. Taking the piss on the Wear.",
  secondary: "Newcastle United, the Premier League, and whatever Sunderland have done this week.",
  creator: "Leeko",
  disclaimer:
    "HOWAYSTATS is an unofficial fan site, made for laughs. 18+ (there's swearing). Nowt to do with Newcastle United, Sunderland AFC or the Premier League. Scores and stats are real. The opinions are very much ours.",
};

export const NAV = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/news", label: "News", short: "News" },
  { href: "/mackem-watch", label: "Mackem Watch", short: "Mackems" },
  { href: "/newcastle", label: "The Toon", short: "Toon" },
  { href: "/tyne", label: "The Derby", short: "Derby" },
  { href: "/premier-league", label: "Table", short: "Table" },
];

/** Bottom bar on phones. */
export const BOTTOM_NAV = ["/", "/news", "/mackem-watch", "/newcastle", "/premier-league"];

/**
 * Hero photograph: "Newcastle st-james-park stadium.jpg" by Arne Müseler (arne-mueseler.com),
 * Wikimedia Commons, licensed CC BY-SA 3.0 DE. Displayed darkened (an adaptation), credited in the footer.
 * Override with NEXT_PUBLIC_HERO_IMAGE (e.g. /stadium.jpg in /public) if you license a different photo.
 */
const WM = "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Newcastle_st-james-park_stadium.jpg";
const wm = (w: number) => `${WM}/${w}px-Newcastle_st-james-park_stadium.jpg`;

export const HERO_IMAGE = {
  // Wikimedia only serves standard thumbnail widths (20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840).
  // Anything else gets HTTP 429, which is what blacked out the old 2560px background.
  src: process.env.NEXT_PUBLIC_HERO_IMAGE || wm(1280),
  srcSet: process.env.NEXT_PUBLIC_HERO_IMAGE ? undefined : `${wm(960)} 960w, ${wm(1280)} 1280w, ${wm(1920)} 1920w`,
  credit: "St James' Park by Arne Müseler / arne-mueseler.com",
  creditUrl: "https://commons.wikimedia.org/wiki/File:Newcastle_st-james-park_stadium.jpg",
  licence: "CC BY-SA 3.0 DE",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
};
