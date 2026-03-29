import * as cheerio from "cheerio";
import { chunkText, normalizeWhitespace } from "@/lib/chunker";
import { ATOME_CARD_KB_FALLBACK } from "@/data/atome-card-kb";

export type ScrapedArticle = {
  title: string;
  url: string;
  text: string;
};

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://www.google.com/",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return await res.text();
}

function toAbsoluteUrl(baseUrl: string, href: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function extractText($: cheerio.CheerioAPI): string {
  const candidates = [
    "main",
    "article",
    ".article-body",
    ".article",
    ".section-tree",
    ".category-page",
    ".container",
    "body",
  ];

  for (const selector of candidates) {
    const text = normalizeWhitespace($(selector).first().text());
    if (text.length > 80) return text;
  }

  return normalizeWhitespace($("body").text());
}

export async function scrapeKnowledgeBase(rootUrl: string): Promise<ScrapedArticle[]> {
  try {
    const rootHtml = await fetchHtml(rootUrl);
    const $ = cheerio.load(rootHtml);

    const discoveredLinks = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const abs = toAbsoluteUrl(rootUrl, href);
      if (!abs) return;

      if (
        abs.includes("/hc/") &&
        !abs.includes("#") &&
        !abs.includes("/community/") &&
        !abs.includes("/requests/")
      ) {
        discoveredLinks.add(abs);
      }
    });

    discoveredLinks.add(rootUrl);

    const urls = Array.from(discoveredLinks).slice(0, 30);
    const articles: ScrapedArticle[] = [];

    for (const url of urls) {
      try {
        const html = await fetchHtml(url);
        const page = cheerio.load(html);

        const title =
          normalizeWhitespace(page("h1").first().text()) ||
          normalizeWhitespace(page("title").first().text()) ||
          "Untitled";

        const text = extractText(page);

        if (text.length < 80) continue;

        articles.push({ title, url, text });
      } catch (err) {
        console.error(`Failed scraping page ${url}`, err);
      }
    }

    if (articles.length > 0) {
      return articles;
    }

    return ATOME_CARD_KB_FALLBACK;
  } catch (err) {
    console.error("Live KB scrape failed, using fallback KB.", err);
    return ATOME_CARD_KB_FALLBACK;
  }
}

export function articleToChunks(article: ScrapedArticle) {
  return chunkText(article.text, 900, 120).map((content) => ({
    title: article.title,
    sourceUrl: article.url,
    content,
  }));
}