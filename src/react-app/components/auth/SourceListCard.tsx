import { Loader2, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { IconButton } from "../ui";
import { Card, cardMotion } from "./shared";

export interface VaultSourceRow {
	key: string;
	icon: ReactNode;
	name: string;
	subtitle: string;
	onOpen: () => void;
	onDelete: (e: React.MouseEvent) => void;
}

interface SourceListCardProps {
	header: ReactNode;
	rows: VaultSourceRow[] | null; // null = loading
	emptyText: string;
}

export function SourceListCard({ header, rows, emptyText }: SourceListCardProps) {
	return (
		<motion.div {...cardMotion}>
			<Card>
				{header}

				{rows === null ? (
					<div className="flex justify-center py-10">
						<Loader2 size={22} className="animate-spin text-slate-300" />
					</div>
				) : rows.length === 0 ? (
					<p className="text-sm text-slate-400 text-center py-10">{emptyText}</p>
				) : (
					<div className="space-y-2">
						{rows.map((row) => (
							<button
								key={row.key}
								type="button"
								className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-left transition-colors"
								onClick={row.onOpen}
							>
								{row.icon}
								<div className="flex-1 min-w-0">
									<div className="text-sm font-medium text-slate-700 truncate">{row.name}</div>
									<div className="text-xs text-slate-400 mt-0.5">{row.subtitle}</div>
								</div>
								<IconButton variant="del" onClick={row.onDelete}>
									<Trash2 size={14} />
								</IconButton>
							</button>
						))}
					</div>
				)}
			</Card>
		</motion.div>
	);
}
