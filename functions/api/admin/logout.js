import { clearSessionCookie, json } from "../../_lib/auth.js";

export const onRequestPost = ({ request }) => json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
