"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { usePaginatedQuery } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReportRow } from "@/components/report-row";
import { Bug, Loader2 } from "lucide-react";

type Severity = "low" | "medium" | "high" | "critical";

export default function ReportsPage() {
  const { organization } = useOrganization();
  const [appFilter, setAppFilter] = useState<string | undefined>(undefined);
  const [severityFilter, setSeverityFilter] = useState<
    Severity | undefined
  >(undefined);

  // Get the Convex organization record from the Clerk org ID
  const convexOrg = useQuery(
    api.organizations.getOrganization,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const orgId = convexOrg?._id as Id<"organizations"> | undefined;

  // Fetch apps for the filter dropdown
  const apps = useQuery(api.apps.listApps, orgId ? { orgId } : "skip");

  // Fetch paginated reports with filters
  const { results, status, loadMore } = usePaginatedQuery(
    api.reports.listReports,
    orgId
      ? {
          orgId,
          ...(appFilter ? { appId: appFilter as Id<"apps"> } : {}),
          ...(severityFilter ? { severity: severityFilter } : {}),
        }
      : "skip",
    { initialNumItems: 25 }
  );

  // No-org state
  if (!organization) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="rounded-md border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Select an organization to view reports.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (status === "LoadingFirstPage") {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">
            Loading reports...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Reports</h1>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={appFilter ?? "all"}
          onValueChange={(value) =>
            setAppFilter(value === "all" ? undefined : value)
          }
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All apps" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All apps</SelectItem>
            {apps?.map((app) => (
              <SelectItem key={app._id} value={app._id}>
                {app.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={severityFilter ?? "all"}
          onValueChange={(value) =>
            setSeverityFilter(
              value === "all" ? undefined : (value as Severity)
            )
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <Bug className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">No reports yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reports will appear here when submitted via the ShakeNbake SDK.
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((report) => (
                <ReportRow
                  key={report._id}
                  reportId={report._id}
                  title={report.title}
                  severity={report.severity}
                  category={report.category}
                  createdAt={report.createdAt}
                />
              ))}
            </TableBody>
          </Table>

          {status === "CanLoadMore" && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => loadMore(25)}
              >
                Load more
              </Button>
            </div>
          )}

          {status === "LoadingMore" && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">
                Loading more...
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
