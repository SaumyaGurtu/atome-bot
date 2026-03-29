import { NextResponse } from "next/server";
import { scrapeKnowledgeBase, articleToChunks } from "@/lib/kb";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  try {
    const config = await prisma.botConfig.findFirst();

    if (!config) {
      return NextResponse.json(
        { error: "Bot config not found" },
        { status: 404 }
      );
    }

    const articles = await scrapeKnowledgeBase(config.knowledgeBaseUrl);
    const chunks = articles.flatMap(articleToChunks);

    await prisma.knowledgeChunk.deleteMany({
      where: { botConfigId: config.id },
    });

    if (chunks.length > 0) {
      await prisma.knowledgeChunk.createMany({
        data: chunks.map((chunk) => ({
          botConfigId: config.id,
          sourceUrl: chunk.sourceUrl,
          title: chunk.title,
          content: chunk.content,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      articleCount: articles.length,
      chunkCount: chunks.length,
    });
  } catch (error) {
    console.error("Reindex failed", error);
    return NextResponse.json(
      { error: "Reindex failed" },
      { status: 500 }
    );
  }
}