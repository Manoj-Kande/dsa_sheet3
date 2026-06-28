import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./current-user";
import { sanitizeText, sanitizeSheetInput } from "@/lib/sanitize";

export interface CustomSheetRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  problemCount: number;
  problems: { id: string; problemSlug: string; note: string | null; order: number }[];
}

function serialize(s: {
  id: string; slug: string; title: string; description: string | null;
  isPublic: boolean; createdAt: Date;
  problems: { id: string; problemSlug: string; note: string | null; order: number }[];
}): CustomSheetRow {
  return {
    id: s.id, slug: s.slug, title: s.title, description: s.description,
    isPublic: s.isPublic, createdAt: s.createdAt.toISOString(),
    problemCount: s.problems.length,
    problems: s.problems.sort((a, b) => a.order - b.order),
  };
}

function makeSlug(title: string) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
    + "-" + Math.random().toString(36).slice(2, 6);
}

export async function getUserSheets(): Promise<CustomSheetRow[]> {
  const user = await getCurrentUser();
  const rows = await prisma.customSheet.findMany({
    where: { userId: user.id },
    include: { problems: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serialize);
}

export async function getSheetBySlug(slug: string): Promise<CustomSheetRow | null> {
  const user = await getCurrentUser();
  const row = await prisma.customSheet.findFirst({
    where: { slug, userId: user.id },
    include: { problems: { orderBy: { order: "asc" } } },
  });
  return row ? serialize(row) : null;
}

export async function getPublicSheet(slug: string): Promise<CustomSheetRow | null> {
  const row = await prisma.customSheet.findFirst({
    where: { slug, isPublic: true },
    include: { problems: { orderBy: { order: "asc" } } },
  });
  return row ? serialize(row) : null;
}

export async function createSheet(
  title: string, description?: string, isPublic?: boolean,
  problems?: { problemSlug: string; note?: string }[]
): Promise<CustomSheetRow> {
  const user = await getCurrentUser();
  const slug = makeSlug(title);
  const row = await prisma.customSheet.create({
    data: {
      userId: user.id, title, slug,
      description: description ?? null,
      isPublic: isPublic ?? false,
      problems: {
        create: (problems ?? []).map((p: unknown, i) => { const prob = p as {problemSlug: string; note?: string}; return { problemSlug: prob.problemSlug, note: prob.note ?? null, order: i }; }),
      },
    },
    include: { problems: { orderBy: { order: "asc" } } },
  });
  return serialize(row);
}

export async function updateSheet(
  id: string, data: { title?: string; description?: string; isPublic?: boolean }
): Promise<CustomSheetRow> {
  const user = await getCurrentUser();
  const row = await prisma.customSheet.update({
    where: { id, userId: user.id },
    data,
    include: { problems: { orderBy: { order: "asc" } } },
  });
  return serialize(row);
}

export async function deleteSheet(id: string): Promise<void> {
  const user = await getCurrentUser();
  await prisma.customSheet.delete({ where: { id, userId: user.id } });
}

export async function addProblemToSheet(id: string, problemSlug: string, note?: string): Promise<CustomSheetRow> {
  const user = await getCurrentUser();
  const sheet = await prisma.customSheet.findFirst({
    where: { id, userId: user.id },
    include: { problems: true },
  });
  if (!sheet) throw new Error("Sheet not found");
  const exists = sheet.problems.some((p: {problemSlug: string}) => p.problemSlug === problemSlug);
  if (!exists) {
    await prisma.customSheetProblem.create({
      data: { customSheetId: id, problemSlug, note: note ?? null, order: sheet.problems.length },
    });
  }
  const updated = await prisma.customSheet.findFirst({
    where: { id }, include: { problems: { orderBy: { order: "asc" } } },
  });
  return serialize(updated!);
}

export async function removeProblemFromSheet(id: string, problemSlug: string): Promise<CustomSheetRow> {
  const user = await getCurrentUser();
  await prisma.customSheetProblem.deleteMany({ where: { customSheetId: id, problemSlug } });
  const updated = await prisma.customSheet.findFirst({
    where: { id, userId: user.id }, include: { problems: { orderBy: { order: "asc" } } },
  });
  return serialize(updated!);
}
