export interface ToolParameter {
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, ToolParameter>;
  /** Native tool schema for Claude/OpenAI-compatible APIs */
  toOpenAITool(): Record<string, unknown>;
  /** Execute the tool with given arguments */
  execute(args: Record<string, string>): Promise<string>;
}

// A tool call requested by the model (parsed from response)
export interface ParsedToolCall {
  name: string;
  args: Record<string, string>;
}

// Result of executing a tool call
export interface ToolResult {
  name: string;
  success: boolean;
  output: string;
  error?: string;
}
