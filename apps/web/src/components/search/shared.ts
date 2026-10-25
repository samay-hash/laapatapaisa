import { formatRupees } from "@/lib/labels";

export const rupees = (paise: number | null | undefined) =>
  paise == null ? null : formatRupees(Math.round(paise / 100));

export async function getJson<T>(
  url: string,
  init?: RequestInit,
): Promise<{ data?: T; error?: string; status: number }> {
  try {
    const res = await fetch(url, init);
    const body = await res.json().catch(() => ({}));
    return res.ok
      ? { data: body as T, status: res.status }
      : { error: body.error ?? "Something went wrong.", status: res.status };
  } catch {
    return { error: "Could not reach the server. Check your connection.", status: 0 };
  }
}

export const isPin = (v: string) => /^[1-9]\d{5}$/.test(v);
