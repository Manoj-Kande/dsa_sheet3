// ============================================
// Daily Target service — per-day problem plans, DB-backed.
// Supports multiple problems per day and a full week of targets.
// ============================================
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./current-user";

export interface DailyTargetProblemInput {
  problemSlug: string;
  note?: string;
  order?: number;
}

export interface DailyTargetRow {
  id: string;
  date: string; // ISO yyyy-mm-dd
  note: string | null;
  problems: {
    id: string;
    problemSlug: string;
    note: string | null;
    order: number;
  }[];
}

function toDateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseDate(dateStr: string): Date {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function serializeTarget(t: {
  id: string;
  date: Date;
  note: string | null;
  problems: { id: string; problemSlug: string; note: string | null; order: number }[];
}): DailyTargetRow {
  return {
    id: t.id,
    date: isoDate(t.date),
    note: t.note,
    problems: t.problems.sort((a, b) => a.order - b.order),
  };
}

// Get targets for a date range (default: current week Mon–Sun)
export async function getWeeklyTargets(weekStartDate?: string): Promise<DailyTargetRow[]> {
  const user = await getCurrentUser();

  const today = toDateOnly(new Date());
  let start: Date;

  if (weekStartDate) {
    start = parseDate(weekStartDate);
  } else {
    // Start from Monday of current week
    const dow = today.getUTCDay(); // 0=Sun, 1=Mon...
    const diff = dow === 0 ? -6 : 1 - dow;
    start = new Date(today);
    start.setUTCDate(start.getUTCDate() + diff);
  }

  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const rows = await prisma.dailyTarget.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lte: end },
    },
    include: {
      problems: {
        orderBy: { order: "asc" },
      },
    },
    orderBy: { date: "asc" },
  });

  return rows.map(serializeTarget);
}

// Get a single day's target
export async function getDayTarget(dateStr: string): Promise<DailyTargetRow | null> {
  const user = await getCurrentUser();
  const date = parseDate(dateStr);

  const row = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date } },
    include: { problems: { orderBy: { order: "asc" } } },
  });

  return row ? serializeTarget(row) : null;
}

// Upsert the full set of problems for a date (replaces existing problems)
export async function setDayTarget(
  dateStr: string,
  problems: DailyTargetProblemInput[],
  note?: string
): Promise<DailyTargetRow> {
  const user = await getCurrentUser();
  const date = parseDate(dateStr);

  const existing = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date } },
  });

  if (existing) {
    // Delete old problems and re-create (simplest correct approach for reordering)
    await prisma.dailyTargetProblem.deleteMany({
      where: { dailyTargetId: existing.id },
    });

    const updated = await prisma.dailyTarget.update({
      where: { id: existing.id },
      data: {
        note: note ?? existing.note,
        problems: {
          create: problems.map((p, i) => ({
            problemSlug: p.problemSlug,
            note: p.note ?? null,
            order: p.order ?? i,
          })),
        },
      },
      include: { problems: { orderBy: { order: "asc" } } },
    });

    return serializeTarget(updated);
  }

  const created = await prisma.dailyTarget.create({
    data: {
      userId: user.id,
      date,
      note: note ?? null,
      problems: {
        create: problems.map((p, i) => ({
          problemSlug: p.problemSlug,
          note: p.note ?? null,
          order: p.order ?? i,
        })),
      },
    },
    include: { problems: { orderBy: { order: "asc" } } },
  });

  return serializeTarget(created);
}

// Add a single problem to an existing day (or create the day)
export async function addProblemToDay(
  dateStr: string,
  problemSlug: string,
  note?: string
): Promise<DailyTargetRow> {
  const user = await getCurrentUser();
  const date = parseDate(dateStr);

  const existing = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date } },
    include: { problems: { orderBy: { order: "asc" } } },
  });

  if (existing) {
    const alreadyExists = existing.problems.some((p) => p.problemSlug === problemSlug);
    if (!alreadyExists) {
      await prisma.dailyTargetProblem.create({
        data: {
          dailyTargetId: existing.id,
          problemSlug,
          note: note ?? null,
          order: existing.problems.length,
        },
      });
    }

    const refreshed = await prisma.dailyTarget.findUnique({
      where: { id: existing.id },
      include: { problems: { orderBy: { order: "asc" } } },
    });

    return serializeTarget(refreshed!);
  }

  const created = await prisma.dailyTarget.create({
    data: {
      userId: user.id,
      date,
      problems: {
        create: [{ problemSlug, note: note ?? null, order: 0 }],
      },
    },
    include: { problems: { orderBy: { order: "asc" } } },
  });

  return serializeTarget(created);
}

// Remove a problem from a day
export async function removeProblemFromDay(
  dateStr: string,
  problemSlug: string
): Promise<DailyTargetRow | null> {
  const user = await getCurrentUser();
  const date = parseDate(dateStr);

  const target = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date } },
    include: { problems: true },
  });

  if (!target) return null;

  await prisma.dailyTargetProblem.deleteMany({
    where: { dailyTargetId: target.id, problemSlug },
  });

  const refreshed = await prisma.dailyTarget.findUnique({
    where: { id: target.id },
    include: { problems: { orderBy: { order: "asc" } } },
  });

  return refreshed ? serializeTarget(refreshed) : null;
}
