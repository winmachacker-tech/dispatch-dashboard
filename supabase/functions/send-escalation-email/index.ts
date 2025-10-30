import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

serve(async (req) => {
  try {
    const body = await req.json();
    const { load_id, customer, driver, issue, severity, status, updated_at } = body || {};

    const subject = `🚨 Load Escalated: ${load_id ?? "Unknown"}`;
    const text = `
A load has been escalated in the Dispatch Dashboard.

📦 Load ID: ${load_id ?? "N/A"}
👤 Customer: ${customer ?? "N/A"}
🚛 Driver: ${driver ?? "N/A"}
⚠️ Issue: ${issue ?? "N/A"}
🔥 Severity: ${severity ?? "N/A"}
📍 Status: ${status ?? "N/A"}
🕓 Updated: ${updated_at ?? "N/A"}

Please review the issue immediately.
`;

    // Tip: for first send, you can set "from" to onboarding@resend.dev (works without domain verification)
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("Missing RESEND_API_KEY");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: ["mtishkun@hotmail.com"],
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const msg = await res.text();
      throw new Error(`Email send failed: ${res.status} ${msg}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
