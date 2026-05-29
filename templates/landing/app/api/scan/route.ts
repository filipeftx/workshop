import Anthropic from "@anthropic-ai/sdk";

// This is the "back office": it runs on the server, never in the browser,
// so your API key stays private. The browser sends a topic here; this code
// asks Claude to search the live web and sort what it finds into three
// futures buckets, then sends the structured result back to the browser.

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from .env.local

// The instructions that define how Claude behaves. This is stable across every
// request, so we cache it (cache_control) to make repeat scans cheaper + faster.
const SYSTEM_PROMPT = `You are a Futures Research assistant for senior designers, strategists, and futures practitioners.

Your job: given a topic, use web search to find RECENT, concrete developments (news, launches, research, policy, behaviour shifts), then reframe each as a "signal of change" — an early indicator that hints at how the future might unfold.

Sort signals into three futures buckets:
- "preferable": signals pointing toward a future we would actively want — beneficial, equitable, sustainable outcomes.
- "probable": signals pointing toward the most likely default future if current trends simply continue.
- "dystopian": signals pointing toward harmful, extractive, or destabilising outcomes we should want to avoid.

A single real-world development can imply different futures depending on how it plays out — use judgement.

For EACH signal provide:
- "headline": a short, punchy title (max ~8 words)
- "implication": one sentence on what this could mean for the future
- "source": { "title": short source name, "url": the real URL you found via web search }
- "designChallenge": a provocative "How might we…?" question a workshop could explore

Aim for 3 signals per bucket (9 total). Base every signal on a real search result with a real URL — never invent sources.

Respond with ONLY a valid JSON object, no prose before or after, in exactly this shape:
{
  "preferable": [ { "headline": "", "implication": "", "source": { "title": "", "url": "" }, "designChallenge": "" } ],
  "probable":   [ { "headline": "", "implication": "", "source": { "title": "", "url": "" }, "designChallenge": "" } ],
  "dystopian":  [ { "headline": "", "implication": "", "source": { "title": "", "url": "" }, "designChallenge": "" } ]
}`;

export async function POST(request: Request) {
  let topic = "";
  try {
    const body = await request.json();
    topic = (body?.topic ?? "").toString().trim();
  } catch {
    return Response.json({ error: "Could not read the request." }, { status: 400 });
  }

  if (!topic) {
    return Response.json({ error: "Please enter a topic to scan." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.includes("paste-your-key")) {
    return Response.json(
      { error: "No API key set yet. Open .env.local and paste your Anthropic key, then restart the dev server." },
      { status: 500 },
    );
  }

  try {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: `Scan this topic and return the JSON of signals: "${topic}"` },
    ];

    let response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 8000,
      thinking: { type: "adaptive" },
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      tools: [{ type: "web_search_20260209", name: "web_search" }],
      messages,
    });

    // Web search runs server-side. If Claude hits the per-request tool limit it
    // returns "pause_turn"; we re-send to let it finish. Cap the loops for safety.
    let guard = 0;
    while (response.stop_reason === "pause_turn" && guard < 5) {
      messages.push({ role: "assistant", content: response.content });
      response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 8000,
        thinking: { type: "adaptive" },
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tools: [{ type: "web_search_20260209", name: "web_search" }],
        messages,
      });
      guard++;
    }

    // Pull the text Claude wrote and isolate the JSON object inside it.
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return Response.json({ error: "Claude did not return readable results. Try again." }, { status: 502 });
    }

    const data = JSON.parse(text.slice(start, end + 1));
    return Response.json({ topic, buckets: data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong while scanning.";
    return Response.json({ error: message }, { status: 500 });
  }
}
