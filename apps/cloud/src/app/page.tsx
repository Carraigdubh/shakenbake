import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Camera,
  Pencil,
  Smartphone,
  Zap,
  Package,
  Key,
  ShieldCheck,
  Check,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="text-xl font-bold">
            ShakeNbake
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="#features"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              How It Works
            </Link>
            <Link
              href="#pricing"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Pricing
            </Link>
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-24 text-center sm:py-32">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Bug Reporting
            <br />
            That Just Works
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Shake your device, capture a screenshot, annotate it, and submit.
            ShakeNbake handles the rest -- from device context to your issue
            tracker.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/sign-up">
              <Button size="lg">Get Started Free</Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="lg">
                Learn More
              </Button>
            </Link>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-border bg-muted/40 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Everything you need for bug reporting
              </h2>
              <p className="mt-4 text-muted-foreground">
                A complete SDK that captures context automatically so your team
                can fix bugs faster.
              </p>
            </div>

            <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Screenshot Capture</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    One shake captures everything. Automatic screenshot of the
                    current screen with zero configuration.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Pencil className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Annotation Tools</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Draw, highlight, and mark up screenshots with GPU-accelerated
                    annotation tools built on Skia.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Smartphone className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Device Context</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Automatically collects device info, network state, battery
                    level, and more with every report.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Zap className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Linear Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Bug reports become Linear issues instantly. Screenshots
                    attached, context included, ready for your team.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Up and running in minutes
              </h2>
              <p className="mt-4 text-muted-foreground">
                Three simple steps to start collecting bug reports from your
                users.
              </p>
            </div>

            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Package className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">1. Install SDK</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add the ShakeNbake package to your React Native or web project
                  with a single install command.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Key className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  2. Configure API Key
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Create an app in the dashboard, copy your API key, and add it
                  to your configuration.
                </p>
              </div>

              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">
                  3. Shake to Report
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Shake your device or press the keyboard shortcut. Screenshot,
                  annotate, submit -- done.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border bg-muted/40 py-24">
          <div className="mx-auto max-w-6xl px-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight">
                Simple, transparent pricing
              </h2>
              <p className="mt-4 text-muted-foreground">
                One plan. Everything included. No surprises.
              </p>
            </div>

            <Card className="mx-auto mt-12 max-w-sm">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$10</span>
                  <span className="text-muted-foreground">/month per workspace</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Unlimited apps",
                    "Unlimited bug reports",
                    "Screenshot capture and annotation",
                    "Audio recording with transcription",
                    "Automatic device context",
                    "Linear integration",
                    "Team collaboration",
                    "Priority support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Link href="/sign-up">
                    <Button className="w-full" size="lg">
                      Start Free Trial
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <h3 className="text-sm font-semibold">ShakeNbake</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Open-source bug reporting SDK for mobile and web apps.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Product</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link
                    href="#features"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-up"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Resources</h3>
              <ul className="mt-2 space-y-1">
                <li>
                  <Link
                    href="https://github.com/shakenbake"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link
                    href="/sign-in"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ShakeNbake. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
