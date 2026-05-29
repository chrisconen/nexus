import { executeToolCall, buildToolInstructions } from "./index";
import type { ToolResult } from "./types";

const MAX_TOOL_ROUNDS = 5;

/**
 * Run a tool-use preprocessing loop.
 * Calls the LLM with tool definitions, executes any tool calls,
 * returns collected research + reasoning text.
 * The final response is streamed separately using existing infrastructure.
 */
export async function runToolResearch(
  systemPrompt: string,
  userMessage: string,
  tools: any[]
): Promise<{
  researchContext: string;
  messages: Array<{ role: string; content: string }>;
  toolResults: ToolResult[];
}> {
  console.log("[tool-research] runToolResearch called, tools:", tools.map((t: any) => t.function?.name));
  let messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemPrompt + buildToolInstructions() },
    { role: "user", content: userMessage },
  ];

  const toolResults: ToolResult[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const result = await callDeepSeekWithTools(messages, tools);

    if (result.toolCall) {
      // Assistant message tool_calls tömbbel — DeepSeek ezt várja
      messages.push({
        role: "assistant",
        content: result.content || null,
        tool_calls: [{
          id: result.toolCall.id || "call_1",
          type: "function",
          function: {
            name: result.toolCall.name,
            arguments: JSON.stringify(result.toolCall.args)
          }
        }]
      } as any);

      const toolResult = await executeToolCall(result.toolCall);
      toolResults.push(toolResult);

      // Tool result message tool_call_id-val
      messages.push({
        role: "tool",
        tool_call_id: result.toolCall.id || "call_1",
        content: toolResult.success ? toolResult.output : `HIBA: ${toolResult.error}`
      } as any);

      continue;
    }

    // Nincs tool call — kész
    const researchContext = toolResults
      .filter((r) => r.success)
      .map((r) => `[${r.name}] ${r.output}`)
      .join("\n\n---\n\n");
    return { researchContext, messages, toolResults };
  }

  // Hit max rounds
  const researchContext = toolResults
    .filter((r) => r.success)
    .map((r) => `[${r.name}] ${r.output}`)
    .join("\n\n---\n\n");
  return { researchContext, messages, toolResults };
}

interface ToolCallResult {
  content: string;
  toolCall: { name: string; args: Record<string, string>; id?: string } | null;
}

async function callDeepSeekWithTools(
  messages: Array<{ role: string; content: string }>,
  tools: any[]
): Promise<ToolCallResult> {
  const apiKey = import.meta.env.DEEPSEEK_API_KEY;
  const model = import.meta.env.DEEPSEEK_MODEL || "deepseek-chat";
  if (!apiKey) {
    console.warn("[tool-research] No DEEPSEEK_API_KEY set");
    return { content: "", toolCall: null };
  }

  console.log("[tool-research] calling DeepSeek with", tools.length, "tools");

  try {
    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? "required" : undefined,
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[tool-research] DeepSeek error:", res.status, err);
      return { content: "", toolCall: null };
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    console.log("[tool-research] DeepSeek finish_reason:", choice?.finish_reason);

    if (choice?.finish_reason === "tool_calls" && choice.message?.tool_calls) {
      const tc = choice.message.tool_calls[0];
      console.log("[tool-research] tool call:", tc.function.name, tc.function.arguments, "id:", tc.id);
      return {
        content: choice.message.content || "",
        toolCall: {
          name: tc.function.name,
          args: JSON.parse(tc.function.arguments),
          id: tc.id,
        },
      };
    }
    return { content: choice?.message?.content || "", toolCall: null };
  } catch (err) {
    console.error("[tool-research] DeepSeek exception:", err);
    return { content: "", toolCall: null };
  }
}
