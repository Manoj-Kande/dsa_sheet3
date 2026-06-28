import { rateLimit } from "@/lib/rate-limit";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import { getAllProgress, setProgressStatus } from "@/lib/services/progress-service";
import { parsePagination } from "@/lib/pagination";

const updateSchema = z.object({
  problemSlug: z.string().min(1).max(200),
  status: z.enum(["ATTEMPTED", "SOLVED", "REVISIT"]).nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const params = parsePagination(req.nextUrl.searchParams);
    const all = await getAllProgress();
    // Progress is a Record — return as-is (already lightweight)
    return ok(all);
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 120 });
  if (limited) return limited;
  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ data: null, error: { code: "VALIDATION", message: parsed.error.message } }, { status: 400 });
    const result = await setProgressStatus(parsed.data.problemSlug, parsed.data.status);
    return ok(result);
  } catch (err) { return handleApiError(err); }
}
