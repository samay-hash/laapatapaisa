import { NextResponse, type NextRequest } from "next/server";
import { pinFrom } from "@/lib/scan/document";
import {
  SCAN_MEDIA_TYPES,
  ScanError,
  scanDocument,
  scanEnabled,
  type ScanMediaType,
} from "@/server/document-scan";
import { guard, logEvent, RateLimitError } from "@/server/rate-limit";
import { getCurrentUser } from "@/server/session";

const MAX_BYTES = 4 * 1024 * 1024;

function error(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest) {
  if (!scanEnabled) return error("Scanning is not switched on yet.", 503);
  const user = await getCurrentUser();
  if (!user) return error("Log in to scan papers.", 401);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return error("Choose a photo of the paper.", 400);
  if (!SCAN_MEDIA_TYPES.includes(file.type as ScanMediaType)) {
    return error("Use a JPEG, PNG or WebP photo, or a PDF.", 415);
  }
  if (file.size > MAX_BYTES)
    return error("The file is larger than 4 MB. Use a smaller photo.", 413);

  try {
    const ipHash = await guard("scan", user.id);
    const doc = await scanDocument(
      Buffer.from(await file.arrayBuffer()),
      file.type as ScanMediaType,
    );
    // Log that a scan happened, never what the paper said.
    await logEvent("scan", ipHash, user.id, pinFrom(doc), doc.documentType, 1);
    return NextResponse.json(doc, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof RateLimitError) return error(e.message, 429);
    if (e instanceof ScanError) return error(e.message, 422);
    console.error(e);
    return error("Something went wrong. Try again.", 500);
  }
}
