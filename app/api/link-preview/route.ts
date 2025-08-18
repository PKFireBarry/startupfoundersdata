import { NextRequest, NextResponse } from "next/server";

function isLinkedInHost(host: string): boolean {
  const h = host.toLowerCase();
  return h === "linkedin.com" || h.endsWith(".linkedin.com");
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get("url");
    if (!target) {
      return NextResponse.json({ error: "Missing url param" }, { status: 400 });
    }

    let normalized: URL;
    try {
      normalized = new URL(target);
    } catch {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }

    if (!isLinkedInHost(normalized.hostname)) {
      // Only allow LinkedIn to avoid abuse; return null image gracefully
      return NextResponse.json({ image: null }, { status: 200 });
    }

    // Attempt to fetch the page HTML and extract og:image
    const res = await fetch(normalized.toString(), {
      // Send a common User-Agent to avoid trivial bot blocking
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      // Cache server-side to reduce repeated requests
      next: { revalidate: 60 * 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ image: null }, { status: 200 });
    }

    const html = await res.text();
    // Limit scan to first 1MB for safety
    const sample = html.slice(0, 1_000_000);

    // Try variants of the meta tag
    const patterns = [
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["'][^>]*>/i,
      /<meta[^>]*name=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    ];

    let image: string | null = null;
    for (const re of patterns) {
      const m = sample.match(re);
      if (m && m[1]) {
        image = m[1];
        break;
      }
    }

    return NextResponse.json({ image }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ image: null }, { status: 200 });
  }
}
