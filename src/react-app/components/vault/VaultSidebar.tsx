import { Plus, Search, Tag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import type { CategoryDef } from "../../domain/types";
import type { VaultApp } from "../../hooks/useVaultApp";
import { cn, GhostButton } from "../ui";
import { CategoryIcon } from "./CategoryIcon";
import CategoryModal from "./CategoryModal";

type App = VaultApp;

// ── Sidebar content (shared between mobile overlay and desktop panel) ─────────

function SidebarContent({ app, onNavigate }: { app: App; onNavigate?: () => void }) {
	const [modalTarget, setModalTarget] = useState<"new" | CategoryDef | null>(null);

	const handleModalSave = (def: CategoryDef) => {
		if (modalTarget === "new") {
			app.addCategory(def);
		} else if (modalTarget) {
			app.updateCategory(modalTarget.name, { icon: def.icon, imageDataUrl: def.imageDataUrl });
		}
		setModalTarget(null);
	};

	const modalInitialDef: CategoryDef =
		modalTarget === "new"
			? { name: "", icon: null, imageDataUrl: null }
			: (modalTarget ?? { name: "", icon: null, imageDataUrl: null });

	const selectCategory = (cat: string | null) => {
		app.setSelectedCategory(cat);
		onNavigate?.();
	};

	return (
		<>
			{/* Search */}
			<div className="px-3 pt-4 pb-3 shrink-0">
				<div className="relative">
					<Search
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
					/>
					<input
						value={app.searchText}
						onChange={(e) => app.setSearchText(e.target.value)}
						placeholder="搜索…"
						className={cn(
							"w-full pl-8 pr-3 py-2 rounded-xl bg-pw-50 border border-pw-100",
							"text-sm text-slate-700 placeholder:text-slate-300",
							"focus:outline-none focus:border-pw-300 focus:ring-2 focus:ring-pw-100 focus:bg-white",
							"transition-all duration-200",
						)}
					/>
				</div>
			</div>

			{/* Category list */}
			<div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
				{/* "All" row */}
				<button
					onClick={() => selectCategory(null)}
					className={cn(
						"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors duration-150",
						app.selectedCategory === null
							? "bg-pw-100 text-pw-700"
							: "text-slate-500 hover:bg-pw-50 hover:text-slate-700",
					)}
				>
					<div
						className={cn(
							"w-5 h-5 rounded-md flex items-center justify-center shrink-0",
							app.selectedCategory === null ? "bg-pw-300/50 text-pw-700" : "bg-slate-100 text-slate-400",
						)}
					>
						<Tag size={11} />
					</div>
					全部
					<span className="ml-auto text-xs text-slate-300 font-normal">
						{app.vault.entries.length}
					</span>
				</button>

				{/* Per-category rows */}
				{app.categoryOptions.map((cat) => {
					const count = app.vault.entries.filter((e) => e.category === cat.name).length;
					const active = app.selectedCategory === cat.name;
					return (
						<button
							key={cat.name}
							onClick={() => selectCategory(active ? null : cat.name)}
							className={cn(
								"w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors duration-150 group",
								active
									? "bg-ac-100 text-ac-600 font-medium"
									: "text-slate-500 hover:bg-pw-50 hover:text-slate-700",
							)}
						>
							{/* Icon pill — clicking opens the icon editor, NOT the category filter */}
							<button
								type="button"
								tabIndex={-1}
								onClick={(e) => {
									e.stopPropagation();
									setModalTarget(cat);
								}}
								title="编辑图标"
								className={cn(
									"w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-all",
									active ? "bg-ac-200 text-ac-600" : "bg-slate-100 text-slate-400",
									"hover:ring-2 hover:ring-pw-300 hover:ring-offset-1 hover:scale-110",
								)}
							>
								<CategoryIcon def={cat} size={11} />
							</button>
							<span className="truncate">{cat.name}</span>
							<span className="ml-auto text-xs font-normal opacity-50">{count}</span>
						</button>
					);
				})}

				{/* Add category */}
				<div className="pt-1">
					<GhostButton
						onClick={() => setModalTarget("new")}
						fullWidth
						className="px-3 py-1.5 text-xs gap-2 rounded-lg"
					>
						<Plus size={12} />
						新建类别
					</GhostButton>
				</div>
			</div>

			{modalTarget !== null && (
				<CategoryModal
					initialDef={modalInitialDef}
					isNew={modalTarget === "new"}
					onSave={handleModalSave}
					onClose={() => setModalTarget(null)}
				/>
			)}
		</>
	);
}

// ── Sidebar — mobile overlay + desktop static ─────────────────────────────────

export function VaultSidebar({ app, isOpen, onClose }: { app: App; isOpen: boolean; onClose: () => void }) {
	return (
		<>
			{/* Mobile: slide-in overlay */}
			<AnimatePresence>
				{isOpen && (
					<div className="md:hidden">
						{/* Backdrop */}
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-[2px]"
							onClick={onClose}
						/>
						{/* Panel */}
						<motion.div
							initial={{ x: "-100%" }}
							animate={{ x: 0 }}
							exit={{ x: "-100%" }}
							transition={{ type: "spring", damping: 28, stiffness: 300 }}
							className="fixed left-0 top-0 h-dvh z-40 w-64 bg-white shadow-2xl shadow-pw-900/20 flex flex-col overflow-hidden"
						>
							<SidebarContent app={app} onNavigate={onClose} />
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{/* Desktop: always-visible static panel */}
			<aside className="hidden md:flex w-56 shrink-0 bg-white border-r border-pw-100 flex-col overflow-hidden">
				<SidebarContent app={app} />
			</aside>
		</>
	);
}
