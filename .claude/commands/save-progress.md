---
description: Save implementation progress for next session
---

Update the progress tracking for the current implementation work:

1. **Analyze the thread context** to determine:
   - What phase/task is currently being worked on
   - What's been completed in this session
   - Any blockers or discoveries
   - What should happen next

2. **Draft a brief, pithy progress update** and show it to the user for approval before saving

3. **Update EDITOR_STABILITY_PLAN.md**:
   - Add completion dates to finished phases (format: ✅ Phase X: Description (2025-MM-DD))
   - Update in-progress phases with ⏳ status
   - Add any discoveries/blockers as comments under the relevant phase

4. **Update CLAUDE.md** in the "Immediate Technical Debt" section:
   - Add/update entry for "Editor Stability Implementation"
   - Include current phase number, status, and next steps
   - Format:
     ```
     4. **Editor Stability Implementation** - IN PROGRESS
        - Status: Phase X of 8 - [brief description]
        - Last Updated: YYYY-MM-DD
        - Next: [what to do when resuming]
        - Location: See EDITOR_STABILITY_PLAN.md for full details
     ```

5. **Commit the changes** with message: "docs: save progress - Phase X [brief status]"

Be concise - the user is running low on context.
