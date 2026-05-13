import type {
  PeptomaClientOptions,
  SequenceAnalysis,
  AnalyzeOptions,
  FeedOptions,
  FeedResponse,
  FeedStats,
  Annotation,
  CreateAnnotationOptions,
  VoteResult,
  VoteDirection,
  ApiKey,
  GenerateKeyOptions,
  GenerateKeyResult,
  LeaderboardEntry,
  TokenBalance,
  PeptomaError,
  AgentType,
  CopilotMessage,
  CopilotOptions,
  CopilotResponse,
  Team,
  TeamDetail,
  TeamSummary,
  TeamMember,
  CreateTeamOptions,
  InviteMemberOptions,
  ForkOptions,
} from "./types.js";

const DEFAULT_BASE_URL = "https://peptoma.xyz/api";

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    const err = new Error(
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`
    ) as PeptomaError;
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body as T;
}

export class SequencesResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async analyze(options: AnalyzeOptions): Promise<SequenceAnalysis> {
    const res = await this.fetch("/sequences", {
      method: "POST",
      body: JSON.stringify(options),
    });
    return parseResponse<SequenceAnalysis>(res);
  }

  async get(id: number): Promise<SequenceAnalysis> {
    const res = await this.fetch(`/sequences/${id}`);
    return parseResponse<SequenceAnalysis>(res);
  }
}

export class FeedResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async list(options: FeedOptions = {}): Promise<FeedResponse> {
    const params = new URLSearchParams();
    if (options.limit !== undefined) params.set("limit", String(options.limit));
    if (options.page !== undefined) params.set("page", String(options.page));
    if (options.disease) params.set("disease", options.disease);
    if (options.minScore !== undefined) params.set("minScore", String(options.minScore));
    if (options.sort) params.set("sort", options.sort);
    const qs = params.toString();
    const res = await this.fetch(`/feed${qs ? `?${qs}` : ""}`);
    return parseResponse<FeedResponse>(res);
  }

  async stats(): Promise<FeedStats> {
    const res = await this.fetch("/feed/stats");
    return parseResponse<FeedStats>(res);
  }

  async trending(): Promise<SequenceAnalysis[]> {
    const res = await this.fetch("/feed/trending");
    return parseResponse<SequenceAnalysis[]>(res);
  }
}

export class AnnotationsResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async list(sequenceId: number): Promise<Annotation[]> {
    const res = await this.fetch(`/annotations/${sequenceId}`);
    return parseResponse<Annotation[]>(res);
  }

  async create(options: CreateAnnotationOptions): Promise<Annotation> {
    const res = await this.fetch("/annotations", {
      method: "POST",
      body: JSON.stringify(options),
    });
    return parseResponse<Annotation>(res);
  }

  async vote(annotationId: number, direction: VoteDirection): Promise<VoteResult> {
    const res = await this.fetch(`/annotations/${annotationId}/vote`, {
      method: "POST",
      body: JSON.stringify({ direction }),
    });
    return parseResponse<VoteResult>(res);
  }
}

export class KeysResource {
  constructor(
    private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>,
    private readonly walletAddress: string
  ) {}

  async list(): Promise<ApiKey[]> {
    const res = await this.fetch(`/keys?walletAddress=${encodeURIComponent(this.walletAddress)}`);
    return parseResponse<ApiKey[]>(res);
  }

  async generate(options: GenerateKeyOptions = {}): Promise<GenerateKeyResult> {
    const res = await this.fetch("/keys/generate", {
      method: "POST",
      body: JSON.stringify({
        walletAddress: this.walletAddress,
        userId: this.walletAddress,
        label: options.label ?? "Default",
      }),
    });
    return parseResponse<GenerateKeyResult>(res);
  }

  async revoke(id: number): Promise<{ success: boolean }> {
    const res = await this.fetch(
      `/keys/${id}?walletAddress=${encodeURIComponent(this.walletAddress)}`,
      { method: "DELETE" }
    );
    return parseResponse<{ success: boolean }>(res);
  }
}

export class TokenResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async balance(userId: string): Promise<TokenBalance> {
    const res = await this.fetch(`/token/balance?userId=${encodeURIComponent(userId)}`);
    return parseResponse<TokenBalance>(res);
  }

  async leaderboard(): Promise<LeaderboardEntry[]> {
    const res = await this.fetch("/token/leaderboard");
    return parseResponse<LeaderboardEntry[]>(res);
  }
}

export class CitationsResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async forks(sequenceId: number): Promise<SequenceAnalysis[]> {
    const res = await this.fetch(`/sequences/${sequenceId}/forks`);
    return parseResponse<SequenceAnalysis[]>(res);
  }

  async citations(sequenceId: number): Promise<SequenceAnalysis[]> {
    const res = await this.fetch(`/sequences/${sequenceId}/citations`);
    return parseResponse<SequenceAnalysis[]>(res);
  }

  async fork(sequenceId: number, options: ForkOptions): Promise<SequenceAnalysis> {
    const res = await this.fetch(`/sequences/${sequenceId}/forks`, {
      method: "POST",
      body: JSON.stringify(options),
    });
    return parseResponse<SequenceAnalysis>(res);
  }
}

export class TeamsResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async create(options: CreateTeamOptions): Promise<Team> {
    const res = await this.fetch("/teams", {
      method: "POST",
      body: JSON.stringify(options),
    });
    return parseResponse<Team>(res);
  }

  async list(wallet: string): Promise<TeamSummary[]> {
    const res = await this.fetch(`/teams?wallet=${encodeURIComponent(wallet)}`);
    return parseResponse<TeamSummary[]>(res);
  }

  async get(id: number): Promise<TeamDetail> {
    const res = await this.fetch(`/teams/${id}`);
    return parseResponse<TeamDetail>(res);
  }

  async invite(teamId: number, options: InviteMemberOptions): Promise<TeamMember> {
    const res = await this.fetch(`/teams/${teamId}/invite`, {
      method: "POST",
      body: JSON.stringify(options),
    });
    return parseResponse<TeamMember>(res);
  }

  async accept(teamId: number, wallet: string): Promise<TeamMember> {
    const res = await this.fetch(`/teams/${teamId}/accept`, {
      method: "POST",
      body: JSON.stringify({ wallet }),
    });
    return parseResponse<TeamMember>(res);
  }

  async removeMember(teamId: number, wallet: string, ownerWallet: string): Promise<{ success: boolean }> {
    const res = await this.fetch(`/teams/${teamId}/members/${encodeURIComponent(wallet)}`, {
      method: "DELETE",
      body: JSON.stringify({ ownerWallet }),
    });
    return parseResponse<{ success: boolean }>(res);
  }
}

export class CopilotResource {
  constructor(private readonly fetch: (path: string, init?: RequestInit) => Promise<Response>) {}

  async ask(options: CopilotOptions): Promise<CopilotResponse> {
    const messages: CopilotMessage[] = [
      ...(options.history ?? []),
      { role: "user", content: options.message },
    ];
    const res = await this.fetch("/copilot/chat", {
      method: "POST",
      body: JSON.stringify({ messages, agentType: options.agentType }),
    });
    return parseResponse<CopilotResponse>(res);
  }

  async research(peptide: string): Promise<CopilotResponse> {
    return this.ask({ agentType: "research", message: `What is ${peptide}? Provide a full research profile.` });
  }

  async buildProtocol(goal: string): Promise<CopilotResponse> {
    return this.ask({ agentType: "protocol", message: `Build a peptide protocol stack for: ${goal}` });
  }

  async compare(peptideA: string, peptideB: string): Promise<CopilotResponse> {
    return this.ask({ agentType: "compare", message: `Compare ${peptideA} vs ${peptideB}` });
  }

  async summarizeLiterature(query: string): Promise<CopilotResponse> {
    return this.ask({ agentType: "literature", message: query });
  }

  async checkSafety(query: string): Promise<CopilotResponse> {
    return this.ask({ agentType: "safety", message: `Safety analysis: ${query}` });
  }
}

export class PeptomaClient {
  readonly sequences: SequencesResource;
  readonly feed: FeedResource;
  readonly annotations: AnnotationsResource;
  readonly keys: KeysResource;
  readonly token: TokenResource;
  readonly copilot: CopilotResource;
  readonly citations: CitationsResource;
  readonly teams: TeamsResource;

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(options: PeptomaClientOptions) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
    this.apiKey = options.apiKey;

    const walletId = options.walletAddress ?? options.apiKey ?? "";
    const boundFetch = this._fetch.bind(this);
    this.sequences = new SequencesResource(boundFetch);
    this.feed = new FeedResource(boundFetch);
    this.annotations = new AnnotationsResource(boundFetch);
    this.keys = new KeysResource(boundFetch, walletId);
    this.token = new TokenResource(boundFetch);
    this.copilot = new CopilotResource(boundFetch);
    this.citations = new CitationsResource(boundFetch);
    this.teams = new TeamsResource(boundFetch);
  }

  private async _fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init.headers as Record<string, string> ?? {}),
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    return fetch(url, { ...init, headers });
  }
}
