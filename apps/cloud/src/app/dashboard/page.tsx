"use client";

import Link from "next/link";
import { useQuery, useConvexAuth } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AlertTriangle,
  AppWindow,
  ArrowRight,
  FileText,
} from "lucide-react";

export default function DashboardPage() {
  const { organization } = useOrganization();
  const { isAuthenticated } = useConvexAuth();

  // Get the Convex organization record from the Clerk org ID
  // Wait for Convex auth to be ready before querying
  const convexOrg = useQuery(
    api.organizations.getOrganization,
    isAuthenticated && organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const orgId = convexOrg?._id as Id<"organizations"> | undefined;

  // Fetch report counts and apps
  const reportCounts = useQuery(
    api.reports.getReportCounts,
    orgId ? { orgId } : "skip"
  );
  const apps = useQuery(api.apps.listApps, orgId ? { orgId } : "skip");

  // No-org state
  if (!organization) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="rounded-md border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Select an organization to view your dashboard.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (reportCounts === undefined || apps === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-4 w-4 animate-pulse rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-12 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Welcome state when everything is zero
  const isWelcomeState =
    reportCounts.total === 0 && apps.length === 0;

  if (isWelcomeState) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Card>
          <CardHeader>
            <CardTitle>Welcome to ShakeNbake Cloud</CardTitle>
            <CardDescription>
              Your hosted bug reporting platform. Get started by creating an app
              and configuring your SDK.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border border-border bg-muted/50 p-4">
              <h3 className="mb-2 text-sm font-semibold">Quick Start</h3>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                <li>
                  Navigate to <strong>Apps</strong> and create your first app
                </li>
                <li>Copy your API key and install the ShakeNbake SDK</li>
                <li>Shake your device to submit your first bug report</li>
                <li>View submitted reports here on the dashboard</li>
              </ol>
            </div>
            <div className="flex gap-3">
              <Button asChild>
                <Link href="/dashboard/apps">
                  <AppWindow className="h-4 w-4" />
                  Create an App
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reports
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reportCounts.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {reportCounts.critical}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {reportCounts.high}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Apps</CardTitle>
            <AppWindow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apps.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/reports"
              className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">View all reports</p>
                  <p className="text-xs text-muted-foreground">
                    Browse and filter bug reports
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/dashboard/apps"
              className="flex items-center justify-between rounded-md border border-border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <AppWindow className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Manage apps</p>
                  <p className="text-xs text-muted-foreground">
                    Configure apps and API keys
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
