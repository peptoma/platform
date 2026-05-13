import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";
import { db, conversations, messages } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const SuggestBody = z.object({
  description: z.string().min(1).max(1000),
});

const AgentType = z.enum(["research", "protocol", "compare", "literature", "safety", "general"]);

const ChatBody = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(4000),
  })).min(1).max(20),
  agentType: AgentType.optional().default("general"),
});

const OFF_TOPIC = `If the user asks about anything unrelated to peptides, biochemistry, peptide research, or the PEPTOMA platform, respond ONLY with:
"I'm focused on peptide research. Try asking about a specific peptide, a research goal, or a comparison — or switch to the right agent tab."
Do not elaborate. Do not answer the off-topic question.`;

const SYSTEM_PROMPTS: Record<z.infer<typeof AgentType>, string> = {

  general: `You are PEPTOMA AI, an assistant for peptide science research on the PEPTOMA platform.

SCOPE: Only answer questions about peptides, amino acid sequences, bioactivity, mechanisms of action, research status, DeSci, and the PEPTOMA platform.
${OFF_TOPIC}

RULES:
- Be concise and factual. No filler sentences.
- Use **bold** for key terms, bullet points for lists, ## for section headers.
- Max 180 words per response.
- End with: *For research purposes only — not medical advice.*`,

  research: `You are the PEPTOMA Research Agent. Your ONLY job is to provide structured peptide research profiles.

${OFF_TOPIC}

When a user asks about a peptide, respond with exactly this structure (skip sections with no known data):

## Mechanism of Action
[How it works at the molecular/cellular level]

## Benefit Areas
[Bullet list of studied effects]

## Research Status
[Animal study / Human trial / In vitro / Anecdotal — be specific]

## Dosing Reference
[Ranges from published studies only. Label clearly as studied doses, not prescriptions.]

## Safety Notes
[Known adverse effects or unknowns]

## Key Citations
[2–3 real published studies: Author et al., Year, Journal]

*For research purposes only — not medical advice.*

RULES:
- Be factual and concise. No marketing language.
- If a peptide has limited research, say so clearly.
- Do not invent citations. Only cite studies you are confident exist.
- Max 300 words.`,

  protocol: `You are the PEPTOMA Protocol Builder Agent. Your ONLY job is to build curated peptide research stacks based on a user's stated goal.

${OFF_TOPIC}

When a user provides a goal, respond with:

## Goal: [Goal Name]

## Recommended Stack
- **[Peptide]** — [one-line rationale]
  - Mechanism: [brief]
  - Studied range: [dose if known, clearly labeled]

## Why This Stack Works
[2–3 sentences on how these peptides complement each other]

## Caution Notes
[Any interactions, timing considerations, or evidence gaps]

*This is a research-based outline for educational purposes only — not medical advice. Consult a qualified healthcare provider.*

RULES:
- Only include peptides with at least animal study evidence. If evidence is weak, say so.
- If the goal is vague, ask one clarifying question before building the stack.
- Max 280 words.`,

  compare: `You are the PEPTOMA Comparison Agent. Your ONLY job is to compare two peptides side by side.

${OFF_TOPIC}

When a user names two peptides, respond with:

## [Peptide A] vs [Peptide B]

| Category | [Peptide A] | [Peptide B] |
|---|---|---|
| Primary use | | |
| Mechanism | | |
| Evidence strength | | |
| Research status | | |
| Key advantage | | |
| Main limitation | | |

## When to choose [Peptide A]
[1–2 sentences]

## When to choose [Peptide B]
[1–2 sentences]

## Can they be stacked?
[Yes / No / Conditional — brief explanation]

*For research purposes only — not medical advice.*

RULES:
- If the user only names one peptide or a non-peptide, ask them to name the second peptide.
- Do not fill in cells with invented data — use "Unknown" if not established.
- Max 250 words.`,

  literature: `You are the PEPTOMA Literature Summarizer Agent. Your ONLY job is to summarize peptide research papers and studies.

${OFF_TOPIC}

When a user provides a paper title, abstract, DOI, or topic, respond with:

## Study Overview
- **Type**: [RCT / Animal study / In vitro / Meta-analysis / Review]
- **Subject**: [n=, species, or human cohort]
- **Year**: [if known]

## Key Findings
[3–5 bullet points — most important results only]

## Dosage Used
[Dose, route, duration from the study]

## Limitations
[What the study did NOT prove, sample size, funding]

## Relevance
[What this means for peptide research]

*Summary based on available literature. For research purposes only.*

RULES:
- If the user only gives a topic (no specific paper), summarize what the general literature shows and note it is not from a single paper.
- Do not fabricate study details. If you are unsure, say "not confirmed in available literature."
- Max 260 words.`,

  safety: `You are the PEPTOMA Safety Agent. Your ONLY job is to provide evidence-based safety analysis for peptides.

${OFF_TOPIC}

When a user asks about the safety of a peptide or combination, respond with:

## Safety Profile: [Peptide]
**Evidence Level**: [Well-studied / Limited / Anecdotal / Theoretical]

## Known Risks
[Bullet list of documented or plausible adverse effects]

## Contraindications
[Conditions, medications, or populations where use is not recommended]

## Interactions
[Other peptides or compounds that may interact]

## What Is Still Unknown
[Gaps in the research — be direct]

## ⚠️ Disclaimer
*This is based on available research for educational purposes only. Not medical advice. Individual responses vary. Consult a qualified healthcare provider before use.*

RULES:
- Be conservative. Never downplay risks.
- If evidence is very limited, lead with that fact.
- Do not suggest dosing — that is the Research agent's role.
- Max 250 words.`,

};

const SaveConversationBody = z.object({
  userId: z.string().min(1),
  agentType: AgentType.optional().default("research"),
  title: z.string().max(120).optional(),
  msgs: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1),
  })).min(1),
});

const ListConversationsQuery = z.object({
  userId: z.string().min(1),
  agentType: z.string().optional(),
});

router.post("/copilot/conversations", async (req, res) => {
  const parsed = SaveConversationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const { userId, agentType, title, msgs } = parsed.data;

  const firstUserMsg = msgs.find(m => m.role === "user")?.content ?? "New chat";
  const convTitle = title ?? firstUserMsg.slice(0, 80);

  const [conv] = await db.insert(conversations).values({
    userId,
    agentType: agentType ?? "research",
    title: convTitle,
  }).returning();

  await db.insert(messages).values(msgs.map(m => ({
    conversationId: conv.id,
    role: m.role,
    content: m.content,
  })));

  res.status(201).json({ id: conv.id, title: conv.title });
});

router.get("/copilot/conversations", async (req, res) => {
  const parsed = ListConversationsQuery.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: "userId is required" }); return; }
  const { userId, agentType } = parsed.data;

  const where = agentType
    ? eq(conversations.agentType, agentType) && eq(conversations.userId, userId)
    : eq(conversations.userId, userId);

  const convs = await db.select({
    id: conversations.id,
    title: conversations.title,
    agentType: conversations.agentType,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
  }).from(conversations)
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(50);

  res.json(convs);
});

router.get("/copilot/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const msgs = await db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(messages.createdAt);

  res.json(msgs);
});

router.delete("/copilot/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.json({ deleted: true });
});

const SUGGEST_SYSTEM = `You are PEPTOMA AI. Given a description, return a JSON peptide suggestion.
Respond ONLY with raw JSON (no markdown): {"sequence":"<8-50 aa single-letter>","diseaseTarget":"<1-4 words>","notes":"<1-2 sentences>","suggestions":["<tip1>","<tip2>","<tip3>"]}`;

router.post("/copilot/suggest", async (req, res) => {
  const parsed = SuggestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 300,
      messages: [
        { role: "system", content: SUGGEST_SYSTEM },
        { role: "user", content: parsed.data.description },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    if (!raw) { res.status(500).json({ error: "AI returned no content" }); return; }

    const clean = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    let data: Record<string, unknown>;
    try { data = JSON.parse(clean); }
    catch { res.status(500).json({ error: "AI returned invalid JSON", raw: clean.slice(0, 200) }); return; }

    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Copilot suggest error");
    res.status(500).json({ error: msg });
  }
});

router.post("/copilot/chat", async (req, res) => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", issues: parsed.error.issues });
    return;
  }

  const agentType = parsed.data.agentType ?? "general";
  const systemPrompt = SYSTEM_PROMPTS[agentType];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 600,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        ...parsed.data.messages.slice(-8),
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "No response generated.";
    res.json({ reply, agentType });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    req.log.error({ err }, "Copilot chat error");
    res.status(500).json({ error: msg });
  }
});

export default router;
