"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";

type Severity = "low" | "medium" | "high" | "critical";
type Category = "bug" | "ui" | "crash" | "performance" | "other";

interface ReportRowProps {
  reportId: string;
  title: string;
  severity: Severity;
  category: Category;
  createdAt: number;
}

const severityConfig: Record<Severity, { label: string; className: string }> = {
  low: {
    label: "Low",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  medium: {
    label: "Medium",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  high: {
    label: "High",
    className:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  },
  critical: {
    label: "Critical",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
};

const categoryConfig: Record<Category, { label: string }> = {
  bug: { label: "Bug" },
  ui: { label: "UI" },
  crash: { label: "Crash" },
  performance: { label: "Performance" },
  other: { label: "Other" },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ReportRow({
  reportId,
  title,
  severity,
  category,
  createdAt,
}: ReportRowProps) {
  const sevConfig = severityConfig[severity];
  const catConfig = categoryConfig[category];

  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/dashboard/reports/${reportId}`}
          className="font-medium text-foreground hover:underline"
        >
          {title}
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={sevConfig.className}>
          {sevConfig.label}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{catConfig.label}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(createdAt)}
      </TableCell>
    </TableRow>
  );
}
