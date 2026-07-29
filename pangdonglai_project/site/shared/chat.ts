export const CHAT_ROLES = ["user", "assistant"] as const;

export type ChatRole = (typeof CHAT_ROLES)[number];

export type ChatRequestMessage = {
  role: ChatRole;
  content: string;
};

export type ChatSource = {
  title: string;
  url: string;
  verifiedAt: string;
  caseTitle?: string;
  claimType?: string;
  finality?: string;
};
