const ALLOWED_CATEGORIES = new Set(["tourism", "onsen", "website", "suggestion"]);
const MAX_REQUEST_BYTES = 16 * 1024;
const JSON_HEADERS = {
	"Content-Type": "application/json; charset=utf-8",
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
};

function json(body, status) {
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function onRequestGet({ env }) {
	if (!env.DB) {
		return json({ ready: false }, 503);
	}

	try {
		const schema = await env.DB.prepare(
			"SELECT name FROM sqlite_master WHERE type = ? AND name = ? LIMIT 1",
		)
			.bind("table", "inquiries")
			.first();

		if (!schema) {
			return json({ ready: false }, 503);
		}

		return json({ ready: true }, 200);
	} catch (error) {
		console.error("Inquiry database health check failed:", error);
		return json({ ready: false }, 503);
	}
}

async function insertInquiry(request, env) {
	if (!env.DB) {
		return json({ error: "문의 저장소가 아직 설정되지 않았습니다." }, 503);
	}
	if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
		return json({ error: "JSON 형식으로 문의를 보내 주세요." }, 415);
	}

	const contentLength = Number(request.headers.get("content-length") || 0);
	if (contentLength > MAX_REQUEST_BYTES) {
		return json({ error: "문의 요청이 너무 큽니다." }, 413);
	}

	let payload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: "요청 내용을 JSON으로 읽을 수 없습니다." }, 400);
	}

	if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
		return json({ error: "문의 내용의 형식이 올바르지 않습니다." }, 400);
	}

	const { category, subject, message } = payload;
	if (typeof category !== "string" || !ALLOWED_CATEGORIES.has(category)) {
		return json({ error: "문의 유형을 선택해 주세요." }, 400);
	}
	if (typeof subject !== "string" || subject.trim().length < 2 || subject.trim().length > 120) {
		return json({ error: "제목은 2~120자 사이로 입력해 주세요." }, 400);
	}
	if (typeof message !== "string" || message.trim().length < 5 || message.trim().length > 5000) {
		return json({ error: "문의 내용은 5~5000자 사이로 입력해 주세요." }, 400);
	}

	try {
		const result = await env.DB.prepare(
			"INSERT INTO inquiries (category, subject, message) VALUES (?, ?, ?)",
		)
			.bind(category, subject.trim(), message.trim())
			.run();

		if (!result.success) {
			throw new Error("D1 insert failed");
		}

		return json({ ok: true, id: result.meta.last_row_id }, 201);
	} catch (error) {
		console.error("Failed to store inquiry:", error);
		return json({ error: "문의 저장에 실패했습니다. 잠시 후 다시 시도해 주세요." }, 500);
	}
}

export async function onRequestPost({ request, env }) {
	return insertInquiry(request, env);
}