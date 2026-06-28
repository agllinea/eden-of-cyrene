export function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
			{children}
		</p>
	);
}
