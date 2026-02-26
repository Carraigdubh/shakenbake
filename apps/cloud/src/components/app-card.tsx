"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Platform = "ios" | "android" | "web" | "universal";

interface AppCardProps {
  appId: string;
  name: string;
  platform: Platform;
  createdAt: number;
}

const platformConfig: Record<
  Platform,
  { label: string; className: string }
> = {
  ios: {
    label: "iOS",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  android: {
    label: "Android",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  web: {
    label: "Web",
    className:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
  universal: {
    label: "Universal",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  },
};

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AppCard({ appId, name, platform, createdAt }: AppCardProps) {
  const config = platformConfig[platform];

  return (
    <Link
      href={`/dashboard/apps/${appId}`}
      className="block transition-shadow hover:shadow-md rounded-xl"
    >
      <Card className="h-full cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{name}</CardTitle>
            <Badge variant="outline" className={config.className}>
              {config.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Created {formatDate(createdAt)}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
