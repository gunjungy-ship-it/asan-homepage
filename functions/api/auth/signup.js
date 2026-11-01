const JSON_HEADERS = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
	"Referrer-Policy": "no-referrer",
};

const ALLOWED_GENDERS = new Set(["female", "male", "undisclosed"]);
const MAX_REQUEST_BYTES = 16 * 1024;
const PASSWORD_ITERATIONS = 600_000;

function json(body, status) {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function hasControlCharacters(value) {
	return /[\u0000-\u001f\u007f]/.test(value);
}

async function hashPassword(password, salt) {
	const encoder = new TextEncoder();
	const material = await crypto.subtle.importKey(
		"raw",
		encoder.encode(password),
		"PBKDF2",
		false,
		["deriveBits"],
	);
	const derived = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_ITERATIONS },
		material,
		256,
	);
	return btoa(String.fromCharCode(...new Uint8Array(derived)));
}

function validEmail(email) {
	if (email.length > 254 || /[\s\u0000-\u001f\u007f]/.test(email)) return false;
	const parts = email.split("@");
	if (parts.length !== 2 || parts[0].length === 0 || parts[0].length > 64) return false;
	return parts[1].includes(".") && !parts[1].startsWith(".") && !parts[1].endsWith(".");
}

export async function onRequestPost({ request, env }) {
	if (new URL(request.url).pathname !== "/api/auth/signup") {
		return json({ error: "요청 주소가 올바르지 않습니다." }, 404);
	}
	if (!env.DB) return json({ error: "회원 DB가 아직 연결되지 않았습니다." }, 503);
	if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
		return json({ error: "요청 형식이 올바르지 않습니다." }, 415);
	}
	const length = Number(request.headers.get("content-length") || 0);
	if (length > MAX_REQUEST_BYTES) return json({ error: "요청이 너무 큽니다." }, 413);

	let payload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: "요청 내용을 확인해 주세요." }, 400);
	}
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return json({ error: "요청 내용이 올바르지 않습니다." }, 400);
	}

	const nickname = typeof payload.nickname === "string" ? payload.nickname.trim() : "";
	const email = typeof payload.email === "string" ? payload.email.trim() : "";
	const password = typeof payload.password === "string" ? payload.password : "";
	const gender = payload.gender === "" || payload.gender == null ? null : payload.gender;
	const homeAddress = typeof payload.homeAddress === "string" ? payload.homeAddress.trim() : "";

	if (nickname.length < 2 || nickname.length > 50 || hasControlCharacters(nickname)) {
		return json({ error: "닉네임은 2~50자로 입력해 주세요." }, 400);
	}
	if (!validEmail(email)) return json({ error: "올바른 이메일 주소를 입력해 주세요." }, 400);
	if (password.length < 12 || password.length > 128) {
		return json({ error: "비밀번호는 12~128자로 입력해 주세요." }, 400);
	}
	if (gender !== null && (typeof gender !== "string" || !ALLOWED_GENDERS.has(gender))) {
		return json({ error: "성별 선택값이 올바르지 않습니다." }, 400);
	}
	if (homeAddress.length > 500 || (homeAddress && hasControlCharacters(homeAddress))) {
		return json({ error: "주소는 500자 이내로 입력해 주세요." }, 400);
	}

	try {
		const salt = crypto.getRandomValues(new Uint8Array(16));
		const passwordHash = `pbkdf2-sha256$${PASSWORD_ITERATIONS}$${btoa(String.fromCharCode(...salt))}$${await hashPassword(password, salt)}`;
		const accountInsert = env.DB.prepare(
			"INSERT INTO users (nickname, email, password_hash) VALUES (?, ?, ?)",
		).bind(nickname, email.toLowerCase(), passwordHash);
		const profileInsert = env.DB.prepare(
			"INSERT INTO user_profiles (user_id, gender_code, home_address) " +
			"SELECT id, ?, ? FROM users WHERE lower(email) = lower(?)",
		).bind(gender, homeAddress || null, email.toLowerCase());
		const [accountResult, profileResult] = await env.DB.batch([accountInsert, profileInsert]);

		if (!accountResult.success || !profileResult.success || profileResult.meta.changes !== 1) {
			throw new Error("D1 account/profile transaction failed");
		}
		return json({ ok: true, id: accountResult.meta.last_row_id, nickname }, 201);
	} catch (error) {
		if (error instanceof Error && /unique constraint failed/i.test(error.message)) {
			return json({ error: "이미 가입된 이메일 주소입니다." }, 409);
		}
		console.error("User signup failed:", error instanceof Error ? error.name : "UnknownError");
		return json({ error: "회원가입 처리에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
	}
}