import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./current-user";

export interface DailyTargetProblemInput {
  problemSlug: string;
  note?: string;
  order?: number;
}

export interface DailyTargetRow {
  id: string;
  date: string;
  note: string | null;
  problems: {
    id: string;
    problemSlug: string;
    note: string | null;
    order: number;
  }[];
}

function serializeTarget(t: {
  id: string;
  date: string;
  note: string | null;
  problems: { id: string; problemSlug: string; note: string | null; order: number }[];
}): DailyTargetRow {
  return {
    id: t.id,
    date: t.date,
    note: t.note,
    problems: t.problems.sort((a, b) => a.order - b.order),
  };
}

function getWeekRange(weekStartDate?: string): { start: string; end: string } {
  let start: string;
  if (weekStartDate) {
    start = weekStartDate;
  } else {
    const today = new Date();
    const dow = today.getUTCDay();
    const diff = dow === 0 ? -6 : 1 - dow;
    const monday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + diff));
    start = monday.toISOString().slice(0, 10);
  }
  const startDate = new Date(start + "T00:00:00Z");
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + 6);
  return { start, end: endDate.toISOString().slice(0, 10) };
}

export async function getWeeklyTargets(weekStartDate?: string): Promise<DailyTargetRow[]> {
  const user = await getCurrentUser();
  const { start, end } = getWeekRange(weekStartDate);

  const rows = await prisma.dailyTarget.findMany({
    where: {
      userId: user.id,
      date: { gte: start, lte: end },
    },
    include: { problems: { orderBy: { order: "asc" } } },
    orderBy: { date: "asc" },
  });

  return rows.map(serializeTarget);
}

export async function getDayTarget(dateStr: string): Promise<DailyTargetRow | null> {
  const user = await getCurrentUser();
  const row = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date: dateStr } },
    include: { problems: { orderBy: { order: "asc" } } },
  });
  return row ? serializeTarget(row) : null;
}

export async function setDayTarget(
  dateStr: string,
  problems: DailyTargetProblemInput[],
  note?: string
): Promise<DailyTargetRow> {
  const user = await getCurrentUser();

  const existing = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date: dateStr } },
  });

  if (existing) {
    await prisma.dailyTargetProblem.deleteMany({ where: { dailyTargetId: existing.id } });
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
      date: dateStr,
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

export async function addProblemToDay(
  dateStr: string,
  problemSlug: string,
  note?: string
): Promise<DailyTargetRow> {
  const user = await getCurrentUser();

  const existing = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date: dateStr } },
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
      date: dateStr,
      problems: { create: [{ problemSlug, note: note ?? null, order: 0 }] },
    },
    include: { problems: { orderBy: { order: "asc" } } },
  });
  return serializeTarget(created);
}

export async function removeProblemFromDay(
  dateStr: string,
  problemSlug: string
): Promise<DailyTargetRow | null> {
  const user = await getCurrentUser();

  const target = await prisma.dailyTarget.findUnique({
    where: { userId_date: { userId: user.id, date: dateStr } },
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
