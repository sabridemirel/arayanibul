Investigate and fix a bug reported for the Arayanibul platform.

Bug report: $ARGUMENTS

---

## Step 1 — Bug Triage (arayanibul-product-manager)

Launch the **arayanibul-product-manager** agent.

Ask it to:
- Analyze the bug report: "$ARGUMENTS"
- Classify severity: Critical / High / Medium / Low
- Identify which layers are likely affected: Backend, Mobile, Web (could be one or multiple)
- Determine if this is a UI/UX bug (needs designer) or a logic/data bug (needs only developer)
- Define acceptance criteria: exactly how to verify the bug is fixed
- Output a structured triage report specifying which agents are needed in Step 3

Wait for this to complete before proceeding.

---

## Step 2 — Root Cause Analysis (Plan agent)

Launch the **Plan** agent (technical analyst/architect).

Give it:
- The bug: "$ARGUMENTS"
- The triage report from Step 1

Ask it to:
- Explore the relevant parts of the codebase to identify the root cause
- Pinpoint the exact files, functions, or components likely responsible
- Determine whether the bug is in: data layer, API logic, state management, UI rendering, or integration between layers
- Design a precise fix strategy for each affected layer
- Identify any risk of regression and what to watch out for
- Output a technical fix plan to be used by the fix agents

Wait for this to complete before proceeding.

---

## Step 3 — Parallel Fix

Based on the triage (Step 1) and fix plan (Step 2), launch **only the agents that are needed** simultaneously.

Decide which of the following agents to launch based on what the product manager and analyst identified:

### dotnet-backend-developer — if backend is affected
- Apply the fix described in the Step 2 plan
- Work in src/backend/API/
- Do not introduce regressions
- Report exactly what was changed and why

### mobile-feature-developer — if mobile logic/functionality is affected
- Apply the fix described in the Step 2 plan
- Work in src/mobile/
- Report exactly what was changed and why

### mobile-ux-designer — if the bug is a mobile UI/UX issue
- Diagnose the visual or interaction problem
- Provide corrected design specs and implement the UI fix
- Ensure WCAG AA compliance is maintained

### web-feature-developer — if web logic/functionality is affected
- Apply the fix described in the Step 2 plan
- Work in the web app
- Report exactly what was changed and why

### web-ux-designer — if the bug is a web UI/UX issue
- Diagnose the visual or interaction problem
- Provide corrected design and implement the fix
- Ensure responsive design is maintained

### devops-engineer — if the bug is infrastructure/environment related
- Diagnose configuration, environment, or deployment issues
- Apply the fix to docker-compose, environment configs, or deployment scripts
- Report what was changed

Launch all needed agents simultaneously and wait for all to complete.

---

## Step 4 — Verification (arayanibul-qa-tester)

After all fix agents have finished, launch the **arayanibul-qa-tester** agent.

Give it:
- Bug report: "$ARGUMENTS"
- Acceptance criteria from Step 1
- What was changed (outputs from Step 3)

Ask it to:
- Reproduce the original bug scenario to confirm it is now fixed
- Verify all acceptance criteria from Step 1 are met
- Run regression tests on all functionality related to the affected area
- Check that no new bugs were introduced by the fix
- Report: **FIXED** / **NOT FIXED**, with details on each check

---

## Final Report

Summarize:
1. Bug: "$ARGUMENTS"
2. Severity (from triage)
3. Root cause (from analyst)
4. Agents involved in the fix
5. Files changed
6. QA verdict: FIXED / NOT FIXED
7. Follow-up actions if any remain
