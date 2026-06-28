import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleApiError, ok } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { getAllBookmarks, toggleBookmark } from "@/lib/services/bookmark-service";

const toggleSchema = z.object({ problemSlug: z.string().min(1).max(200) });

export async function GET() {
  try {
    const bookmarks = await getAllBookmarks();
    return ok(bookmarks);
  } catch (err) { return handleApiError(err); }
}

export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, { limit: 120 });
  if (limited) return limited;
  try {
    const body = await req.json();
    const parsed = toggleSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ data: null, error: { code: "VALIDATION", message: parsed.error.message } }, { status: 400 });
    const isBookmarked = await toggleBookmark(parsed.data.problemSlug);
    return ok({ isBookmarked });
  } catch (err) { return handleApiError(err); }
}
