import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

/**
 * Ensure an organization exists for the current user's Clerk org context.
 *
 * Requires authentication. Reads the org ID from the authenticated user's
 * identity claims and verifies it matches the caller's JWT. If the org already
 * exists in the database, returns its ID. Otherwise, creates a new org record
 * and returns the new ID.
 *
 * Throws if no auth context or no org ID in claims.
 */
export const ensureOrganization = mutation({
  args: {},
  handler: async (ctx) => {
    const auth = await requireAuth(ctx);

    // Check if org already exists via index
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) =>
        q.eq("clerkOrgId", auth.clerkOrgId),
      )
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new org record
    const orgId = await ctx.db.insert("organizations", {
      clerkOrgId: auth.clerkOrgId,
      name: (auth.identity.name as string) ?? auth.clerkOrgId,
      createdAt: Date.now(),
    });

    return orgId;
  },
});

/**
 * Look up an organization by its Clerk org ID.
 *
 * Requires authentication. Verifies the caller's JWT org_id matches the
 * requested clerkOrgId to prevent cross-org lookups.
 *
 * @returns The organization document or null if not found.
 */
export const getOrganization = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Verify the caller is requesting their own org
    if (auth.clerkOrgId !== args.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", args.clerkOrgId))
      .first();
  },
});

/**
 * Get an organization by its Convex document ID.
 *
 * Requires authentication. Verifies the caller's JWT org_id matches the
 * organization's clerkOrgId to prevent cross-org access.
 *
 * @returns The organization document or null if the ID is invalid.
 */
export const getOrganizationById = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    const org = await ctx.db.get(args.orgId);
    if (!org) {
      return null;
    }

    // Verify the caller's org matches
    if (org.clerkOrgId !== auth.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    return org;
  },
});
