import { proxyToBackend } from "@/lib/api/proxy";

// Every /api/* request is forwarded to Django. See src/lib/api/proxy.ts.
function handler(request: Request): Promise<Response> {
  return proxyToBackend(request);
}

export {
  handler as GET,
  handler as HEAD,
  handler as POST,
  handler as PUT,
  handler as PATCH,
  handler as DELETE,
};
