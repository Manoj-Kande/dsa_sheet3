import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, UnauthorizedError } from "@/lib/services/current-user";
import { DATASET } from "@/lib/data/dataset";
import { computeBadges, BadgeStats } from "@/lib/badges";

type ProgressRow = { problemSlug: string; status: string; solvedAt: Date | null; updatedAt: Date; reviewCount: number | null };

function handleError(err: unknown) {
  if (err instanceof UnauthorizedError) return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  console.error("[analytics]", err);
  return NextResponse.json({ data: null, error: { code: "INTERNAL" } }, { status: 500 });
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const [rows, streak] = await Promise.all([
      prisma.userProgress.findMany({ where: { userId: user.id }, select: { problemSlug: true, status: true, solvedAt: true, updatedAt: true, reviewCount: true } }) as Promise<ProgressRow[]>,
      prisma.userStreak.findUnique({ where: { userId: user.id } }),
    ]);

    const problemMap = new Map(DATASET.problems.map(p => [p.slug, p]));
    const topicTotals: Record<string, number> = {};
    DATASET.problems.forEach(p => { topicTotals[p.topic] = (topicTotals[p.topic] ?? 0) + 1; });

    const heatmap: Record<string, number> = {};
    const byTopic: Record<string, { solved: number; attempted: number; total: number }> = {};
    const byDifficulty = { Easy: { solved: 0, total: 0 }, Medium: { solved: 0, total: 0 }, Hard: { solved: 0, total: 0 } };
    const weekly: Record<string, number> = {};
    const recentSolved: { slug: string; solvedAt: string }[] = [];

    Object.entries(topicTotals).forEach(([t, total]) => { byTopic[t] = { solved: 0, attempted: 0, total }; });
    DATASET.problems.forEach(p => { const d = p.difficulty as keyof typeof byDifficulty; if (byDifficulty[d]) byDifficulty[d].total++; });

    rows.forEach((r: ProgressRow) => {
      const date = (r.solvedAt ?? r.updatedAt).toISOString().slice(0, 10);
      heatmap[date] = (heatmap[date] ?? 0) + 1;
      const p = problemMap.get(r.problemSlug);
      if (p) {
        if (!byTopic[p.topic]) byTopic[p.topic] = { solved: 0, attempted: 0, total: topicTotals[p.topic] ?? 0 };
        const t = byTopic[p.topic];
        if (t) {
          if (r.status === "SOLVED") { t.solved++; const d = p.difficulty as keyof typeof byDifficulty; if (byDifficulty[d]) byDifficulty[d].solved++; }
          else if (r.status === "ATTEMPTED") t.attempted++;
        }
      }
      if (r.status === "SOLVED") {
        const d = new Date(r.solvedAt ?? r.updatedAt);
        const dow = d.getUTCDay();
        const mon = new Date(d); mon.setUTCDate(d.getUTCDate() - (dow === 0 ? 6 : dow - 1));
        weekly[mon.toISOString().slice(0, 10)] = (weekly[mon.toISOString().slice(0, 10)] ?? 0) + 1;
        if (r.solvedAt) recentSolved.push({ slug: r.problemSlug, solvedAt: r.solvedAt.toISOString() });
      }
    });

    recentSolved.sort((a, b) => b.solvedAt.localeCompare(a.solvedAt));
    const solved = rows.filter((r: ProgressRow) => r.status === "SOLVED");
    const topicsCompleted = Object.values(byTopic).filter(t => t.total > 0 && t.solved === t.total).length;
    const badgeStats: BadgeStats = {
      totalSolved: solved.length,
      currentStreak: streak?.currentStreak ?? 0, longestStreak: streak?.longestStreak ?? 0,
      easySolved:   solved.filter((r: ProgressRow) => problemMap.get(r.problemSlug)?.difficulty === "Easy").length,
      mediumSolved: solved.filter((r: ProgressRow) => problemMap.get(r.problemSlug)?.difficulty === "Medium").length,
      hardSolved:   solved.filter((r: ProgressRow) => problemMap.get(r.problemSlug)?.difficulty === "Hard").length,
      topicsCompleted,
    };
    return NextResponse.json({ data: {
      totalSolved: badgeStats.totalSolved,
      totalAttempted: rows.filter((r: ProgressRow) => r.status === "ATTEMPTED").length,
      totalRevisit:   rows.filter((r: ProgressRow) => r.status === "REVISIT").length,
      currentStreak: badgeStats.currentStreak, longestStreak: badgeStats.longestStreak,
      heatmap, byTopic, byDifficulty, recentSolved: recentSolved.slice(0, 10), weekly,
      badges: computeBadges(badgeStats),
    }, error: null });
  } catch (err) { return handleError(err); }
}
