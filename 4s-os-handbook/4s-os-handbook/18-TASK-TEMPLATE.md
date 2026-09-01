# Claude Task Template

Paste this at the start of a coding session after the relevant handbook sections.

---

You are working on 4S OS.

Read the Constitution and Project Context first.

Use the Constitution as the highest authority.

Task:

[INSERT TASK HERE]

Constraints:

- Preserve existing routes and behavior unless explicitly changing them.
- Preserve Supabase auth and RLS assumptions.
- Do not perform destructive database actions.
- Keep mobile primary.
- Keep the UI calm, warm, minimal, and finished.
- Do not add features that increase cognitive load.
- Prefer small, elegant changes over broad rewrites.
- Challenge the task if it conflicts with the Constitution.

Before coding:

1. Inspect the current implementation.
2. Identify the smallest safe change.
3. Explain the intended UX improvement.

After coding:

1. List files changed.
2. Explain what improved.
3. Explain why it fits 4S OS.
4. Note risks and manual tests.
5. Self-critique the result.
6. Suggest follow-ups.

The goal is not to add more software.

The goal is to make life feel lighter.
