export type Platform = "ios" | "android" | "web" | "universal";
export type Severity = "low" | "medium" | "high" | "critical";
export type Category = "bug" | "ui" | "crash" | "performance" | "other";

export const platformConfig: Record<Platform, { label: string; className: string }> = {
  ios: { label: "iOS", className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  android: { label: "Android", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  web: { label: "Web", className: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  universal: { label: "Universal", className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300" },
};

export const severityConfig: Record<Severity, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  medium: { label: "Medium", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  high: { label: "High", className: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300" },
  critical: { label: "Critical", className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

export const categoryConfig: Record<Category, { label: string; className: string }> = {
  bug: { label: "Bug", className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300" },
  ui: { label: "UI", className: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  crash: { label: "Crash", className: "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  performance: { label: "Performance", className: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300" },
  other: { label: "Other", className: "bg-gray-50 text-gray-700 dark:bg-gray-950 dark:text-gray-300" },
};
