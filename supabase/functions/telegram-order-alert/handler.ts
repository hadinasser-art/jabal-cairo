type Environment = (name: string) => string | undefined;
type Configuration = { chat_id: string | null; pairing_code: string | null };
type Job = { order_id: string; lease: string; payload: OrderAlert };
export type OrderAlert = {
  order_id: string;
  total_items: number;
  total_price_egp: number;
  payment_status: string;
  order_status: string;
  is_test?: boolean;
};

type TelegramUpdate = {
  message?: { text?: string; chat?: { id: number; type: string; title?: string } };
};

class DeliveryError extends Error {
  constructor(
    readonly code: string,
    readonly retryAfter = 60,
  ) {
    super(code);
  }
}

export function formatOrderAlert(order: OrderAlert): string {
  const amount = new Intl.NumberFormat("en-EG", { maximumFractionDigits: 2 }).format(
    order.total_price_egp,
  );
  return [
    order.is_test ? "JABAL — TEST notification (not a real order)" : "New JABAL order",
    `Order: ${order.order_id}`,
    `Items: ${order.total_items} · EGP ${amount}`,
    `Payment: ${order.payment_status}`,
    `Order status: ${order.order_status}`,
    "https://jabalwear.com/admin",
  ].join("\n");
}

export function createHandler(env: Environment, request: typeof fetch = fetch) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== "POST")
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    const secret = req.headers.get("x-jabal-notification-key");
    if (!secret || !/^[a-f0-9]{64}$/.test(secret)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const baseUrl = env("SUPABASE_URL");
    const serviceKey = env("SUPABASE_SERVICE_ROLE_KEY");
    const botToken = env("TELEGRAM_BOT_TOKEN");
    if (!baseUrl || !serviceKey || !botToken) {
      return Response.json({ error: "Missing server configuration" }, { status: 503 });
    }

    async function state<T>(action: string, data: Record<string, unknown> = {}): Promise<T> {
      const result = await request(`${baseUrl}/rest/v1/rpc/telegram_order_notification_state`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: serviceKey!,
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ p_secret: secret, p_action: action, p_data: data }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!result.ok) throw new DeliveryError("notification_state_unavailable");
      return (await result.json()) as T;
    }

    async function telegram<T>(method: string, body: Record<string, unknown>): Promise<T> {
      let result: Response;
      try {
        result = await request(`https://api.telegram.org/bot${botToken}/${method}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        // Fetch errors can contain the token-bearing URL; never persist or return them.
        throw new DeliveryError("telegram_network_error");
      }
      const response = (await result.json()) as {
        ok?: boolean;
        result: T;
        error_code?: number;
        parameters?: { retry_after?: number };
      };
      if (!result.ok || response.ok !== true) {
        throw new DeliveryError(
          `telegram_${response.error_code ?? result.status}`,
          Math.max(60, response.parameters?.retry_after ?? 60),
        );
      }
      return response.result;
    }

    try {
      const config = await state<Configuration | null>("authorize");
      if (!config) return Response.json({ error: "Unauthorized" }, { status: 401 });
      let input: { action?: string };
      try {
        input = await req.json();
        if (!input || typeof input !== "object") throw new Error("Invalid request");
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
      }

      if (input.action === "pair" || input.action === "find_group") {
        const findingGroup = input.action === "find_group";
        if (!findingGroup && config.chat_id) return Response.json({ paired: true });
        if (!config.pairing_code)
          return Response.json({ error: "Pairing expired" }, { status: 409 });
        const updates = await telegram<TelegramUpdate[]>("getUpdates", {
          limit: 100,
          timeout: 0,
          allowed_updates: ["message"],
        });
        const chats = new Map(
          updates
            .filter(
              ({ message }) =>
                message?.text === config.pairing_code &&
                (findingGroup
                  ? ["group", "supergroup"].includes(message.chat?.type ?? "")
                  : message.chat?.type === "private"),
            )
            .map(({ message }) => [String(message!.chat!.id), message!.chat!]),
        );
        if (chats.size !== 1) {
          const bot = await telegram<{ username: string }>("getMe", {});
          return Response.json(
            { error: "Pairing message missing or ambiguous", bot_username: bot.username },
            { status: 409 },
          );
        }
        const [chatId, chat] = [...chats][0];
        if (findingGroup) return Response.json({ chat_id: chatId, title: chat.title });
        await state("pair", { chat_id: chatId, pairing_code: config.pairing_code });
        return Response.json({ paired: true });
      }

      if (input.action !== "drain")
        return Response.json({ error: "Unknown action" }, { status: 400 });
      if (!config.chat_id) return Response.json({ error: "Chat not paired" }, { status: 409 });

      let sent = 0;
      let failed = 0;
      const startedAt = Date.now();
      for (let index = 0; index < 5 && Date.now() - startedAt < 40_000; index += 1) {
        const job = await state<Job | null>("claim");
        if (!job) break;
        try {
          const message = await telegram<{ message_id: number }>("sendMessage", {
            chat_id: config.chat_id,
            text: formatOrderAlert(job.payload),
            link_preview_options: { is_disabled: true },
          });
          await state("finish", {
            order_id: job.order_id,
            lease: job.lease,
            message_id: message.message_id,
          });
          sent += 1;
        } catch (error) {
          await state("retry", {
            order_id: job.order_id,
            lease: job.lease,
            error: error instanceof DeliveryError ? error.code : "delivery_error",
            retry_after: error instanceof DeliveryError ? error.retryAfter : 60,
          });
          failed += 1;
          break;
        }
      }
      return Response.json({ sent, failed });
    } catch {
      return Response.json({ error: "Notification processing unavailable" }, { status: 503 });
    }
  };
}
