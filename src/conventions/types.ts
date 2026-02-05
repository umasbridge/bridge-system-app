export interface ConventionOption {
  id: string;
  question: string;
  default: boolean;
}

// For individual conventions (Stayman, Transfers, etc.)
export interface ConventionTemplate {
  id: string;
  name: string;
  description: string;
  options: ConventionOption[];
  generate: (answers: Record<string, boolean>) => string;
}

// For base systems (2/1, SAYC, etc.)
export interface SystemTemplate {
  id: string;
  name: string;
  description: string;
  systemOptions: ConventionOption[];  // Questions about the system itself
  availableConventions: string[];      // IDs of conventions that can be added
  generate: (systemAnswers: Record<string, boolean>, selectedConventions: string[], conventionAnswers: Record<string, boolean>) => string;
}
