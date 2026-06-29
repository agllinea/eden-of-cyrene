export type AppPhase =
	| "login"
	| "unlock"
	| "setupPassword"
	| "setupQuestions"
	| "ready";

export type UnlockMode = "password" | "questions";
