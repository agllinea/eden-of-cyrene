import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { IconButton } from "./button";

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = "info" | "success" | "error";

interface ToastItem {
	id: string;
	message: string;
	type: ToastType;
}

interface ToastContextValue {
	addToast: (message: string, type?: ToastType) => void;
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
		(message: string, type: ToastType = "info") => {
			const id = crypto.randomUUID();
			// Cap at 4 visible toasts — drop the oldest if we exceed that
			setToasts((prev) => {
				const next = [...prev, { id, message, type }];
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
			const timer = setTimeout(() => dismiss(id), 4000);
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

// ── Visual icons ──────────────────────────────────────────────────────────────

const icons: Record<ToastType, React.ReactNode> = {
	success: <CheckCircle size={16} className="text-pw-500 flex-shrink-0" />,
	error:   <AlertCircle size={16} className="text-red-400 flex-shrink-0" />,
	info:    <Info        size={16} className="text-ac-400 flex-shrink-0" />,
};

const borderCls: Record<ToastType, string> = {
	success: "border-l-pw-300",
	error:   "border-l-red-300",
	info:    "border-l-ac-300",
};

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
			aria-live="polite"
			aria-atomic="false"
			className="fixed top-4 inset-x-0 z-[200] flex flex-col items-center gap-2 pointer-events-none px-4 pt-safe"
		>
			<AnimatePresence initial={false}>
				{toasts.map((toast) => (
					<motion.div
						key={toast.id}
						layout
						initial={{ opacity: 0, y: -16, scale: 0.95 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: -8, scale: 0.95 }}
						transition={{ duration: 0.22, ease: "easeOut" }}
						className={`pointer-events-auto flex items-center gap-3 px-4 py-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg shadow-pw-200/30 border border-l-4 border-pw-100 ${borderCls[toast.type]} max-w-sm w-full`}
					>
						{icons[toast.type]}

						<span className="flex-1 text-sm text-slate-700 leading-snug">
							{toast.message}
						</span>

						<IconButton
							variant="x"
							onClick={() => onDismiss(toast.id)}
							className="shrink-0 w-5 h-5 flex items-center justify-center rounded"
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
