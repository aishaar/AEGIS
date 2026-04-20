export type TransparencyOutput = {
  explanation: string;
  confidence_band: "low" | "medium" | "high";
  what_to_verify: string;
  uncertainty_flag: boolean;
  basis_type: string;
};

export type ReflectionOutput = {
  reflection_prompt: string;
  reflection_style: "guided" | "active" | "open";
  is_required_this_turn: boolean;
};

export type ChallengeOutput = {
  prompt: string;
  rpi: number;
  sur: number;
  raf: number;
  consecutive_passive_accepts: number;
  trigger_interrupt: boolean;
  interrupt_type: string;
};

export type UIHints = {
  show_transparency_panel: boolean;
  show_reflection_card: boolean;
  show_challenge_banner: boolean;
  scaffold_stage_label: string;
  engagement_level: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  transparency?: TransparencyOutput | null;
  reflection?: ReflectionOutput | null;
  challenge?: ChallengeOutput | null;
  ui_hints?: UIHints;
  turn?: number;
};

export type AgentResponse = {
  main_response: string;
  transparency: TransparencyOutput | null;
  challenge: ChallengeOutput | null;
  reflection: ReflectionOutput | null;
  route_used: string;
  ui_hints: UIHints;
};

export type StateSnapshot = {
  scaffold_stage: number;
  passivity_alert: boolean;
  turn_type: string;
  rpi_events: string[];
};

export type ChatResponse = {
  session_id: string;
  turn: number;
  response: AgentResponse;
  state_snapshot: StateSnapshot;
};

export type MockResponse = {
  main_response: string;
  transparency: {
    explanation: string;
    confidence_band: "low" | "medium" | "high";
    what_to_verify: string;
    uncertainty_flag: boolean;
  };
  reflection: {
    reflection_prompt: string;
    reflection_style: "guided" | "open";
    is_required_this_turn: boolean;
  };
  challenge: {
    prompt: string;
  } | null;
  ui_hints: {
    show_transparency_panel: boolean;
    show_reflection_card: boolean;
    show_challenge_banner: boolean;
  };
};

export type MockReport = {
  metrics: {
    rpi: number;
    sur: number;
    raf: number;
    interpretation: string;
    engagement_level: "low" | "medium" | "high";
  };
};

export type MetricsReport = {
  session_id: string;
  turn_count: number;
  metrics: {
    rpi: number;
    sur: number;
    raf: number;
    engagement_level: string;
    scaffold_stage_label: string;
    turn_count: number;
    interpretation: string;
  };
  raw_events: {
    rpi_events: string[];
    reflection_events: string[];
    transparency_events: object[];
  };
};