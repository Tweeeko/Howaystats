import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getArticle } from "@/lib/database/queries";
import { NewsStory } from "@/components/editorial";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Story not found" };
  const og = `/api/og?type=news&slug=${slug}`;
  return {
    title: a.howayHeadline ?? a.originalHeadline,
    description: `Original: ${a.originalHeadline} (${a.source})`,
    openGraph: { type: "article", publishedTime: a.publishedAt ?? undefined, images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) notFound();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "OpinionNewsArticle",
    headline: a.howayHeadline ?? a.originalHeadline,
    datePublished: a.publishedAt,
    isBasedOn: a.url,
    publisher: { "@type": "Organization", name: "HOWAYSTATS" },
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href="/news" className="kicker hover:underline">← Mackem Newsroom</Link>
      <div className="mt-4"><NewsStory a={a} lead /></div>
      <p className="mt-4 text-xs text-silver">HOWAYSTATS commentary is original satire based only on the publisher&apos;s headline and summary. For the full facts, read the original at {a.source}.</p>
    </div>
  );
}
