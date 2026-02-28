import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";

/**
 * Create a new app within an organization.
 *
 * Requires authentication and org membership. Creates an app record with the
 * given name, platform, and organization association.
 *
 * @returns The new app's Convex document ID.
 */
export const createApp = mutation({
  args: {
    name: v.string(),
    platform: v.union(
      v.literal("ios"),
      v.literal("android"),
      v.literal("web"),
      v.literal("universal"),
    ),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    const appId = await ctx.db.insert("apps", {
      orgId: args.orgId,
      name: args.name,
      platform: args.platform,
      createdAt: Date.now(),
    });

    return appId;
  },
});

/**
 * List all apps belonging to an organization.
 *
 * Requires authentication and org membership. Uses the by_orgId index for
 * efficient filtered lookup.
 *
 * @returns Array of app documents.
 */
export const listApps = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    return await ctx.db
      .query("apps")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Get a single app by its Convex document ID.
 *
 * Requires authentication. Verifies the caller's org matches the app's org.
 *
 * @returns The app document or null if the ID is invalid.
 */
export const getApp = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const app = await ctx.db.get(args.appId);
    if (!app) {
      return null;
    }

    // Verify the caller's org owns this app
    const org = await ctx.db.get(app.orgId);
    if (!org || org.clerkOrgId !== auth.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    return app;
  },
});

/**
 * Delete an app and cascade-delete all its API keys.
 *
 * Requires authentication and org membership. Verifies the caller's org owns
 * the app before deleting. Deletes all apiKey records associated with the app
 * via the by_appId index, then deletes the app record itself.
 *
 * @returns `{ success: true }` on completion.
 */
export const deleteApp = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Get the app and verify org ownership
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }

    const org = await ctx.db.get(app.orgId);
    if (!org || org.clerkOrgId !== auth.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    // Cascade-delete all API keys for this app
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_appId", (q) => q.eq("appId", args.appId))
      .collect();

    for (const key of keys) {
      await ctx.db.delete(key._id);
    }

    // Cascade-delete all reports and their storage files for this app
    const reports = await ctx.db
      .query("reports")
      .withIndex("by_appId", (q) => q.eq("appId", args.appId))
      .collect();

    for (const report of reports) {
      // Delete associated storage files
      if (report.screenshotStorageId) {
        await ctx.storage.delete(report.screenshotStorageId);
      }
      if (report.screenshotOriginalStorageId) {
        await ctx.storage.delete(report.screenshotOriginalStorageId);
      }
      if (report.audioStorageId) {
        await ctx.storage.delete(report.audioStorageId);
      }
      // Delete the report record
      await ctx.db.delete(report._id);
    }

    // Delete the app record
    await ctx.db.delete(args.appId);

    return { success: true };
  },
});
