import { Download, Eye, EyeOff, Menu, Pencil, Plus, Search, Settings, Tag } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn, GhostButton, LightButton, MacaronButton, IconButton } from "../ui";
import { CategoryIcon } from "./CategoryIcon";
import CategoryModal from "./CategoryModal";
import EntryModal from "./EntryModal";
import SettingsModal from "./SettingsModal";

import type { useVaultApp } from "../../hooks/useVaultApp";
import type { CategoryDef, Entry } from "../../domain/types";

type App = ReturnType<typeof useVaultApp>;

// ── Password cell ─────────────────────────────────────────────────────────────

function PasswordCell({ value }: { value: string }) {
	const [show, setShow] = useState(false);
	if (!value) return <span className="text-slate-300">—</span>;
	return (
		<span className="inline-flex items-center gap-1.5">
			<span className="font-mono text-xs">{show ? value : "••••••"}</span>
			<IconButton
				variant="eye"
				onClick={(e) => {
					e.stopPropagation();
					setShow((s) => !s);
				}}
			>
				{show ? <EyeOff size={12} /> : <Eye size={12} />}
			</IconButton>
		</span>
	);
}

// ── Cell value helper ─────────────────────────────────────────────────────────

function getCellValue(entry: Entry, col: string): string {
	switch (col) {
		case "名称":   return entry.name;
		case "登录名": return entry.loginName;
		case "密码":   return entry.password;
		case "备注":   return entry.notes;
		case "类别":   return entry.category ?? "";
		default:       return entry.customProperties[col] ?? "";
	}
}

// ── Header ────────────────────────────────────────────────────────────────────

function VaultHeader({ app, onMenuClick }: { app: App; onMenuClick: () => void }) {
	return (
		<header className="shrink-0 h-14 bg-white border-b border-pw-100 flex items-center px-4 gap-2 shadow-sm">
			{/* Hamburger — mobile only */}
			<LightButton onClick={onMenuClick} icon={<Menu size={18} />} size="sm" className="md:hidden" />

			<h1 className="text-slate-800 font-bold text-base tracking-tight flex-1 truncate">
				{app.vault.name || "Eden of Cyrene"}
			</h1>

			<GhostButton onClick={() => app.setSettingsOpen(true)} icon={<Settings size={16} />} size="sm" />
			<MacaronButton onClick={() => void app.downloadVault()} icon={<Download size={16} />} size="sm" />

		</header>
	);
}

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

	// Select a category and close the mobile sidebar (if any).
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

function VaultSidebar({ app, isOpen, onClose }: { app: App; isOpen: boolean; onClose: () => void }) {
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

// ── Entry table ───────────────────────────────────────────────────────────────

function EntryTable({ app }: { app: App }) {
	if (app.vault.entries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center p-8">
				<div className="w-16 h-16 bg-pw-100 rounded-2xl flex items-center justify-center mb-4">
					<Plus className="w-8 h-8 text-pw-400" />
				</div>
				<p className="text-slate-500 font-medium mb-1">还没有密码</p>
				<p className="text-sm text-slate-400">点击右下角的 + 按钮来新建密码</p>
			</div>
		);
	}

	if (app.visibleEntries.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-center p-8">
				<p className="text-slate-400 text-sm">没有匹配的密码</p>
			</div>
		);
	}

	return (
		<div className="overflow-auto h-full">
			<table className="w-full min-w-max text-sm">
				<thead className="sticky top-0 bg-pw-50/95 backdrop-blur-sm border-b border-pw-100">
					<tr>
						{app.tableColumns.map((col) => (
							<th
								key={col}
								className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
							>
								{col}
							</th>
						))}
						<th className="w-10 px-2 py-3" />
					</tr>
				</thead>
				<tbody className="divide-y divide-pw-50">
					{app.visibleEntries.map((entry) => (
						<tr
							key={entry.id}
							onClick={() => app.setEditingEntry(entry)}
							className="hover:bg-pw-50/60 cursor-pointer transition-colors duration-100 group"
						>
							{app.tableColumns.map((col) => (
								<td
									key={col}
									className="px-4 py-3 text-slate-700 whitespace-nowrap max-w-50"
								>
									{col === "密码" ? (
										<PasswordCell value={entry.password} />
									) : col === "类别" ? (
										<CategoryCell
											name={entry.category}
											def={app.categoryOptions.find((c) => c.name === entry.category) ?? null}
										/>
									) : (
										<span className="truncate block text-sm">
											{getCellValue(entry, col) || (
												<span className="text-slate-300">—</span>
											)}
										</span>
									)}
								</td>
							))}
							<td className="px-2 py-3">
								<IconButton
									variant="row"
									onClick={(e) => {
										e.stopPropagation();
										app.setEditingEntry(entry);
									}}
								>
									<Pencil size={13} />
								</IconButton>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function CategoryCell({ name, def }: { name: string | null; def: CategoryDef | null }) {
	if (!name) return <span className="text-slate-300">—</span>;
	return (
		<span className="inline-flex items-center gap-1.5 text-sm">
			{def && (
				<span className="text-slate-400">
					<CategoryIcon def={def} size={13} />
				</span>
			)}
			{name}
		</span>
	);
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function VaultPage({ app }: { app: App }) {
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const isNewEntry =
		!!app.editingEntry &&
		!app.vault.entries.some((e) => e.id === app.editingEntry!.id);

	return (
		<div className="flex flex-col h-dvh overflow-hidden">
			<VaultHeader app={app} onMenuClick={() => setSidebarOpen(true)} />

			<div className="flex flex-1 overflow-hidden">
				<VaultSidebar
					app={app}
					isOpen={sidebarOpen}
					onClose={() => setSidebarOpen(false)}
				/>

				<main className="flex-1 relative overflow-hidden bg-white">
					<EntryTable app={app} />

					{/* FAB */}
					<div className="absolute bottom-7 right-7">
						<MacaronButton
							onClick={app.openNewEntry}
							aria-label="新建密码"
							icon={<Plus size={24} strokeWidth={2} />}
							className="p-0! w-13 h-13 rounded-2xl shadow-lg shadow-ac-300/20"
						/>
					</div>
				</main>
			</div>

			{app.editingEntry && (
				<EntryModal
					entry={app.editingEntry}
					categoryOptions={app.categoryOptions}
					isNew={isNewEntry}
					onSave={app.saveEntry}
					onDelete={app.deleteEntry}
					onClose={() => app.setEditingEntry(null)}
					onAddAttachment={app.addAttachment}
				/>
			)}

			{app.settingsOpen && (
				<SettingsModal
					vaultName={app.vault.name}
					settings={app.settings}
					cacheEnabled={app.cacheEnabled}
					cacheSaving={app.cacheSaving}
					cacheStatus={app.cacheStatus}
					onSetCacheEnabled={app.setCacheEnabled}
					onUpdateVaultName={app.updateVaultName}
					onUpdateSettings={app.setSettings}
					onUpdateSecurityQuestion={app.updateSecurityQuestion}
					onDownload={app.downloadVault}
					onClose={() => app.setSettingsOpen(false)}
				/>
			)}
		</div>
	);
}
