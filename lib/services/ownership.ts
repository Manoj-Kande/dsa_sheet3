import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "./current-user";

export class NotFoundError extends Error {
  constructor(resource = "Resource") { super(`${resource} not found`); this.name = "NotFoundError"; }
}

export class ForbiddenError extends Error {
  constructor() { super("Access denied"); this.name = "ForbiddenError"; }
}

export async function assertSheetOwner(sheetId: string) {
  const user = await getCurrentUser();
  const sheet = await prisma.customSheet.findUnique({ where: { id: sheetId }, select: { userId: true } });
  if (!sheet) throw new NotFoundError("Sheet");
  if (sheet.userId !== user.id) throw new ForbiddenError();
  return user;
}

export async function assertDailyTargetOwner(targetId: string) {
  const user = await getCurrentUser();
  const target = await prisma.dailyTarget.findUnique({ where: { id: targetId }, select: { userId: true } });
  if (!target) throw new NotFoundError("Daily target");
  if (target.userId !== user.id) throw new ForbiddenError();
  return user;
}
