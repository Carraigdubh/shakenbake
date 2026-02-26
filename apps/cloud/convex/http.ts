import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

// ---- CORS helpers ----

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function corsResponse(body: string, status: number) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message: string, status: number) {
  return corsResponse(JSON.stringify({ success: false, error: message }), status);
}

// ---- Validation helpers ----

const VALID_SEVERITIES = ["low", "medium", "high", "critical"] as const;
const VALID_CATEGORIES = ["bug", "ui", "crash", "performance", "other"] as const;

function isValidSeverity(value: unknown): value is (typeof VALID_SEVERITIES)[number] {
  return typeof value === "string" && (VALID_SEVERITIES as readonly string[]).includes(value);
}

function isValidCategory(value: unknown): value is (typeof VALID_CATEGORIES)[number] {
  return typeof value === "string" && (VALID_CATEGORIES as readonly string[]).includes(value);
}

// ---- File storage helpers ----

/**
 * Decode a base64 string to a Blob.
 *
 * Strips optional data-URI prefix and uses atob() available in the Convex
 * runtime to decode the payload.
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const raw = base64.includes(",") ? base64.split(",")[1] : base64;
  const binaryString = atob(raw);
  const length = binaryString.length;
  const buffer = new ArrayBuffer(length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < length; i++) {
    view[i] = binaryString.charCodeAt(i);
  }
  return new Blob([buffer], { type: mimeType });
}

// ---- POST /api/ingest ----

http.route({
  path: "/api/ingest",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Extract and validate Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(
        "Missing or malformed Authorization header. Expected: Bearer snb_app_xxx",
        401,
      );
    }

    const apiKey = authHeader.slice("Bearer ".length).trim();
    if (!apiKey || !apiKey.startsWith("snb_app_")) {
      return errorResponse(
        "Invalid API key format. Expected key starting with snb_app_",
        401,
      );
    }

    // 2. Validate the key against the database
    const keyResult = await ctx.runQuery(internal.apiKeys.validateApiKey, {
      key: apiKey,
    });

    if (!keyResult) {
      return errorResponse("Invalid API key", 401);
    }

    if (!keyResult.isActive) {
      return errorResponse("API key has been revoked", 401);
    }

    // 3. Parse and validate request body
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    // 4. Validate required fields
    const errors: string[] = [];

    if (!body.title || typeof body.title !== "string") {
      errors.push("title is required and must be a string");
    }
    if (!body.description || typeof body.description !== "string") {
      errors.push("description is required and must be a string");
    }
    if (!isValidSeverity(body.severity)) {
      errors.push(
        `severity is required and must be one of: ${VALID_SEVERITIES.join(", ")}`,
      );
    }
    if (!isValidCategory(body.category)) {
      errors.push(
        `category is required and must be one of: ${VALID_CATEGORIES.join(", ")}`,
      );
    }

    if (errors.length > 0) {
      return corsResponse(
        JSON.stringify({ success: false, errors }),
        400,
      );
    }

    // 5. Store files in Convex storage (HTTP actions have StorageActionWriter
    //    which provides ctx.storage.store()). Then pass storage IDs to mutation.
    let screenshotStorageId: Id<"_storage"> | undefined;
    if (typeof body.screenshotAnnotated === "string" && body.screenshotAnnotated) {
      const blob = base64ToBlob(body.screenshotAnnotated, "image/png");
      screenshotStorageId = await ctx.storage.store(blob);
    }

    let screenshotOriginalStorageId: Id<"_storage"> | undefined;
    if (typeof body.screenshotOriginal === "string" && body.screenshotOriginal) {
      const blob = base64ToBlob(body.screenshotOriginal, "image/png");
      screenshotOriginalStorageId = await ctx.storage.store(blob);
    }

    let audioStorageId: Id<"_storage"> | undefined;
    if (typeof body.audio === "string" && body.audio) {
      const blob = base64ToBlob(body.audio, "audio/webm");
      audioStorageId = await ctx.storage.store(blob);
    }

    // 6. Create the report record via internal mutation
    const result = await ctx.runMutation(internal.reports.ingestReport, {
      appId: keyResult.appId,
      orgId: keyResult.orgId,
      title: body.title as string,
      description: body.description as string,
      severity: body.severity as (typeof VALID_SEVERITIES)[number],
      category: body.category as (typeof VALID_CATEGORIES)[number],
      externalId: (body.id as string) ?? "",
      context: body.context ?? {},
      customMetadata: body.customMetadata as Record<string, unknown> | undefined,
      screenshotStorageId,
      screenshotOriginalStorageId,
      audioStorageId,
    });

    return corsResponse(
      JSON.stringify({
        success: true,
        reportId: result.reportId,
        message: "Report received",
      }),
      200,
    );
  }),
});

// ---- OPTIONS /api/ingest (CORS preflight) ----

http.route({
  path: "/api/ingest",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }),
});

export default http;
