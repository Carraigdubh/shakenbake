import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    createdAt: v.number(),
  }).index("by_clerkOrgId", ["clerkOrgId"]),

  apps: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    platform: v.union(
      v.literal("ios"),
      v.literal("android"),
      v.literal("web"),
      v.literal("universal"),
    ),
    createdAt: v.number(),
  }).index("by_orgId", ["orgId"]),

  apiKeys: defineTable({
    appId: v.id("apps"),
    orgId: v.id("organizations"),
    key: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_appId", ["appId"])
    .index("by_orgId", ["orgId"])
    .index("by_key", ["key"]),

  reports: defineTable({
    appId: v.id("apps"),
    orgId: v.id("organizations"),
    externalId: v.string(),
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
    screenshotStorageId: v.optional(v.id("_storage")),
    screenshotOriginalStorageId: v.optional(v.id("_storage")),
    audioStorageId: v.optional(v.id("_storage")),
    audioTranscript: v.optional(v.string()),
    context: v.any(),
    customMetadata: v.optional(v.any()),
    forwardedIssueUrl: v.optional(v.string()),
    forwardedIssueId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_appId", ["appId"])
    .index("by_orgId", ["orgId"]),
});
