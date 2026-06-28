// Captura de erros. Regista sempre na consola (visível nos logs do Railway);
// se SENTRY_DSN estiver definido, envia também para o Sentry (envelope HTTP,
// sem SDK pesado — compatível com qualquer versão de Next).
import crypto from "node:crypto";

export async function captureError(
  err: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error("[erro]", e.message, context ?? "", "\n", e.stack);

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    const m = dsn.match(/^https:\/\/([^@]+)@([^/]+)\/(.+)$/);
    if (!m) return;
    const [, key, host, project] = m;
    const eventId = crypto.randomUUID().replace(/-/g, "");
    const sentAt = new Date().toISOString();
    const event = {
      event_id: eventId,
      timestamp: sentAt,
      platform: "node",
      level: "error",
      exception: { values: [{ type: e.name, value: e.message }] },
      extra: context,
    };
    const envelope =
      `${JSON.stringify({ event_id: eventId, sent_at: sentAt })}\n` +
      `${JSON.stringify({ type: "event" })}\n` +
      `${JSON.stringify(event)}\n`;
    await fetch(`https://${host}/api/${project}/envelope/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=kably/1.0`,
      },
      body: envelope,
    });
  } catch (sendErr) {
    console.error("[monitoring] falha ao enviar para Sentry", sendErr);
  }
}
