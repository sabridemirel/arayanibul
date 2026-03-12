Implement a new feature for the Arayanibul platform end-to-end using specialized agents.

Feature to implement: $ARGUMENTS

---

## Step 1 — Product Analysis (arayanibul-product-manager)

Launch the **arayanibul-product-manager** agent.

Ask it to:
- Analyze the feature request: "$ARGUMENTS"
- Define user stories and business requirements
- Break it down into tasks for: Backend, Mobile, Web
- Define acceptance criteria for each task
- Identify dependencies and risks
- Output a structured plan document that will be passed to all subsequent agents

Wait for this to complete before proceeding.

---

## Step 2 — Technical Analysis (Plan agent)

Launch the **Plan** agent (software architect/analyst).

Give it:
- The feature: "$ARGUMENTS"
- The product manager's plan from Step 1

Ask it to:
- Design the technical architecture for this feature
- Define API contracts (endpoints, request/response models)
- Identify which existing files need to be modified and which need to be created
- Define database schema changes if needed
- Highlight technical risks and how to mitigate them
- Produce a detailed technical spec that backend, mobile, and web developers will use

Wait for this to complete before proceeding.

---

## Step 3 — UX Design (parallel)

Using the product plan (Step 1) and technical spec (Step 2), launch these 2 agents **simultaneously**:

### Agent A: mobile-ux-designer
Design the mobile UI/UX for "$ARGUMENTS":
- Design all new screens and components needed
- Follow the existing purple (#7B2CBF) / orange (#F59E0B) theme
- Define component hierarchy, layout, interactions, and animations
- Provide exact implementation specs (colors, spacing, typography) for the mobile developer
- Reference existing patterns in src/mobile/

### Agent B: web-ux-designer
Design the web UI/UX for "$ARGUMENTS":
- Design all new pages and components needed
- Follow existing React + Tailwind CSS design patterns
- Define responsive layouts (mobile web, tablet, desktop)
- Provide exact implementation specs for the web developer

Wait for both to complete before proceeding.

---

## Step 4 — Implementation (parallel)

Using all outputs from Steps 1-3, launch these 3 agents **simultaneously**:

### Agent A: dotnet-backend-developer
Implement the backend for "$ARGUMENTS":
- Follow the technical spec from Step 2 (API contracts, DB schema)
- Create/update controllers, services, models, migrations
- Follow existing patterns in src/backend/API/
- Write complete implementation (no placeholders or TODOs)
- Report all files created/modified

### Agent B: mobile-feature-developer
Implement the mobile feature for "$ARGUMENTS":
- Follow the UX design from Step 3 exactly
- Follow the API contracts from Step 2
- Create/update screens and components in src/mobile/
- Use the purple/orange theme consistently
- Report all files created/modified

### Agent C: web-feature-developer
Implement the web feature for "$ARGUMENTS":
- Follow the UX design from Step 3 exactly
- Follow the API contracts from Step 2
- Create/update pages and components in the web app
- Ensure responsive design
- Report all files created/modified

Wait for all 3 to complete before proceeding.

---

## Step 5 — Infrastructure Check (devops-engineer) [conditional]

If the feature requires infrastructure changes (new environment variables, file storage, new services, deployment config changes), launch the **devops-engineer** agent.

Ask it to:
- Review the implementation outputs from Step 4
- Update docker-compose.yml, environment configs, or deployment scripts as needed
- Ensure the feature works correctly in the local Docker environment
- Document any production deployment steps required

Skip this step if no infrastructure changes are needed.

---

## Step 6 — QA & Verification (arayanibul-qa-tester)

After all implementation and infrastructure work is done, launch the **arayanibul-qa-tester** agent.

Give it:
- Feature description: "$ARGUMENTS"
- Acceptance criteria from Step 1
- API contracts from Step 2

Ask it to:
- Test all API endpoints related to this feature
- Verify the mobile and web implementations meet the UX design specs
- Confirm all acceptance criteria from Step 1 are satisfied
- Run regression tests on related existing functionality
- Report any issues found with severity: critical / high / medium / low
- Give a final verdict: PASSED / FAILED

---

## Final Report

After all agents complete, summarize:
1. Feature implemented: "$ARGUMENTS"
2. Technical design decisions (from analyst)
3. Files created/modified per layer (backend / mobile / web)
4. Infrastructure changes (if any)
5. QA verdict: PASSED / FAILED
6. Open issues to address (if any)
