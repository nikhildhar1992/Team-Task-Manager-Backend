# RAG + Orchestrator Frontend/Backend Plan (Auto Agent Routing)
## Goal

User should type one message in a single chat box.  
System should automatically choose the correct agent/module and return a grounded response.
## UX Decision
- No manual agent dropdown in UI.
- Only one input: user message (plus optional team context if available in session/state).
- Agent/module selection happens in backend orchestrator.
## End-to-End Flow
1. User sends message from `/ai-assistant`.
2. Backend orchestrator receives:
   - `prompt`
3. Orchestrator classifies intent automatically:
   - `task_breakdown`
   - `operations` (orders/dashboard operations)
   - `general`
4. Orchestrator gathers context:
   - operational data (tasks/orders/team)
   - RAG retrieval from knowledge store (embed query -> vector search -> top-k chunks)
5. Orchestrator builds final prompt with:
   - user query
   - selected mode
   - retrieved sources/context
   - guardrails/output format rules
6. Selected agent/LLM generates response.
7. Backend returns strict schema:
   - `summary`
8. Frontend renders response sections without needing agent selection UI.
## Auto-Routing Rules (MVP)
- Task keywords/intents -> `task_breakdown`
- Order/cart/product/checkout intents -> `operations`
- Anything else -> `general`
## Fallback Behavior
- If intent is ambiguous -> route to `general` and ask a clarifying follow-up question.
- If RAG returns no strong match -> respond with low confidence + clarification prompt.
- If model provider unavailable -> deterministic fallback response with same schema.
## RAG Knowledge Scope (MVP)
- Product/order domain:
  - Items: Raisins, Almonds, Walnuts, Kesar, Rajma, Masala, Kashmiri chai, Kahwa, Green tea
  - Cart/checkout/order behavior
- Team/task domain:
  - Team creation/list/delete
  - Task fields: title, description, status, priority, assigned user, deadline
  - Task lifecycle and team scoping rules