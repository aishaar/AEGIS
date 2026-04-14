export type Message = {
  role: "user" | "assistant";
  content: string;
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