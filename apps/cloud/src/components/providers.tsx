"use client";

import { ReactNode } from "react";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: ReactNode }) {
  if (!convex || !clerkKey) {
    if (process.env.NODE_ENV === "development") {
      return (
        <div style={{ padding: "2rem", fontFamily: "monospace" }}>
          <h2>Missing environment variable</h2>
          <p>
            Set <code>NEXT_PUBLIC_CONVEX_URL</code> and{" "}
            <code>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> in your{" "}
            <code>.env.local</code> file to connect to Convex and Clerk.
          </p>
          <p>
            Example: <code>NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud</code>
          </p>
        </div>
      );
    }
    // In production, render children without Convex/Clerk to allow static pages to work.
    // Protected routes will fail at runtime if env vars are not set.
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={clerkKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
