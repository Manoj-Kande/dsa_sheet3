import { ok, handleApiError } from "@/lib/api-response";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { updateSheet, deleteSheet, addProblemToSheet, removeProblemFromSheet } from "@/lib/services/custom-sheet-service";
import { UnauthorizedError } from "@/lib/services/current-user";

function handleError(err: unknown) {
  if (err instanceof UnauthorizedError)
    return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message: "Sign in required" } }, { status: 401 });
  console.error("[custom-sheets/id]", err);
  return NextResponse.json({ data: null, error: { code: "INTERNAL", message: "Something went wrong" } }, { status: 500 });
}

const UpdateSchema = z.object({
  action: z.enum(["update", "addProblem", "removeProblem"]),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  problemSlug: z.string().optional(),
  note: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ data: null, error: { code: "VALIDATION", message: parsed.error.message } }, { status: 400 });

    const d = parsed.data;
    let result;
    if (d.action === "update") result = await updateSheet(id, { title: d.title, description: d.description, isPublic: d.isPublic });
    else if (d.action === "addProblem" && d.problemSlug) result = await addProblemToSheet(id, d.problemSlug, d.note);
    else if (d.action === "removeProblem" && d.problemSlug) result = await removeProblemFromSheet(id, d.problemSlug);
    else return NextResponse.json({ data: null, error: { code: "VALIDATION", message: "Invalid action" } }, { status: 400 });

    return NextResponse.json({ data: result, error: null });
  } catch (err) { return handleError(err); }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deleteSheet(id);
    return NextResponse.json({ data: { deleted: true }, error: null });
  } catch (err) { return handleError(err); }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { getSheetBySlug, getPublicSheet } = await import("@/lib/services/custom-sheet-service");
    // Try as owner first, fallback to public
    let sheet = null;
    try { sheet = await getSheetBySlug(id); } catch {}
    if (!sheet) sheet = await getPublicSheet(id);
    if (!sheet) return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Sheet not found" } }, { status: 404 });
    return NextResponse.json({ data: sheet, error: null });
  } catch (err) { return handleError(err); }
}
