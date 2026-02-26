"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Platform, platformConfig } from "@/lib/constants";
import { formatDate } from "@/lib/format";

interface AppCardProps {
  appId: string;
  name: string;
  platform: Platform;
  createdAt: number;
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
