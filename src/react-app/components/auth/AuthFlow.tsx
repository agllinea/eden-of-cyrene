import { ArrowRight, ChevronLeft, ChevronRight, Database, Loader2, Plus, ShieldQuestion, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";

import logoUrl from "../../assets/logo.svg";
import { createBlankSecurityQuestion } from "../../domain/types";
import { AirButton, Button, FloatingInput, FloatingPasswordInput, GhostButton, LightButton, MacaronButton, PasswordInput, TextButton } from "../ui";

import type { useVaultApp } from "../../hooks/useVaultApp";

type App = ReturnType<typeof useVaultApp>;

// ── Shared card animation ─────────────────────────────────────────────────────

const cardMotion = {
	initial: { opacity: 0, y: 22, scale: 0.97 },
	animate: { opacity: 1, y: 0, scale: 1 },
	exit: { opacity: 0, y: -14, scale: 0.97 },
	transition: { duration: 0.3, ease: "easeOut" as const },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function AppLogo({ subtitle }: { subtitle?: string }) {
	return (
		<div className="flex flex-col items-center mb-8">
			<img
				src={logoUrl}
				alt=""
				className="w-20 h-20 mb-4"
				style={{ filter: "drop-shadow(0 6px 18px rgba(159,112,240,0.45))" }}
			/>
			<h1 className="text-2xl font-bold text-slate-800 tracking-tight">
				Eden of Cyrene
			</h1>
			{subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
		</div>
	);
}

function Card({ children }: { children: React.ReactNode }) {
	return (
		<div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-pw-300/20 p-8 w-full max-w-md border border-pw-100/60">
			{children}
		</div>
	);
}

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<GhostButton onClick={onClick} className="mb-5 -mt-1 -ml-2 p-2">
			<ChevronLeft size={18} strokeWidth={2.5} />
		</GhostButton>
	);
}

// ── Login card ────────────────────────────────────────────────────────────────

function LoginCard({ app }: { app: App }) {
	const fileRef = useRef<HTMLInputElement>(null);

	return (
		<motion.div {...cardMotion}>
			<Card>
				<AppLogo subtitle="安全、优雅的密码管理器" />

				<div className="space-y-3">
					<LightButton
						onClick={() => fileRef.current?.click()}
						title="上传 Vault 文件"
						text="打开本地 .eden.json 文件"
						icon={<Upload size={20} />}
						fullWidth
					/>

					<LightButton
						onClick={() => void app.openCachedVault()}
						title="使用浏览器缓存"
						text={app.cacheStatus}
						icon={<Database size={20} />}
						fullWidth
					/>

					<MacaronButton
						onClick={app.startNewVault}
						title="新建 Vault"
						text="从零开始创建"
						icon={<Plus size={20} />}
						fullWidth
					/>
				</div>

				<input
					ref={fileRef}
					type="file"
					accept=".json"
					className="hidden"
					onChange={(e) => {
						const file = e.target.files?.[0];
						if (file) void app.openVaultFile(file);
						e.target.value = "";
					}}
				/>
			</Card>
		</motion.div>
	);
}

// ── Unlock card ───────────────────────────────────────────────────────────────

function UnlockCard({ app }: { app: App }) {
	const [loading, setLoading] = useState(false);
	const questions =
		app.securitySlot?.type === "securityQuestions"
			? app.securitySlot.questions
			: [];
	const isPasswordMode = app.unlockMode === "password";

	const handleUnlock = async () => {
		setLoading(true);
		try {
			await app.unlockVault();
		} finally {
			setLoading(false);
		}
	};

	return (
		<motion.div {...cardMotion}>
			<Card>
                <div className="flex items-center gap-1 -ml-2 mb-6">
					<GhostButton onClick={app.goBackFromUnlock} className="p-2">
						<ChevronLeft size={18} strokeWidth={2.5} />
					</GhostButton>
					<h2 className="text-base font-semibold text-slate-700">解锁 Vault</h2>
				</div>

				<div className="space-y-4">
					{isPasswordMode ? (
						<PasswordInput
							placeholder="密码"
							value={app.unlockPassword}
							autoFocus
							disabled={loading}
							onChange={(e) => app.setUnlockPassword(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && void handleUnlock()}
						/>
					) : (
						<div className="space-y-3">
							{questions.map((q, i) => (
								<div key={q.id}>
									<label className="block text-xs font-medium text-slate-500 mb-1.5">
										问题 {i + 1}：{q.question}
									</label>
									<PasswordInput
										placeholder="回答"
										value={app.unlockAnswers[q.id] ?? ""}
										disabled={loading}
										onChange={(e) =>
											app.setUnlockAnswers({
												...app.unlockAnswers,
												[q.id]: e.target.value,
											})
										}
									/>
								</div>
							))}
						</div>
					)}

					<Button fullWidth onClick={() => void handleUnlock()} disabled={loading}>
						{loading ? (
							<Loader2 size={16} className="animate-spin" />
						) : (
							<ArrowRight size={16} />
						)}
						{loading ? "解锁中…" : "解锁"}
					</Button>

					{isPasswordMode && app.securitySlot && (
						<TextButton onClick={() => app.setUnlockMode("questions")} className="w-full py-2 text-sm">
							<ShieldQuestion size={14} />
							使用安全问题解锁
						</TextButton>
					)}
					{!isPasswordMode && app.passwordSlot && (
						<TextButton onClick={() => app.setUnlockMode("password")} className="w-full py-2 text-sm">
							使用密码解锁
						</TextButton>
					)}
				</div>
			</Card>
		</motion.div>
	);
}

// ── Setup password card ───────────────────────────────────────────────────────

function SetupPasswordCard({ app }: { app: App }) {
	return (
		<motion.div {...cardMotion}>
			<Card>
				<div className="flex items-center gap-1 -ml-2 mb-6">
					<GhostButton onClick={app.goBackFromSetupPassword} className="p-2">
						<ChevronLeft size={18} strokeWidth={2.5} />
					</GhostButton>
					<h2 className="text-base font-semibold text-slate-700">新建 Vault</h2>
				</div>

				<div className="space-y-3">
					<FloatingInput
						label="Vault 名称"
						value={app.setupVaultName}
						autoFocus
						onChange={(e) => app.setSetupVaultName(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && app.continueWithPassword()}
					/>
					<FloatingPasswordInput
						label="密码"
						value={app.setupPassword}
						onChange={(e) => app.setSetupPassword(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && app.continueWithPassword()}
					/>
				</div>

				<div className="mt-8 space-y-2">
					<MacaronButton fullWidth onClick={app.continueWithPassword}>
						下一步
					</MacaronButton>

					<GhostButton onClick={app.createVaultWithoutPassword} fullWidth className="py-2 text-sm justify-center">
						不使用密码
					</GhostButton>
				</div>
			</Card>
		</motion.div>
	);
}

// ── Setup questions card ──────────────────────────────────────────────────────

function SetupQuestionsCard({ app }: { app: App }) {
	const [currentIdx, setCurrentIdx] = useState(0);
	const [dir, setDir] = useState<1 | -1>(1);
	const total = app.setupQuestions.length;
	const item = app.setupQuestions[Math.min(currentIdx, total - 1)];

	const goPrev = () => { setDir(-1); setCurrentIdx((i) => Math.max(i - 1, 0)); };
	const goNext = () => { setDir(1); setCurrentIdx((i) => Math.min(i + 1, total - 1)); };
	const addQuestion = () => {
		app.setSetupQuestions([...app.setupQuestions, createBlankSecurityQuestion()]);
		setDir(1);
		setCurrentIdx(total);
	};

	return (
		<motion.div {...cardMotion}>
			<Card>
				{/* Header: back + title + page nav */}
				<div className="flex items-center -ml-2 mb-6">
					<GhostButton onClick={app.goBackFromSetupQuestions} className="p-2 shrink-0">
						<ChevronLeft size={18} strokeWidth={2.5} />
					</GhostButton>
					<h2 className="text-base font-semibold text-slate-700 flex-1">设置安全问题（可选）</h2>
					<div className="flex items-center gap-0.5 shrink-0">
						<GhostButton onClick={goPrev} disabled={currentIdx === 0} className="p-1.5">
							<ChevronLeft size={14} />
						</GhostButton>
						<span className="text-xs text-slate-400 tabular-nums w-9 text-center">{currentIdx + 1} / {total}</span>
						<GhostButton onClick={goNext} disabled={currentIdx === total - 1} className="p-1.5">
							<ChevronRight size={14} />
						</GhostButton>
					</div>
				</div>

				{/* Form */}
				<div className="overflow-y-visible">
					<AnimatePresence mode="wait" initial={false}>
						<motion.div
							key={currentIdx}
							initial={{ x: dir * 40, opacity: 0 }}
							animate={{ x: 0, opacity: 1 }}
							exit={{ x: dir * -40, opacity: 0 }}
							transition={{ duration: 0.18, ease: "easeOut" }}
							className="space-y-3"
						>
							<FloatingInput
								label={`问题 ${currentIdx + 1}`}
								value={item.question}
								onChange={(e) => app.updateSetupQuestion(item.id, "question", e.target.value)}
							/>
							<FloatingPasswordInput
								label={`回答 ${currentIdx + 1}`}
								value={item.answer}
								onChange={(e) => app.updateSetupQuestion(item.id, "answer", e.target.value)}
							/>
						</motion.div>
					</AnimatePresence>
				</div>

				{/* Add question */}
				<AirButton onClick={addQuestion} icon={<Plus size={14} />} fullWidth className="mt-3">
					添加安全问题
				</AirButton>
				{/* Footer actions */}
				<div className="mt-6 space-y-2">
					<Button fullWidth onClick={() => app.finishSecurityQuestions(true)}>
						保存并进入 Vault
					</Button>
					<GhostButton onClick={() => app.finishSecurityQuestions(false)} fullWidth className="py-2 text-sm justify-center">
						跳过，稍后在设置中配置
					</GhostButton>
				</div>
			</Card>
		</motion.div>
	);
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function AuthFlow({ app }: { app: App }) {
	return (
		<div className="min-h-dvh bg-linear-to-br from-pw-200 via-pw-50 to-ac-100 flex items-center justify-center p-4">
			<AnimatePresence mode="wait">
				{app.phase === "login" && <LoginCard key="login" app={app} />}
				{app.phase === "unlock" && <UnlockCard key="unlock" app={app} />}
				{app.phase === "setupPassword" && (
					<SetupPasswordCard key="setupPassword" app={app} />
				)}
				{app.phase === "setupQuestions" && (
					<SetupQuestionsCard key="setupQuestions" app={app} />
				)}
			</AnimatePresence>
		</div>
	);
}
