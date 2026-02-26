import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internalMutation, query } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";

// ---- ingestReport (internal mutation) ----

/**
 * Store a bug report submitted via the HTTP ingestion endpoint.
 *
 * This is an internal mutation -- it is NOT callable from the Convex client SDK.
 * It is invoked exclusively by the HTTP action in http.ts after auth + validation
 * and file storage.
 *
 * File storage is handled by the HTTP action (which has StorageActionWriter with
 * ctx.storage.store()). This mutation receives the already-stored file IDs and
 * creates the report record.
 */
export const ingestReport = internalMutation({
  args: {
    appId: v.id("apps"),
    orgId: v.id("organizations"),
    title: v.string(),
    description: v.string(),
    severity: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("critical"),
    ),
    category: v.union(
      v.literal("bug"),
      v.literal("ui"),
      v.literal("crash"),
      v.literal("performance"),
      v.literal("other"),
    ),
    externalId: v.string(),
    context: v.any(),
    customMetadata: v.optional(v.any()),
    screenshotStorageId: v.optional(v.id("_storage")),
    screenshotOriginalStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const reportId = await ctx.db.insert("reports", {
      appId: args.appId,
      orgId: args.orgId,
      externalId: args.externalId,
      title: args.title,
      description: args.description,
      severity: args.severity,
      category: args.category,
      context: args.context,
      customMetadata: args.customMetadata,
      screenshotStorageId: args.screenshotStorageId,
      screenshotOriginalStorageId: args.screenshotOriginalStorageId,
      audioStorageId: args.audioStorageId,
      createdAt: Date.now(),
    });

    return { reportId, success: true };
  },
});

// ---- listReports (public query) ----

/**
 * List reports for an organization with optional filters and pagination.
 *
 * Requires authentication and org membership. Supports filtering by appId and
 * severity. Results are ordered by creation time descending (newest first).
 * Uses Convex pagination for large result sets.
 *
 * When filtering by appId, the app is verified to belong to the requested org
 * before returning results, preventing cross-org data leakage.
 */
export const listReports = query({
  args: {
    orgId: v.id("organizations"),
    appId: v.optional(v.id("apps")),
    severity: v.optional(
      v.union(
        v.literal("low"),
        v.literal("medium"),
        v.literal("high"),
        v.literal("critical"),
      ),
    ),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    // Start with the org-level index for the base filter.
    let baseQuery;

    if (args.appId) {
      // Verify the app belongs to the requested org before filtering by it.
      // This prevents cross-org data access via a crafted appId.
      const app = await ctx.db.get(args.appId);
      if (!app || app.orgId !== args.orgId) {
        // Return empty paginated result -- app does not belong to this org
        return { page: [], isDone: true, continueCursor: "" };
      }

      baseQuery = ctx.db
        .query("reports")
        .withIndex("by_appId", (q) => q.eq("appId", args.appId!))
        .order("desc");
    } else {
      baseQuery = ctx.db
        .query("reports")
        .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
        .order("desc");
    }

    // Apply severity filter if provided (post-index filtering).
    if (args.severity) {
      const severity = args.severity;
      return await baseQuery
        .filter((q) => q.eq(q.field("severity"), severity))
        .paginate(args.paginationOpts);
    }

    return await baseQuery.paginate(args.paginationOpts);
  },
});

// ---- getReport (public query) ----

/**
 * Get a single report by its document ID.
 *
 * Requires authentication. Verifies the caller's org owns the report before
 * returning it. Resolves file storage URLs for screenshots and audio so the
 * client can display/play them directly.
 */
export const getReport = query({
  args: { reportId: v.id("reports") },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const report = await ctx.db.get(args.reportId);
    if (!report) {
      return null;
    }

    // Verify the caller's org owns this report
    const org = await ctx.db.get(report.orgId);
    if (!org || org.clerkOrgId !== auth.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    // Resolve storage URLs
    const screenshotUrl = report.screenshotStorageId
      ? await ctx.storage.getUrl(report.screenshotStorageId)
      : null;

    const screenshotOriginalUrl = report.screenshotOriginalStorageId
      ? await ctx.storage.getUrl(report.screenshotOriginalStorageId)
      : null;

    const audioUrl = report.audioStorageId
      ? await ctx.storage.getUrl(report.audioStorageId)
      : null;

    return {
      ...report,
      screenshotUrl,
      screenshotOriginalUrl,
      audioUrl,
    };
  },
});

// ---- getReportCounts (public query) ----

/**
 * Get report counts broken down by severity for an organization.
 *
 * Requires authentication and org membership. Scans all reports for the org
 * using the by_orgId index and counts each severity level. Returns total and
 * per-severity counts.
 */
export const getReportCounts = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const reports = await ctx.db
      .query("reports")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();

    const counts = { total: 0, low: 0, medium: 0, high: 0, critical: 0 };

    for (const report of reports) {
      counts.total++;
      counts[report.severity]++;
    }

    return counts;
  },
});
