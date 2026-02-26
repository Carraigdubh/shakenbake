import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Ensure an organization exists for the current user's Clerk org context.
 *
 * Reads the org ID from the authenticated user's identity claims.
 * If the org already exists in the database, returns its ID.
 * Otherwise, creates a new org record and returns the new ID.
 *
 * Throws if no auth context or no org ID in claims.
 */
export const ensureOrganization = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Clerk includes org_id in the JWT custom claims when an org is selected.
    // The tokenIdentifier format from Clerk is typically "<issuer>|<subject>".
    // org_id may be available in custom claims or as part of the identity object.
    const clerkOrgId =
      (identity as Record<string, unknown>).org_id as string | undefined;
    if (!clerkOrgId) {
      throw new Error(
        "No organization context. Select an organization in Clerk.",
      );
    }

    // Check if org already exists via index
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new org record
    const orgId = await ctx.db.insert("organizations", {
      clerkOrgId,
      name: (identity.name ?? clerkOrgId) as string,
      createdAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * Look up an organization by its Clerk org ID.
 *
 * Returns the organization document or null if not found.
 */
export const getOrganization = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});

/**
 * Get an organization by its Convex document ID.
 *
 * Returns the organization document or null if the ID is invalid.
 */
export const getOrganizationById = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.orgId);
  },
});
