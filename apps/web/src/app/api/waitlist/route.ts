import { ConvexHttpClient } from "convex/browser";
import { NextRequest, NextResponse } from "next/server";
import { api } from "@packages/backend/convex/_generated/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    source?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const source = typeof body?.source === "string" ? body.source : "landing";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return NextResponse.json(
      { error: "Waitlist is not configured." },
      { status: 500 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  const saved = await convex.mutation(api.waitlist.saveSignup, {
    email,
    source,
  });

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (webhookUrl && saved.created) {
    await notifyDiscord(webhookUrl, email, source).catch((error) => {
      console.error("discord waitlist notification failed", error);
    });
  }

  return NextResponse.json({ ok: true, created: saved.created });
}

async function notifyDiscord(webhookUrl: string, email: string, source: string) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: null,
      allowed_mentions: { parse: [] },
      embeds: [
        {
          title: "New Sohoist waitlist signup",
          color: 0x8fafb3,
          fields: [
            { name: "Email", value: email },
            { name: "Source", value: source },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed: ${response.status}`);
  }
}
