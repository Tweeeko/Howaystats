export const SITE = {
  name: "HOWAYSTATS",
  tagline: "The numbers don't lie.",
  secondary: "Premier League statistics. Geordie perspective. Mackem misery.",
  creator: "Leeko",
  disclaimer:
    "HOWAYSTATS is an independent fan entertainment website. Not affiliated with Newcastle United FC, Sunderland AFC, the Premier League or any official organisation. Statistics are real; tears are fictional.",
};

export const NAV = [
  { href: "/", label: "Home", short: "Home" },
  { href: "/premier-league", label: "Premier League", short: "Table" },
  { href: "/newcastle", label: "Newcastle United", short: "Toon" },
  { href: "/mackem-watch", label: "Sunderland Watch", short: "Mackems" },
  { href: "/tyne", label: "Tyne v Wear", short: "Tyne v Wear" },
  { href: "/news", label: "News", short: "News" },
  { href: "/memes", label: "Memes", short: "Memes" },
  { href: "/match-centre", label: "Match Centre", short: "Live" },
];

/** Bottom bar on phones: the five places people actually go. */
export const BOTTOM_NAV = ["/", "/premier-league", "/mackem-watch", "/newcastle", "/match-centre"];

/**
 * Hero photograph: "Newcastle st-james-park stadium.jpg" by Arne Müseler (arne-mueseler.com),
 * Wikimedia Commons, licensed CC BY-SA 3.0 DE. Displayed blurred/darkened (an adaptation) — credited in the footer.
 * Override with NEXT_PUBLIC_HERO_IMAGE (e.g. /stadium.jpg in /public) if you license a different photo.
 */
export const HERO_IMAGE = {
  src:
    process.env.NEXT_PUBLIC_HERO_IMAGE ||
    "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Newcastle_st-james-park_stadium.jpg/2560px-Newcastle_st-james-park_stadium.jpg",
  credit: "St James' Park aerial by Arne Müseler / arne-mueseler.com",
  creditUrl: "https://commons.wikimedia.org/wiki/File:Newcastle_st-james-park_stadium.jpg",
  licence: "CC BY-SA 3.0 DE",
  licenceUrl: "https://creativecommons.org/licenses/by-sa/3.0/de/deed.en",
};
