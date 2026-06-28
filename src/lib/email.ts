// Envio de email via Resend. Sem RESEND_API_KEY, regista na consola (dev) —
// permite testar todos os fluxos sem dependências. Em produção, define
// RESEND_API_KEY e (quando tiveres domínio verificado) EMAIL_FROM.
import { headers } from "next/headers";

type Attachment = { filename: string; content: string }; // content em base64
type SendArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Attachment[];
};

const FROM = process.env.EMAIL_FROM || "Kably <onboarding@resend.dev>";

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    const plain = args.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    console.log(
      `\n[email:dev] (sem RESEND_API_KEY — não enviado)\n  para: ${args.to}\n  assunto: ${args.subject}\n  conteúdo: ${plain.slice(0, 600)}\n`
    );
    return { ok: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        reply_to: args.replyTo,
        attachments: args.attachments,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error("[email] Resend erro", res.status, t);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] falha", e);
    return { ok: false, error: String(e) };
  }
}

/** URL base da app (para construir links em emails), a partir do pedido. */
export async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Molde simples e consistente para os emails do Kably. */
export function emailLayout(title: string, bodyHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
    <div style="font-size:20px;font-weight:bold;color:#1d4ed8;padding:8px 0">⚡ Kably</div>
    <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px">
      <h1 style="font-size:18px;margin:0 0 12px">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#94a3b8;text-align:center;padding:12px 0">
      Kably — orçamentação de obras de eletricidade
    </p>
  </div>`;
}

export function emailButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;margin:8px 0">${label}</a>`;
}
