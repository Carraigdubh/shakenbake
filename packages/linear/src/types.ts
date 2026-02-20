// ---------------------------------------------------------------------------
// @shakenbake/linear — Configuration types
// ---------------------------------------------------------------------------

import type { Severity, Category } from '@shakenbake/core';

/**
 * Configuration for the LinearAdapter.
 */
export interface LinearConfig {
  /** Linear personal API key or OAuth token. */
  apiKey: string;

  /** Team ID to create issues in (required). */
  teamId: string;

  /** Optional project ID to assign issues to. */
  projectId?: string;

  /** Optional label IDs to auto-apply to every issue. */
  defaultLabelIds?: string[];

  /** Optional assignee ID to auto-assign issues to. */
  defaultAssigneeId?: string;

  /** Default priority (0=none, 1=urgent, 2=high, 3=medium, 4=low). */
  defaultPriority?: 0 | 1 | 2 | 3 | 4;

  /**
   * Map ShakeNbake severity to Linear priority number.
   * Default: critical=1, high=2, medium=3, low=4
   */
  severityMapping?: Record<Severity, number>;

  /**
   * Map ShakeNbake category to Linear label IDs.
   * When a report has a category, the corresponding label ID is added.
   */
  categoryLabels?: Partial<Record<Category, string>>;

  /**
   * Linear GraphQL API URL.
   * @default 'https://api.linear.app/graphql'
   */
  apiUrl?: string;
}

/**
 * Default severity-to-priority mapping.
 * Linear priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low
 */
export const DEFAULT_SEVERITY_MAPPING: Record<Severity, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

/** Default Linear GraphQL API endpoint. */
export const DEFAULT_API_URL = 'https://api.linear.app/graphql';
