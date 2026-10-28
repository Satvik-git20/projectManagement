import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function parseBody<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError(400, "Expected a JSON body");
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(422, firstIssue(result.error));
  }
  return result.data;
}

export function firstIssue(error: ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Invalid input";
  return issue.message;
}

export function handleError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: firstIssue(error) }, { status: 422 });
  }
  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: "Something went wrong on our side" },
    { status: 500 },
  );
}

/**
 * Same-origin guard for state-changing requests. Combined with the
 * SameSite=Lax session cookie this blocks cross-site form/JSON posts.
 */
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return; // non-browser clients / same-origin fetches without Origin

  const host = request.headers.get("host");
  if (!host) throw new ApiError(400, "Missing host header");

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new ApiError(403, "Invalid origin");
  }

  if (originHost !== host) {
    throw new ApiError(403, "Cross-origin request blocked");
  }
}
