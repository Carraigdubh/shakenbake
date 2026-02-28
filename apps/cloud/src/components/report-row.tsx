"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { type Severity, type Category, severityConfig, categoryConfig } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface ReportRowProps {
  reportId: string;
  title: string;
  severity: Severity;
  category: Category;
  createdAt: number;
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
