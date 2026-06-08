---
name: tool-assistant-prompt-format
description: Tool-assistant must cite exact tool data, no generic SEO text
created: 2026-05-29T14:22:29.186Z
updated: 2026-05-29T14:22:29.186Z
metadata:
  type: project
---

The tool-assistant system prompt now enforces:
- Strict output format per tool type (webpage_audit, invoice_info, etc.)
- Model MUST cite exact values from tool result (title text, character counts, etc.)
- Generic SEO advice is explicitly forbidden
- Current date injected dynamically from `new Date()`
- Example of good vs bad response included in the prompt

**Why:** Llama 3.3 on Groq defaults to generic summaries. The explicit format + examples force it to produce detailed, data-driven responses.

**How to apply:** If the model still produces generic output, check `tool-assistant.ts` for the `TOOL_ASSISTANT_BASE` function and tighten the examples or add more specific formatting rules.
