export const cardMotion = {
	initial: { opacity: 0, y: 22, scale: 0.97 },
	animate: { opacity: 1, y: 0, scale: 1 },
	exit: { opacity: 0, y: -14, scale: 0.97 },
	transition: { duration: 0.3, ease: "easeOut" as const },
};
