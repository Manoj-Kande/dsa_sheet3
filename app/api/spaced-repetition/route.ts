import { rateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { ok, err, handleApiError } from "@/lib/api-response";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, UnauthorizedError } from "@/lib/services/current-user";
import { DATASET } from "@/lib/data/dataset";

function handleError(err: unknown) {
  if (err instanceof UnauthorizedError)
    return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED" } }, { status: 401 });
  return NextResponse.json({ data: null, error: { code: "INTERNAL" } }, { status: 500 });
}

// SM-2 inspired intervals in days
const INTERVALS = [1, 3, 7, 14, 30, 60];

function nextReviewDate(solvedAt: Date, reviewCount: number): Date {
  const days = INTERVALS[Math.min(reviewCount, INTERVALS.length - 1)];
  const d = new Date(solvedAt);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    const rows = await prisma.userProgress.findMany({
      where: { userId: user.id, status: "SOLVED" },
      select: { problemSlug: true, solvedAt: true, updatedAt: true, reviewCount: true },
    });

    const now = new Date();
    const problemMap = new Map(DATASET.problems.map(p => [p.slug, p]));

    const due = rows
      .map(r => {
        const prob = problemMap.get(r.problemSlug);
        if (!prob) return null;
        const solvedDate = r.solvedAt ?? r.updatedAt;
        const reviewDate = nextReviewDate(solvedDate, r.reviewCount ?? 0);
        const overdueDays = Math.floor((now.getTime() - reviewDate.getTime()) / 86400000);
        return { slug: r.problemSlug, title: prob.title, difficulty: prob.difficulty, topic: prob.topic, reviewDate: reviewDate.toISOString(), overdueDays, reviewCount: r.reviewCount ?? 0 };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.overdueDays >= 0)
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .slice(0, 20);

    const upcoming = rows
      .map(r => {
        const prob = problemMap.get(r.problemSlug);
        if (!prob) return null;
        const solvedDate = r.solvedAt ?? r.updatedAt;
        const reviewDate = nextReviewDate(solvedDate, r.reviewCount ?? 0);
        const daysUntil = Math.ceil((reviewDate.getTime() - now.getTime()) / 86400000);
        return { slug: r.problemSlug, title: prob.title, difficulty: prob.difficulty, topic: prob.topic, reviewDate: reviewDate.toISOString(), daysUntil, reviewCount: r.reviewCount ?? 0 };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.daysUntil > 0 && r.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return NextResponse.json({ data: { due, upcoming, totalTracked: rows.length }, error: null });
  } catch (err) { return handleError(err); }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const { problemSlug } = await req.json();
    await prisma.userProgress.updateMany({
      where: { userId: user.id, problemSlug },
      data: { reviewCount: { increment: 1 }, solvedAt: new Date() },
    });
    return NextResponse.json({ data: { ok: true }, error: null });
  } catch (err) { return handleError(err); }
}
