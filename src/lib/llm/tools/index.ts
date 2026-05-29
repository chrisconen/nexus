import type { ToolDefinition, ParsedToolCall, ToolResult } from "./types";

const TOOL_REGISTRY = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  TOOL_REGISTRY.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_REGISTRY.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(TOOL_REGISTRY.values());
}

/** Convert all registered tools to OpenAI/Claude tool format */
export function getOpenAITools(): Record<string, unknown>[] {
  return getAllTools().map((t) => t.toOpenAITool());
}

/** Try to parse a tool call from the model's text response.
 *  Supports both OpenAI-style function_call and XML tag format. */
export function parseToolCall(text: string): ParsedToolCall | null {
  // OpenAI-style: {"function_call": {"name": "...", "arguments": "..."}}
  try {
    const parsed = JSON.parse(text);
    if (parsed.function_call?.name && parsed.function_call?.arguments) {
      const args = typeof parsed.function_call.arguments === "string"
        ? JSON.parse(parsed.function_call.arguments)
        : parsed.function_call.arguments;
      return { name: parsed.function_call.name, args };
    }
  } catch {
    // Not JSON — try XML format
  }

  // XML-style: <tool_call name="...">{"key": "value"}</tool_call>
  const xmlMatch = text.match(/<tool_call\s+name=["']([^"']+)["']>([\s\S]*?)<\/tool_call>/);
  if (xmlMatch) {
    try {
      const args = JSON.parse(xmlMatch[2].trim());
      return { name: xmlMatch[1], args };
    } catch {
      // If args aren't JSON, treat as raw string arg named "query"
      return { name: xmlMatch[1], args: { query: xmlMatch[2].trim() } };
    }
  }

  return null;
}

/** Build system-prompt fragment listing available tools (for non-Claude providers) */
export function buildToolInstructions(): string {
  const tools = getAllTools();
  if (tools.length === 0) return "";

  return `\n\nELÉRHETŐ ESZKÖZÖK:\n${tools
    .map(
      (t) =>
        `- ${t.name}: ${t.description}. Paraméterek: ${Object.entries(t.parameters)
          .map(([k, v]) => `${k} (${v.type})${v.required ? " - KÖTELEZŐ" : ""}: ${v.description}`)
          .join("; ")}`
    )
    .join("\n")}`;
}

/** Execute a tool call and return the result */
export async function executeToolCall(call: ParsedToolCall): Promise<ToolResult> {
  const tool = getTool(call.name);
  if (!tool) {
    return { name: call.name, success: false, output: "", error: `Ismeretlen tool: ${call.name}` };
  }
  try {
    const output = await tool.execute(call.args);
    return { name: call.name, success: true, output };
  } catch (err) {
    return { name: call.name, success: false, output: "", error: String(err) };
  }
}
