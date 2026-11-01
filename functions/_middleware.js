const securityHeaders = {
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"X-Frame-Options": "DENY",
	"Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export async function onRequest({ request, next }) {
	const response = await next();
	const headers = new Headers(response.headers);
	for (const [name, value] of Object.entries(securityHeaders)) {
		headers.set(name, value);
	}
	if (new URL(request.url).pathname.startsWith("/api/")) {
		headers.set("Cache-Control", "no-store");
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}