import { rateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";
import { ok, handleApiError } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSheets, createSheet } from "@/lib/services/custom-sheet-service";
import { UnauthorizedError } from "@/lib/services/current-user";

function handleError(err: unknown) {
  if (err instanceof UnauthorizedError)
    return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
  console.error("[custom-sheets]", err);
  return NextResponse.json({ data: null, error: { code: "INTERNAL", message: "Something went wrong" } }, { status: 500 });
}

export async function GET() {
  try {
    const sheets = await getUserSheets();
    return NextResponse.json({ data: sheets, error: null });
  } catch (err) { return handleError(err); }
}

const CreateSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  problems: z.array(z.object({
    problemSlug: z.string().min(1),
    note: z.string().optional(),
  })).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ data: null, error: { code: "VALIDATION", message: parsed.error.message } }, { status: 400 });
    const sheet = await createSheet(parsed.data.title, parsed.data.description, parsed.data.isPublic, parsed.data.problems);
    return NextResponse.json({ data: sheet, error: null });
  } catch (err) { return handleError(err); }
}
