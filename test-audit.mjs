// Direct test of webpage_audit tool
const { getAllTools, executeToolCall } = await import("./src/lib/llm/tools/index.ts");
await import("./src/lib/llm/tools/register-all.ts");

console.log("=== Registered tools ===");
for (const t of getAllTools()) {
  console.log(`- ${t.name}: ${t.description.slice(0, 80)}`);
}

console.log("\n=== Running webpage_audit ===");
const result = await executeToolCall({
  name: "webpage_audit",
  args: { url: "https://conendigital.hu" }
});

if (result.success) {
  console.log(result.output);
} else {
  console.error("ERROR:", result.error);
}
