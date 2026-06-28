import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn, IconButton } from "../button";

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
	isOpen: boolean;
	onClose: () => void;
	children: React.ReactNode;
	size?: "sm" | "md" | "lg" | "xl";
}

const modalSizeCls = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	xl: "max-w-2xl",
};

export function Modal({ isOpen, onClose, children, size = "md" }: ModalProps) {
	return (
		<AnimatePresence>
			{isOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
						onClick={onClose}
					/>
					<motion.div
						initial={{ opacity: 0, scale: 0.96, y: 12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: 8 }}
						transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
						className={cn(
							"relative bg-white rounded-3xl shadow-2xl shadow-pw-300/20 w-full",
							"max-h-[90vh] flex flex-col overflow-hidden",
							modalSizeCls[size],
						)}
					>
						{children}
					</motion.div>
				</div>
			)}
		</AnimatePresence>
	);
}

// ── ModalHeader ───────────────────────────────────────────────────────────────

export function ModalHeader({
	children,
	onClose,
}: {
	children: React.ReactNode;
	onClose?: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-6 py-4 border-b border-pw-100 flex-shrink-0">
			<h2 className="text-base font-semibold text-slate-800">{children}</h2>
			{onClose && (
				<IconButton
					variant="x"
					onClick={onClose}
					className="w-8 h-8 rounded-lg hover:bg-pw-50 flex items-center justify-center"
				>
					<X size={16} />
				</IconButton>
			)}
		</div>
	);
}

// ── ModalBody ─────────────────────────────────────────────────────────────────

export function ModalBody({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex-1 overflow-y-auto px-6 py-5 space-y-4", className)}>
			{children}
		</div>
	);
}

// ── ModalFooter ───────────────────────────────────────────────────────────────

export function ModalFooter({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-pw-100 flex-shrink-0">
			{children}
		</div>
	);
}
