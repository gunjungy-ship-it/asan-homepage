const JSON_HEADERS = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "no-referrer",
};

const PASSWORD_ITERATIONS = 600_000;
const SESSION_SECONDS = 60 * 60 * 8;
const DUMMY_SALT = new Uint8Array(16);
const DUMMY_HASH = new Uint8Array(32);
const encoder = new TextEncoder();

function timingSafeEqual(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) {
		difference |= left[index] ^ right[index];
	}
	return difference === 0;
}

function json(body, status, headers = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...JSON_HEADERS, ...headers },
	});
}

async function derivePassword(password, salt, iterations) {
	const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
	return new Uint8Array(
		await crypto.subtle.deriveBits(
			{ name: "PBKDF2", hash: "SHA-256", salt, iterations },
			key,
			256,
		),
	);
}

function decodeBase64(value) {
	try {
		return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
	} catch {
		return new Uint8Array();
	}
}

async function verifyPassword(password, encodedHash) {
	const parts = typeof encodedHash === "string" ? encodedHash.split("$") : [];
	const validFormat =
		parts.length === 4 &&
		parts[0] === "pbkdf2-sha256" &&
		/^\d{1,8}$/.test(parts[1]);
	const iterations = validFormat ? Number(parts[1]) : PASSWORD_ITERATIONS;
	if (iterations < 100_000 || iterations > 2_000_000) return false;
	const salt = validFormat ? decodeBase64(parts[2]) : DUMMY_SALT;
	const expected = validFormat ? decodeBase64(parts[3]) : DUMMY_HASH;
	if (salt.length !== 16 || expected.length !== 32) return false;
	const actual = await derivePassword(password, salt, iterations);
	return timingSafeEqual(actual, expected) && validFormat;
}

async function signSession(payload, secret) {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const encoded = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
	const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encoded)));
	const encodedSignature = btoa(String.fromCharCode(...signature))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/g, "");
	return `${encoded}.${encodedSignature}`;
}

export async function onRequestPost({ request, env }) {
	if (new URL(request.url).pathname !== "/api/auth/login") {
		return json({ error: "요청 주소가 올바르지 않습니다." }, 404);
	}
	if (!env.DB) return json({ error: "회원 DB가 아직 연결되지 않았습니다." }, 503);
	if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
		return json({ error: "로그인 보안 설정이 완료되지 않았습니다." }, 503);
	}
	if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
		return json({ error: "요청 형식이 올바르지 않습니다." }, 415);
	}
	const length = Number(request.headers.get("content-length") || 0);
	if (length > 8 * 1024) return json({ error: "요청이 너무 큽니다." }, 413);

	let payload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: "이메일과 비밀번호를 확인해 주세요." }, 400);
	}
	const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
	const password = typeof payload?.password === "string" ? payload.password : "";
	if (email.length > 254 || password.length === 0 || password.length > 128) {
		return json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, 400);
	}

	try {
		const user = await env.DB.prepare(
			"SELECT id, nickname, password_hash FROM users WHERE lower(email) = lower(?) AND deleted_at IS NULL LIMIT 1",
		)
			.bind(email)
			.first();

		const validPassword = await verifyPassword(password, user?.password_hash);
		if (!user || !validPassword) {
			return json({ error: "이메일 또는 비밀번호가 올바르지 않습니다." }, 401);
		}

		const now = Math.floor(Date.now() / 1000);
		const session = await signSession(
			{ sub: user.id, nickname: user.nickname, iat: now, exp: now + SESSION_SECONDS },
			env.SESSION_SECRET,
		);
		return json(
			{ ok: true, user: { id: user.id, nickname: user.nickname } },
			200,
			{
				"Set-Cookie": `asan_session=${session}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
			},
		);
	} catch (error) {
		console.error("User login failed:", error instanceof Error ? error.name : "UnknownError");
		return json({ error: "로그인 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
	}
}