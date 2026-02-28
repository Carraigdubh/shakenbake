import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { requireAuth, requireOrgAccess } from "./lib/auth";

/**
 * Generate a new API key for an app.
 *
 * Requires authentication and org membership. Creates a key with the
 * `snb_app_` prefix followed by 32 cryptographically random hex characters.
 * The full key is returned once to the caller and should be displayed for the
 * user to copy.
 *
 * @returns The full API key string (shown to user once).
 */
export const generateApiKey = mutation({
  args: {
    appId: v.id("apps"),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    await requireOrgAccess(ctx, args.orgId);

    // Use crypto.getRandomValues for cryptographically secure key generation
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const suffix = Array.from(array, (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const key = `snb_app_${suffix}`;

    await ctx.db.insert("apiKeys", {
      appId: args.appId,
      orgId: args.orgId,
      key,
      isActive: true,
      createdAt: Date.now(),
    });

    return key;
  },
});

/**
 * List all API keys for an app, with key values masked.
 *
 * Requires authentication. Verifies the caller's org owns the app before
 * returning keys. Returns each key document with the `key` field masked to
 * show only the last 4 characters: `snb_app_****...XXXX`.
 *
 * @returns Array of API key documents with masked key values.
 */
export const listApiKeys = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Verify the app belongs to the caller's org
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }
    const org = await ctx.db.get(app.orgId);
    if (!org || org.clerkOrgId !== auth.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    const keys = await ctx.db
      .query("apiKeys")
      .withIndex("by_appId", (q) => q.eq("appId", args.appId))
      .collect();

    return keys.map((keyDoc) => ({
      ...keyDoc,
      key: `snb_app_****...${keyDoc.key.slice(-4)}`,
    }));
  },
});

/**
 * Revoke an API key by setting isActive to false.
 *
 * Requires authentication and org membership. Verifies the caller's org owns
 * the key's associated app before revoking. The key remains in the database but
 * will no longer pass validation checks.
 */
export const revokeApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    const auth = await requireAuth(ctx);

    // Get the key and verify org ownership via the associated app
    const keyDoc = await ctx.db.get(args.keyId);
    if (!keyDoc) {
      throw new Error("API key not found");
    }

    const app = await ctx.db.get(keyDoc.appId);
    if (!app) {
      throw new Error("Associated app not found");
    }

    const org = await ctx.db.get(app.orgId);
    if (!org || org.clerkOrgId !== auth.clerkOrgId) {
      throw new Error("Access denied - not a member of this organization");
    }

    await ctx.db.patch(args.keyId, { isActive: false });

    return { success: true };
  },
});

/**
 * Validate an API key (internal query -- not exposed to client).
 *
 * Looks up the key by the by_key index. Returns the associated appId, orgId,
 * and isActive status if found, or null if the key does not exist.
 *
 * This function is used by the HTTP ingestion endpoint (plan 02-02) to
 * authenticate incoming report submissions.
 */
export const validateApiKey = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const keyDoc = await ctx.db
      .query("apiKeys")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (!keyDoc) {
      return null;
    }

    return {
      appId: keyDoc.appId,
      orgId: keyDoc.orgId,
      isActive: keyDoc.isActive,
    };
  },
});
