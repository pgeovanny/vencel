import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.116.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cors });

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes))
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed", message: "Método não permitido." }, 405);
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const displayName = String(payload.display_name || "").trim();

    if (!email.includes("@") || email.length > 254) {
      return json({ ok: false, error: "invalid_email", message: "Informe um e-mail válido." }, 400);
    }
    if (password.length < 8 || password.length > 72) {
      return json({ ok: false, error: "invalid_password", message: "A senha deve ter entre 8 e 72 caracteres." }, 400);
    }
    if (displayName.length < 2 || displayName.length > 60) {
      return json({ ok: false, error: "invalid_name", message: "Informe um nome válido." }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !service) {
      return json({ ok: false, error: "server_config", message: "Serviço temporariamente indisponível." }, 500);
    }

    const admin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const ip = (req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "unknown")
      .split(",")[0]
      .trim();
    const [ipKey, combinationKey] = await Promise.all([
      sha256(`signup-ip|${ip}`),
      sha256(`signup-ip-email|${ip}|${email}`),
    ]);

    // Two independent windows: changing the e-mail no longer bypasses the IP cap.
    const [ipRate, combinationRate] = await Promise.all([
      admin.rpc("check_signup_rate_limit", { p_key: ipKey, p_limit: 10, p_window_seconds: 900 }),
      admin.rpc("check_signup_rate_limit", { p_key: combinationKey, p_limit: 5, p_window_seconds: 900 }),
    ]);

    if (ipRate.error || combinationRate.error) {
      console.error("signup rate limit error", ipRate.error || combinationRate.error);
      return json({ ok: false, error: "server_busy", message: "Não foi possível criar a conta agora. Tente novamente em instantes." }, 503);
    }
    if (ipRate.data !== true || combinationRate.data !== true) {
      return json({ ok: false, error: "rate_limited", message: "Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente." }, 429);
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, signup_source: "public_web" },
      app_metadata: { signup_channel: "public_edge_v1" },
    });

    if (error) {
      const message = String(error.message || error);
      const duplicate = /already|registered|exists/i.test(message);
      return json(
        {
          ok: false,
          error: duplicate ? "already_registered" : "signup_failed",
          message: duplicate
            ? "Este e-mail já possui conta. Use Entrar ou a recuperação de senha."
            : "Não foi possível criar a conta agora.",
          code: (error as any).code ?? null,
        },
        duplicate ? 409 : 400,
      );
    }

    return json({ ok: true, user: { id: data.user.id, email: data.user.email } });
  } catch (error) {
    console.error(error);
    return json({ ok: false, error: "signup_exception", message: "Não foi possível criar a conta agora." }, 500);
  }
});
