import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabase } from "./supabase/server";
import { supabaseConfigured } from "./env";
import { costUsd, type ErrorCode, type TokenUsage } from "./ai/cost";

/** Model calls allowed per user per trailing hour. */
const CALLS_PER_HOUR = 60;
const WINDOW_MS = 60 * 60 * 1000;

/** What a finished model call is worth knowing about. */
export interface CallRecord {
  /** The pipeline step, which is finer than the route: /api/express serves both
   *  express and explain, and they cost different amounts. */
  label: string;
  model?: string;
  usage?: TokenUsage;
  latencyMs: number;
  attempts: number;
  ok: boolean;
  errorCode?: ErrorCode;
}

export interface Caller {
  /** null in localStorage-only mode, where there is no identity to scope to. */
  userId: string | null;
  supabase: SupabaseClient | null;
  /** Correlates this request's log lines, its ai_calls row, and the
   *  x-request-id the user is shown when something goes wrong. */
  requestId: string;
  /**
   * Fill in what the call actually cost. Fire-and-forget by contract: it never
   * throws, never blocks the response, and a failure to record is a warning in
   * the logs — metering must not be able to break work the user is entitled to.
   */
  record(r: CallRecord): void;
}

const noRecord = () => {};

/**
 * A failure the user can quote back.
 *
 * The same id appears on this response, in the route's log lines, and on the
 * `ai_calls` row for the call that failed — so "it broke, here's the reference"
 * is one grep rather than a guess at which of today's requests they meant.
 */
export function fail(caller: Caller, error: string, status: number): Response {
  return Response.json(
    { error, requestId: caller.requestId },
    { status, headers: { "x-request-id": caller.requestId } },
  );
}

/**
 * Pages are gated in proxy.ts, but that matcher deliberately excludes /api — so
 * without a check here every model route is an open wallet against the server's
 * provider key. Guarding in-route rather than widening the matcher keeps
 * per-route control: /api/news and /api/radar are read-only and stay public,
 * and cron carries its own shared secret.
 *
 * When Supabase isn't configured the app runs single-user out of localStorage:
 * there is no identity to check and no shared resource to protect, so allow.
 */
async function currentUser(): Promise<Caller | Response> {
  const requestId = crypto.randomUUID();
  if (!supabaseConfigured) return { userId: null, supabase: null, requestId, record: noRecord };

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  return { userId: user.id, supabase, requestId, record: noRecord };
}

/** Auth only — for routes that read status but spend nothing. */
export async function requireUser(): Promise<Caller | Response> {
  return currentUser();
}

/**
 * Auth + hourly budget, for every route that spends the server's model key.
 * Returns a Response to send back on refusal, or the caller on success.
 *
 * ponytail: fixed window, counted in Postgres. A user can burst up to 2x the
 * limit across a window boundary, which is fine for a personal tool. Move to a
 * sliding window (or Redis) only if this serves untrusted multi-tenant traffic.
 */
export async function guard(route: string): Promise<Caller | Response> {
  const caller = await currentUser();
  if (caller instanceof Response) return caller;
  if (!caller.userId || !caller.supabase) return caller;
  const { userId, supabase } = caller;

  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await supabase
    .from("ai_calls")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gt("created_at", since);

  if ((count ?? 0) >= CALLS_PER_HOUR) {
    return fail(caller, "rate_limited", 429);
  }

  // The row is written BEFORE the work, so the limit bites on calls that never
  // finish — a retry storm is exactly when you want it counted. `record` fills
  // the rest in afterwards.
  //
  // Metering must not fail a request the user is entitled to: until migration
  // 0009 is applied the table is missing, and the limit simply doesn't bite.
  const id = crypto.randomUUID();
  const { error } = await supabase
    .from("ai_calls")
    .insert({ id, user_id: userId, route, request_id: caller.requestId });
  if (error) console.warn(`[guard] ai_calls insert failed for ${route}: ${error.message}`);

  return {
    ...caller,
    record(r: CallRecord) {
      const cost = costUsd(r.model, r.usage);
      console.info(
        `[${r.label}] ${r.ok ? "ok" : `fail:${r.errorCode}`} model=${r.model ?? "?"} ` +
          `attempts=${r.attempts} ms=${r.latencyMs} ` +
          `tokens=${r.usage?.inputTokens ?? "?"}/${r.usage?.outputTokens ?? "?"} ` +
          `cost=${cost === null ? "unpriced" : `$${cost}`} rid=${caller.requestId}`,
      );
      // Deliberately not awaited: the user's response should not wait on
      // bookkeeping, and a metering failure must not surface as a failed action.
      void supabase
        .from("ai_calls")
        .update({
          label: r.label,
          model: r.model ?? null,
          input_tokens: r.usage?.inputTokens ?? null,
          output_tokens: r.usage?.outputTokens ?? null,
          cost_usd: cost,
          latency_ms: r.latencyMs,
          attempts: r.attempts,
          ok: r.ok,
          error_code: r.errorCode ?? null,
        })
        .eq("id", id)
        .then(({ error: e }) => {
          if (e) console.warn(`[guard] ai_calls update failed for ${r.label}: ${e.message}`);
        });
    },
  };
}
