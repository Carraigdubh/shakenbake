"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Check, Trash2, AlertTriangle } from "lucide-react";

interface ApiKeyDisplayProps {
  keyId: string;
  maskedKey: string;
  isActive: boolean;
  createdAt: number;
  /** The full key value, only available immediately after generation. */
  fullKey?: string;
  onRevoke: (keyId: string) => void;
  isRevoking?: boolean;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ApiKeyDisplay({
  keyId,
  maskedKey,
  isActive,
  createdAt,
  fullKey,
  onRevoke,
  isRevoking,
}: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);

  async function handleCopy() {
    const textToCopy = fullKey || maskedKey;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  function handleConfirmRevoke() {
    onRevoke(keyId);
    setRevokeDialogOpen(false);
  }

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <code className="rounded bg-muted px-2 py-1 text-sm font-mono truncate">
          {fullKey || maskedKey}
        </code>
        <Badge
          variant={isActive ? "secondary" : "destructive"}
          className="shrink-0"
        >
          {isActive ? "Active" : "Revoked"}
        </Badge>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          {formatDate(createdAt)}
        </span>

        {(fullKey || isActive) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            aria-label={copied ? "Copied" : "Copy API key"}
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}

        {isActive && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRevokeDialogOpen(true)}
              disabled={isRevoking}
              aria-label="Revoke API key"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>

            <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Revoke API key</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to revoke this API key? Any
                    applications using this key will no longer be able to submit
                    bug reports.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setRevokeDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={handleConfirmRevoke}>
                    Revoke Key
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}

interface NewKeyBannerProps {
  fullKey: string;
}

export function NewKeyBanner({ fullKey }: NewKeyBannerProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="space-y-2 min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Copy your API key now -- it will not be shown again
          </p>
          <div className="flex items-center gap-2">
            <code className="rounded bg-white px-3 py-1.5 text-sm font-mono dark:bg-amber-900 break-all">
              {fullKey}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
