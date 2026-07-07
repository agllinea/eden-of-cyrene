import { Tag } from "lucide-react";
import type { CategoryDef } from "@/domain/types";
import { cn } from "../ui";
import { ICON_LIST } from "./icon-list";

// ── Renderer ──────────────────────────────────────────────────────────────────

export function CategoryIcon({
	def,
	size = 14,
	className,
}: {
	def: CategoryDef;
	size?: number;
	className?: string;
}) {
	if (def.imageDataUrl) {
		return (
			<img
				src={def.imageDataUrl}
				alt=""
				style={{ width: size, height: size }}
				className={cn("object-cover rounded", className)}
			/>
		);
	}
	const entry = ICON_LIST.find((i) => i.name === def.icon);
	const Comp = entry?.Icon ?? Tag;
	return <Comp size={size} className={className} />;
}
