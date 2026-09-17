import { deepStrictEqual, equal, ok } from "node:assert/strict";
import { createHandler, formatOrderAlert } from "./handler.ts";

const key = "a".repeat(64);
const environment: Record<string, string> = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  TELEGRAM_BOT_TOKEN: "test-private-token",
};
const job = {
  order_id: "TEST-ORDER",
  lease: "test-lease",
  payload: {
    order_id: "TEST-ORDER",
    total_items: 2,
    total_price_egp: 1800,
    payment_status: "pending",
    order_status: "new",
    is_test: true,
  },
};
const request = (action = "drain", secret: string | null = key) =>
  new Request("https://example.test", {
    method: "POST",
    headers: secret ? { "x-jabal-notification-key": secret } : {},
    body: JSON.stringify({ action }),
  });

function mockedFetch(callback: (url: string, body: Record<string, unknown>) => Response) {
  return ((url: string | URL | Request, init?: RequestInit) => {
    return Promise.resolve(callback(String(url), JSON.parse(String(init?.body))));
  }) as typeof fetch;
}

Deno.test("rejects missing authentication before making any network calls", async () => {
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch(() => {
      throw new Error("Must not call network");
    }),
  );
  equal((await handler(request("drain", null))).status, 401);
});

Deno.test("rejects incorrect callback keys without calling Telegram", async () => {
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url) => {
      ok(url.includes("/rpc/"));
      return Response.json(null);
    }),
  );
  equal((await handler(request())).status, 401);
});

Deno.test("pairs only the exact code from one private chat", async () => {
  let paired: unknown;
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url, body) => {
      if (url.includes("getUpdates")) {
        return Response.json({
          ok: true,
          result: [
            { message: { text: "PAIR", chat: { id: -100, type: "group" } } },
            { message: { text: "wrong", chat: { id: 200, type: "private" } } },
            { message: { text: "PAIR", chat: { id: 300, type: "private" } } },
          ],
        });
      }
      if (body.p_action === "authorize")
        return Response.json({ chat_id: null, pairing_code: "PAIR" });
      paired = body.p_data;
      return Response.json({ paired: true });
    }),
  );
  equal((await handler(request("pair"))).status, 200);
  deepStrictEqual(paired, { chat_id: "300", pairing_code: "PAIR" });
});

Deno.test("does not pair when multiple private chats have the code", async () => {
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url, body) => {
      if (url.includes("getMe"))
        return Response.json({ ok: true, result: { username: "test_bot" } });
      if (url.includes("getUpdates")) {
        return Response.json({
          ok: true,
          result: [1, 2].map((id) => ({
            message: { text: "PAIR", chat: { id, type: "private" } },
          })),
        });
      }
      equal(body.p_action, "authorize");
      return Response.json({ chat_id: null, pairing_code: "PAIR" });
    }),
  );
  equal((await handler(request("pair"))).status, 409);
});

Deno.test("delivers claimed jobs once and records Telegram acknowledgement", async () => {
  let claimed = false;
  let sends = 0;
  let acknowledgement: unknown;
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url, body) => {
      if (url.includes("sendMessage")) {
        sends += 1;
        equal(body.chat_id, "123");
        ok(String(body.text).includes("TEST notification"));
        ok(!("parse_mode" in body));
        return Response.json({ ok: true, result: { message_id: 42 } });
      }
      if (body.p_action === "authorize") return Response.json({ chat_id: "123" });
      if (body.p_action === "claim") {
        const result = claimed ? null : job;
        claimed = true;
        return Response.json(result);
      }
      equal(body.p_action, "finish");
      acknowledgement = body.p_data;
      return Response.json({ updated: true });
    }),
  );
  deepStrictEqual(await (await handler(request())).json(), { sent: 1, failed: 0 });
  deepStrictEqual(await (await handler(request())).json(), { sent: 0, failed: 0 });
  equal(sends, 1);
  deepStrictEqual(acknowledgement, { order_id: job.order_id, lease: job.lease, message_id: 42 });
});

Deno.test("respects rate limits and stores only sanitized delivery errors", async () => {
  let retry: unknown;
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url, body) => {
      if (url.includes("sendMessage")) {
        return Response.json(
          { ok: false, error_code: 429, parameters: { retry_after: 120 } },
          { status: 429 },
        );
      }
      if (body.p_action === "authorize") return Response.json({ chat_id: "123" });
      if (body.p_action === "claim") return Response.json(job);
      equal(body.p_action, "retry");
      retry = body.p_data;
      return Response.json({ updated: true });
    }),
  );
  deepStrictEqual(await (await handler(request())).json(), { sent: 0, failed: 1 });
  deepStrictEqual(retry, {
    order_id: job.order_id,
    lease: job.lease,
    error: "telegram_429",
    retry_after: 120,
  });
});

Deno.test("token-bearing fetch errors never appear in retry records or responses", async () => {
  let retry: unknown;
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url, body) => {
      if (url.includes("sendMessage")) throw new Error(`Failed to fetch ${url}`);
      if (body.p_action === "authorize") return Response.json({ chat_id: "123" });
      if (body.p_action === "claim") return Response.json(job);
      retry = body.p_data;
      return Response.json({ updated: true });
    }),
  );
  const response = await (await handler(request())).text();
  ok(!JSON.stringify(retry).includes(environment.TELEGRAM_BOT_TOKEN));
  ok(!response.includes(environment.TELEGRAM_BOT_TOKEN));
});

Deno.test("formats payment and fulfillment independently", () => {
  const text = formatOrderAlert({ ...job.payload, payment_status: "paid", order_status: "new" });
  ok(text.includes("Payment: paid"));
  ok(text.includes("Order status: new"));
});

for (const groupType of ["group", "supergroup"]) {
  Deno.test(`finds a ${groupType} without replacing the active private recipient`, async () => {
    const code = "/start@test_bot GROUP-123";
    const handler = createHandler(
      (name) => environment[name],
      mockedFetch((url, body) => {
        if (url.includes("getUpdates")) {
          return Response.json({
            ok: true,
            result: [
              { message: { text: code, chat: { id: 123, type: "private" } } },
              { message: { text: "wrong", chat: { id: -222, type: groupType } } },
              {
                message: {
                  text: code,
                  chat: { id: -100123, type: groupType, title: "JABAL team" },
                },
              },
            ],
          });
        }
        equal(body.p_action, "authorize");
        return Response.json({ chat_id: "123", pairing_code: code });
      }),
    );
    const response = await handler(request("find_group"));
    equal(response.status, 200);
    deepStrictEqual(await response.json(), { chat_id: "-100123", title: "JABAL team" });
  });
}

Deno.test("group discovery requires a current administrator-configured code", async () => {
  const handler = createHandler(
    (name) => environment[name],
    mockedFetch((url, body) => {
      ok(url.includes("/rpc/"));
      equal(body.p_action, "authorize");
      return Response.json({ chat_id: "123", pairing_code: null });
    }),
  );
  equal((await handler(request("find_group"))).status, 409);
});
