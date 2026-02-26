import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Create a new app within an organization.
 *
 * Requires authentication. Creates an app record with the given name, platform,
 * and organization association.
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

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
 * Uses the by_orgId index for efficient filtered lookup.
 *
 * @returns Array of app documents.
 */
export const listApps = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("apps")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

/**
 * Get a single app by its Convex document ID.
 *
 * @returns The app document or null if the ID is invalid.
 */
export const getApp = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appId);
  },
});

/**
 * Delete an app and cascade-delete all its API keys.
 *
 * Requires authentication. Deletes all apiKey records associated with the app
 * via the by_appId index, then deletes the app record itself.
 *
 * @returns `{ success: true }` on completion.
 */
export const deleteApp = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Cascade-delete all API keys for this app
    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_appId", (q) => q.eq("appId", args.appId))
      .collect();

    for (const key of keys) {
      await ctx.db.delete(key._id);
    }

    // Delete the app record
    await ctx.db.delete(args.appId);

    return { success: true };
  },
});
