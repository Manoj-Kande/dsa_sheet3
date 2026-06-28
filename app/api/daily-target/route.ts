import { rateLimit } from "@/lib/rate-limit";
import { ok, err, handleApiError } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getWeeklyTargets,
  setDayTarget,
  addProblemToDay,
  removeProblemFromDay,
} from "@/lib/services/daily-target-service";
import { UnauthorizedError } from "@/lib/services/current-user";

function handleError(err: unknown) {
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ error: { message: "Not signed in" } }, { status: 401 });
  }
  console.error("[daily-target]", err);
  return NextResponse.json({ error: { message: "Internal server error" } }, { status: 500 });
}

// GET /api/daily-target?weekStart=yyyy-mm-dd
// Returns the 7-day weekly targets starting from weekStart (defaults to current Mon)
export async function GET(req: NextRequest) {
  try {
    const weekStart = req.nextUrl.searchParams.get("weekStart") ?? undefined;
    const targets = await getWeeklyTargets(weekStart);
    return NextResponse.json({ data: targets });
  } catch (err) {
    return handleError(err);
  }
}

const SetDaySchema = z.object({
  action: z.literal("set"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  problems: z.array(
    z.object({
      problemSlug: z.string().min(1),
      note: z.string().optional(),
      order: z.number().int().optional(),
    })
  ),
  note: z.string().optional(),
});

const AddProblemSchema = z.object({
  action: z.literal("add"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  problemSlug: z.string().min(1),
  note: z.string().optional(),
});

const RemoveProblemSchema = z.object({
  action: z.literal("remove"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  problemSlug: z.string().min(1),
});

const BodySchema = z.discriminatedUnion("action", [
  SetDaySchema,
  AddProblemSchema,
  RemoveProblemSchema,
]);

// POST /api/daily-target
// Body: { action: "set" | "add" | "remove", date, ... }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = BodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { message: "Invalid request", details: parsed.error.flatten() } },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.action === "set") {
      const result = await setDayTarget(data.date, data.problems, data.note);
      return NextResponse.json({ data: result });
    }

    if (data.action === "add") {
      const result = await addProblemToDay(data.date, data.problemSlug, data.note);
      return NextResponse.json({ data: result });
    }

    if (data.action === "remove") {
      const result = await removeProblemFromDay(data.date, data.problemSlug);
      return NextResponse.json({ data: result });
    }
  } catch (err) {
    return handleError(err);
  }
}
