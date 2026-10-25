import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ScannedDocument } from "@/lib/scan/document";
import { env } from "@/server/env";

// Reads a photo of an old financial paper and returns its details. The image
// is sent to Claude and never stored by us; only the extracted fields come back.

export const scanEnabled = Boolean(env.ANTHROPIC_API_KEY);

export const SCAN_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export type ScanMediaType = (typeof SCAN_MEDIA_TYPES)[number];

const client = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 2 })
  : null;

const SYSTEM = `You read photos and scans of old Indian financial papers for families trying to recover unclaimed money: bank passbooks, fixed deposit receipts, share certificates, dividend warrants, letters from companies or registrars, LIC and other insurance policies, premium receipts, mutual fund statements, provident fund slips, and post office NSC/KVP certificates.

Copy what is printed or handwritten on the paper. If a field is not visible or you cannot read it with confidence, return null (or an empty list) rather than guessing. Write names and addresses in English letters; if the paper is in Hindi or another Indian script, transliterate it. Keep reference numbers exactly as printed, including letters, slashes and leading zeros. Amounts are in rupees as plain numbers.

If the image is not a financial paper, set documentType to "not_a_financial_paper" and leave the other fields empty. Use notes for anything that matters to a claim, such as a "paid" or "cancelled" stamp, a maturity date that has passed, or a nominee. Never repeat Aadhaar or PAN numbers in any field; leave them out.`;

export class ScanError extends Error {}

export async function scanDocument(
  data: Buffer,
  mediaType: ScanMediaType,
): Promise<ScannedDocument> {
  if (!client) throw new ScanError("Scanning is not set up yet.");

  const file: Anthropic.Beta.BetaContentBlockParam =
    mediaType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: data.toString("base64") },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: mediaType, data: data.toString("base64") },
        };

  let response;
  try {
    response = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      // A refused request is retried on a fallback model chosen by the API.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(ScannedDocument) },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [file, { type: "text", text: "Read this paper and return its details." }],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      throw new ScanError("The reader is busy. Try again in a minute.");
    }
    if (error instanceof Anthropic.BadRequestError) {
      throw new ScanError("This file could not be read. Try a clearer photo in JPEG or PNG.");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Scan failed", error.status, error.message);
      throw new ScanError("The reader is not available right now. Try again shortly.");
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new ScanError("This paper could not be read. Try a clearer photo.");
  }
  return response.parsed_output;
}
