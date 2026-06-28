import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError } from "@/lib/services/current-user";
import { NotFoundError, ForbiddenError } from "@/lib/services/ownership";

export type ApiError = { code: string; message: string };
export type ApiResponse<T> = { data: T; error: null } | { data: null; error: ApiError };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data, error: null } satisfies ApiResponse<T>, { status });
}

export function err(code: string, message: string, status: number) {
  return NextResponse.json({ data: null, error: { code, message } } satisfies ApiResponse<never>, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof UnauthorizedError) return err("UNAUTHORIZED", "Sign in required", 401);
  if (error instanceof ForbiddenError)    return err("FORBIDDEN",    "Access denied",    403);
  if (error instanceof NotFoundError)     return err("NOT_FOUND",    error.message,      404);
  if (error instanceof ZodError)          return err("VALIDATION",   error.errors[0]?.message ?? "Invalid input", 400);
  console.error("[api]", error);
  return err("INTERNAL", "Something went wrong", 500);
}
