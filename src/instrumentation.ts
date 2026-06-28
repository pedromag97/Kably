// Captura erros de servidor (páginas, route handlers, server actions).
export async function onRequestError(
  err: unknown,
  request: { path?: string; method?: string },
  context: { routerKind?: string; routePath?: string }
) {
  const { captureError } = await import("./lib/monitoring");
  await captureError(err, {
    path: request?.path,
    method: request?.method,
    route: context?.routePath,
  });
}
