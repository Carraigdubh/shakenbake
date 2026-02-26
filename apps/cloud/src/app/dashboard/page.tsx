import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DashboardPage() {
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
              <li>Create an organization using the switcher above</li>
              <li>
                Navigate to <strong>Apps</strong> and create your first app
              </li>
              <li>Copy your API key and install the ShakeNbake SDK</li>
              <li>Shake your device to submit your first bug report</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
