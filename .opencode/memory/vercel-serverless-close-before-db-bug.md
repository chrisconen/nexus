---
name: vercel-serverless-close-before-db-bug
description: Vercel serverless terminates function after response closes — DB save must happen before close()
created: 2026-05-29T21:20:00.913Z
updated: 2026-05-29T21:20:00.913Z
metadata:
  type: reference
---

## Vercel serverless fire-and-forget anti-pattern

**Bug:** Chat conversations weren't saving in production (Vercel deployed Nexus).

**Root cause:** The DB save (`saveStreamConversation`) ran as a fire-and-forget promise AFTER `controller.close()`. Vercel serverless functions terminate the Node process shortly after the HTTP response is closed — the async DB save never had time to complete.

**Bad pattern (broken):**
```ts
controller.close();
// This never executes on Vercel:
saveStreamConversation(...).catch(e => console.error(e));
```

**Fix pattern:**
```ts
// DB save BEFORE close — keeps the stream open until the write completes
await saveStreamConversation(...).catch(e => console.error(e));

controller.enqueue(doneEvent);
controller.close();
```

**Why:** `controller.enqueue()` on a ReadableStream doesn't block — it buffers. But `await` on the DB call keeps the function alive. After `controller.close()`, Vercel considers the response done and reclaims the environment.

**Trade-off:** Adds a few ms latency between the last token and the `done` event on the client. Client sees the done event slightly later, but data is guaranteed persisted.

**Secondary issue:** The production Turso DB didn't have the latest schema (`pinned` column on `conversation` table) — needed `drizzle-kit push --force` pointed at the prod DB URL with a prod auth token.

**Where fixed:** `src\pages\api\chat.ts` — moved `saveStreamConversation` above the `controller.close()` block.
