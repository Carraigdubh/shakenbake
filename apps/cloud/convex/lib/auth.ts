import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export interface AuthResult {
  identity: { subject: string; [key: string]: unknown };
  clerkOrgId: string;
}

/**
 * Verify the caller is authenticated and has an active organization context.
 * Throws if not authenticated or no org selected in Clerk.
 *
 * Clerk includes `org_id` as a custom claim in the JWT when an organization
 * is selected. This function extracts and validates that claim.
 */
export async function requireAuth(
  ctx: QueryCtx | MutationCtx,
): Promise<AuthResult> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const clerkOrgId = (identity as Record<string, unknown>).org_id;
  if (typeof clerkOrgId !== "string" || !clerkOrgId) {
    throw new Error(
      "No organization context - please select an organization",
    );
  }

  return {
    identity: identity as AuthResult["identity"],
    clerkOrgId,
  };
}

/**
 * Verify the caller's org matches the requested Convex organization.
 *
 * Looks up the Convex organization document by its `_id` and checks that
 * the document's `clerkOrgId` matches the `org_id` claim in the caller's JWT.
 * This ensures that a user in org A cannot access data belonging to org B.
 */
export async function requireOrgAccess(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
): Promise<AuthResult> {
  const auth = await requireAuth(ctx);

  const org = await ctx.db.get(orgId);
  if (!org) {
    throw new Error("Organization not found");
  }

  if (org.clerkOrgId !== auth.clerkOrgId) {
    throw new Error("Access denied - not a member of this organization");
  }

  return auth;
}
