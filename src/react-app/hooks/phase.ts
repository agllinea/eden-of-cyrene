export type AppPhase =
	| "login"
	| "cacheList"
	| "driveList"
	| "unlock"
	| "setupPassword"
	| "setupQuestions"
	| "ready";

export type UnlockMode = "password" | "questions";
