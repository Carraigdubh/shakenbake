import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
          },
        }}
        fallbackRedirectUrl="/dashboard"
      />
    </main>
  );
}
