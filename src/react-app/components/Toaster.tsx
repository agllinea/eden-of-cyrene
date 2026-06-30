import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { IconButton } from "./button";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastItem {
	id: string;
	message: string;
}

interface ToastContextValue {
	addToast: (message: string) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
	return useContext(ToastContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<ToastItem[]>([]);
	const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

	const dismiss = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
		const timer = timers.current.get(id);
		if (timer !== undefined) {
			clearTimeout(timer);
			timers.current.delete(id);
		}
	}, []);

	const addToast = useCallback(
		(message: string) => {
			const id = crypto.randomUUID();
			setToasts((prev) => {
				const next = [...prev, { id, message }];
				if (next.length > 4) {
					const removed = next.shift()!;
					const oldTimer = timers.current.get(removed.id);
					if (oldTimer !== undefined) {
						clearTimeout(oldTimer);
						timers.current.delete(removed.id);
					}
				}
				return next;
			});
			const timer = setTimeout(() => dismiss(id), 5000);
			timers.current.set(id, timer);
		},
		[dismiss],
	);

	return (
		<ToastContext.Provider value={{ addToast }}>
			{children}
			<ToasterUI toasts={toasts} onDismiss={dismiss} />
		</ToastContext.Provider>
	);
}

// ── Toaster UI ────────────────────────────────────────────────────────────────

function ToasterUI({
	toasts,
	onDismiss,
}: {
	toasts: ToastItem[];
	onDismiss: (id: string) => void;
}) {
	return (
		<div
			aria-live="assertive"
			aria-atomic="false"
			className="fixed bottom-6 pb-safe inset-x-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4"
		>
			<AnimatePresence initial={false}>
				{toasts.map((toast) => (
					<motion.div
						key={toast.id}
						layout
						initial={{ opacity: 0, y: 12, scale: 0.96 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 6, scale: 0.96 }}
						transition={{ duration: 0.2, ease: "easeOut" }}
						className="pointer-events-auto flex items-center gap-3 px-4 py-3 bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-xl max-w-sm w-full"
					>
						<span className="flex-1 text-sm text-white leading-snug">
							{toast.message}
						</span>

						<IconButton
							variant="x"
							onClick={() => onDismiss(toast.id)}
							className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white"
							aria-label="Close"
						>
							<X size={13} />
						</IconButton>
					</motion.div>
				))}
			</AnimatePresence>
		</div>
	);
}
