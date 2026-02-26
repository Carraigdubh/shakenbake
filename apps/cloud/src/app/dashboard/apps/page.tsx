"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppCard } from "@/components/app-card";
import { Plus, AppWindow, Loader2 } from "lucide-react";

type Platform = "ios" | "android" | "web" | "universal";

export default function AppsPage() {
  const { organization } = useOrganization();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [appName, setAppName] = useState("");
  const [platform, setPlatform] = useState<Platform>("web");
  const [isCreating, setIsCreating] = useState(false);

  // Get the Convex organization record from the Clerk org ID
  const convexOrg = useQuery(
    api.organizations.getOrganization,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const orgId = convexOrg?._id as Id<"organizations"> | undefined;

  // Fetch apps for this organization
  const apps = useQuery(api.apps.listApps, orgId ? { orgId } : "skip");

  const createApp = useMutation(api.apps.createApp);

  async function handleCreateApp() {
    if (!appName.trim() || !orgId) return;

    setIsCreating(true);
    try {
      await createApp({
        name: appName.trim(),
        platform,
        orgId,
      });
      setAppName("");
      setPlatform("web");
      setDialogOpen(false);
    } catch (error) {
      console.error("Failed to create app:", error);
    } finally {
      setIsCreating(false);
    }
  }

  // Loading state: organization or apps not yet loaded
  if (!organization) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
        <div className="rounded-md border border-border bg-muted/50 p-8 text-center">
          <p className="text-muted-foreground">
            Select an organization to view your apps.
          </p>
        </div>
      </div>
    );
  }

  if (apps === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading apps...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Apps</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Create App
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create a new app</DialogTitle>
              <DialogDescription>
                Add a new app to start collecting bug reports. You will receive
                an API key to integrate the ShakeNbake SDK.
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateApp();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="app-name">App name</Label>
                <Input
                  id="app-name"
                  placeholder="My App"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app-platform">Platform</Label>
                <Select
                  value={platform}
                  onValueChange={(value) => setPlatform(value as Platform)}
                >
                  <SelectTrigger className="w-full" id="app-platform">
                    <SelectValue placeholder="Select a platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ios">iOS</SelectItem>
                    <SelectItem value="android">Android</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="universal">Universal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={!appName.trim() || isCreating}>
                  {isCreating && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Create App
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {apps.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <AppWindow className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h2 className="mt-4 text-lg font-semibold">No apps yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first app to start collecting bug reports.
          </p>
          <Button
            className="mt-4"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create your first app
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard
              key={app._id}
              appId={app._id}
              name={app.name}
              platform={app.platform}
              createdAt={app.createdAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
