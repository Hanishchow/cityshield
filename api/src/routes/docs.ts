import type { FastifyInstance } from 'fastify';
import { buildOpenApiDocument } from '../openapi.ts';

/**
 * Documentation routes. The spec is generated fresh on each request so it
 * always reflects the current route registration, not a snapshot committed
 * to disk and forgotten.
 */
export default async function docsRoutes(app: FastifyInstance) {
  app.get('/openapi.json', async (_req, reply) => {
    return reply
      .header('content-type', 'application/json; charset=utf-8')
      .send(buildOpenApiDocument());
  });

  app.get('/docs', async (_req, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>City Shield API Docs</title>
  <style>body{margin:0;font-family:system-ui,sans-serif;background:#0d1117;color:#c9d1d9}</style>
</head>
<body>
  <script
    id="api-reference"
    data-url="/openapi.json"
    data-theme="dark">
  </script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference@latest/dist/browser/standalone.js"></script>
</body>
</html>`;
    return reply
      .header('content-type', 'text/html; charset=utf-8')
      .send(html);
  });
}
