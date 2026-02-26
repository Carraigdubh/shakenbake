"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { useOrganization } from "@clerk/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiKeyDisplay, NewKeyBanner } from "@/components/api-key-display";
import {
  ArrowLeft,
  Key,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { type Platform, platformConfig } from "@/lib/constants";
import { formatDate } from "@/lib/format";

function escapeForCode(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/`/g, "\\`");
}

function getSetupSnippet(platform: Platform, appName: string): string {
  const escaped = escapeForCode(appName);

  if (platform === "web") {
    return `// Install the SDK
npm install @shakenbake/web @shakenbake/linear

// Initialize in your app
import { ShakeNbake } from '@shakenbake/web';

ShakeNbake.init({
  apiKey: 'YOUR_API_KEY',
  app: '${escaped}',
});`;
  }

  if (platform === "ios" || platform === "android" || platform === "universal") {
    return `// Install the SDK
npx expo install @shakenbake/react-native

// Wrap your app with the provider
import { ShakeNbakeProvider } from '@shakenbake/react-native';

export default function App() {
  return (
    <ShakeNbakeProvider
      apiKey="YOUR_API_KEY"
      app="${escaped}"
    >
      {/* Your app content */}
    </ShakeNbakeProvider>
  );
}`;
  }

  return "";
}

export default function AppDetailPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = use(params);
  const router = useRouter();
  const { organization } = useOrganization();

  const [newKey, setNewKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get the Convex organization record
  const convexOrg = useQuery(
    api.organizations.getOrganization,
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );

  const orgId = convexOrg?._id as Id<"organizations"> | undefined;

  // Fetch app details and API keys
  const app = useQuery(
    api.apps.getApp,
    appId ? { appId: appId as Id<"apps"> } : "skip"
  );
  const apiKeys = useQuery(
    api.apiKeys.listApiKeys,
    appId ? { appId: appId as Id<"apps"> } : "skip"
  );

  const generateApiKey = useMutation(api.apiKeys.generateApiKey);
  const revokeApiKey = useMutation(api.apiKeys.revokeApiKey);
  const deleteApp = useMutation(api.apps.deleteApp);

  async function handleGenerateKey() {
    if (!orgId) return;

    setIsGenerating(true);
    try {
      const key = await generateApiKey({
        appId: appId as Id<"apps">,
        orgId,
      });
      setNewKey(key);
    } catch (error) {
      console.error("Failed to generate API key:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleRevokeKey(keyId: string) {
    try {
      await revokeApiKey({ keyId: keyId as Id<"apiKeys"> });
    } catch (error) {
      console.error("Failed to revoke API key:", error);
    }
  }

  async function handleDeleteApp() {
    setIsDeleting(true);
    try {
      await deleteApp({ appId: appId as Id<"apps"> });
      router.push("/dashboard/apps");
    } catch (error) {
      console.error("Failed to delete app:", error);
      setIsDeleting(false);
    }
  }

  // Loading states
  if (app === undefined || apiKeys === undefined) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/apps"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">App Details</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (app === null) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/apps"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">App Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              This app does not exist or has been deleted.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/apps">Back to Apps</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const config = platformConfig[app.platform];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard/apps"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Back to apps"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
      </div>

      {/* App Info */}
      <Card>
        <CardHeader>
          <CardTitle>App Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Name
              </dt>
              <dd className="mt-1 text-sm">{app.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Platform
              </dt>
              <dd className="mt-1">
                <Badge variant="outline" className={config.className}>
                  {config.label}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">
                Created
              </dt>
              <dd className="mt-1 text-sm">{formatDate(app.createdAt)}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>
                Manage API keys for this app. Keys are used to authenticate SDK
                requests.
              </CardDescription>
            </div>
            <Button onClick={handleGenerateKey} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Generate Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* New key banner */}
          {newKey && <NewKeyBanner fullKey={newKey} />}

          {/* Keys table */}
          {apiKeys.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-8 text-center">
              <Key className="mx-auto h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No API keys yet. Generate one to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((keyDoc) => (
                  <TableRow key={keyDoc._id}>
                    <TableCell colSpan={4} className="p-0">
                      <ApiKeyDisplay
                        keyId={keyDoc._id}
                        maskedKey={keyDoc.key}
                        isActive={keyDoc.isActive}
                        createdAt={keyDoc.createdAt}
                        onRevoke={handleRevokeKey}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
          <CardDescription>
            Get started by installing the ShakeNbake SDK in your project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
            <code>{getSetupSnippet(app.platform, app.name)}</code>
          </pre>
        </CardContent>
      </Card>

      {/* Danger Zone - Delete App */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible and destructive actions for this app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-destructive/30 p-4">
            <div>
              <p className="text-sm font-medium">Delete this app</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this app and all of its API keys. This action
                cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />
              Delete App
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete app</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{app.name}</strong>? This
              will permanently delete the app and all of its API keys. Any
              applications using these keys will stop working.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteApp}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
