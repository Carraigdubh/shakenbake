"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  ExternalLink,
  ImageOff,
  Loader2,
} from "lucide-react";
import { severityConfig, categoryConfig } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = use(params);
  const { isAuthenticated } = useConvexAuth();

  const report = useQuery(
    api.reports.getReport,
    isAuthenticated ? { reportId: reportId as Id<"reports"> } : "skip"
  );

  // Loading state
  if (report === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to reports"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Report Details</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Not found state
  if (report === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/reports"
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Back to reports"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">
            Report Not Found
          </h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              This report does not exist or has been deleted.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/reports">Back to Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sevConfig = severityConfig[report.severity];
  const catConfig = categoryConfig[report.category];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/reports"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to reports"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{report.title}</h1>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className={sevConfig.className}>
          {sevConfig.label}
        </Badge>
        <Badge variant="outline">{catConfig.label}</Badge>
        <span className="text-sm text-muted-foreground">
          {formatDateTime(report.createdAt)}
        </span>
        {report.forwardedIssueUrl && (
          <a
            href={report.forwardedIssueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            View forwarded issue
          </a>
        )}
      </div>

      {/* Description */}
      {report.description && (
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{report.description}</p>
          </CardContent>
        </Card>
      )}

      {/* Screenshot */}
      <Card>
        <CardHeader>
          <CardTitle>Screenshot</CardTitle>
        </CardHeader>
        <CardContent>
          {report.screenshotUrl ? (
            <div className="space-y-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={report.screenshotUrl}
                alt={`Screenshot for report: ${report.title}`}
                className="max-w-full rounded-md border border-border"
              />
              {report.screenshotOriginalUrl && (
                <a
                  href={report.screenshotOriginalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-3 w-3" />
                    View original screenshot
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 py-12">
              <ImageOff className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No screenshot attached
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audio */}
      {(report.audioUrl || report.audioTranscript) && (
        <Card>
          <CardHeader>
            <CardTitle>Audio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.audioUrl && (
              <audio
                controls
                src={report.audioUrl}
                className="w-full"
                aria-label="Bug report audio recording"
              >
                Your browser does not support the audio element.
              </audio>
            )}
            {report.audioTranscript && (
              <div>
                <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                  Transcript
                </h4>
                <div className="rounded-md bg-muted p-4 text-sm whitespace-pre-wrap">
                  {report.audioTranscript}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Context data */}
      {report.context && (
        <Card>
          <CardHeader>
            <CardTitle>Device Context</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              <code>{JSON.stringify(report.context, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Custom metadata */}
      {report.customMetadata && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
              <code>{JSON.stringify(report.customMetadata, null, 2)}</code>
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
