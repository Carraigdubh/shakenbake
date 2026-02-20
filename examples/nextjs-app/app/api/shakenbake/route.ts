import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LinearAdapter } from '@shakenbake/linear';
import type { BugReport } from '@shakenbake/core';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLinearAdapter(): LinearAdapter {
  const apiKey = process.env.LINEAR_API_KEY;
  const teamId = process.env.LINEAR_TEAM_ID;

  if (!apiKey || !teamId) {
    throw new Error(
      'LINEAR_API_KEY and LINEAR_TEAM_ID must be set in environment variables.',
    );
  }

  return new LinearAdapter({ apiKey, teamId });
}

// ---------------------------------------------------------------------------
// GET /api/shakenbake — health check
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const adapter = getLinearAdapter();
    const ok = await adapter.testConnection();
    return NextResponse.json({ status: ok ? 'ok' : 'unhealthy' }, { status: ok ? 200 : 503 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/shakenbake — route based on Content-Type
//   - multipart/form-data  -> image upload
//   - application/json     -> issue creation
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') ?? '';

  // Image upload (from ProxyAdapter.uploadImage)
  if (contentType.includes('multipart/form-data')) {
    return handleUpload(request);
  }

  // Issue creation (from ProxyAdapter.createIssue)
  return handleIssue(request);
}

// ---------------------------------------------------------------------------
// Upload handler
// ---------------------------------------------------------------------------

async function handleUpload(request: NextRequest): Promise<NextResponse> {
  try {
    const adapter = getLinearAdapter();
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Missing file in form data' },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const filename =
      file instanceof File ? file.name : 'screenshot.png';
    const url = await adapter.uploadImage(buffer, filename);

    return NextResponse.json({ url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// Issue handler
// ---------------------------------------------------------------------------

async function handleIssue(request: NextRequest): Promise<NextResponse> {
  try {
    const adapter = getLinearAdapter();
    const report = (await request.json()) as BugReport;
    const result = await adapter.createIssue(report);

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Issue creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
