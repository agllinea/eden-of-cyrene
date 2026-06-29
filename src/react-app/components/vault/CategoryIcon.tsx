import {
	Tag,
	Globe,
	CreditCard,
	Mail,
	Phone,
	Home,
	Briefcase,
	GraduationCap,
	Heart,
	Star,
	Shield,
	Cloud,
	Gamepad2,
	Music,
	Camera,
	Car,
	Plane,
	BookOpen,
	Coffee,
	Zap,
	Database,
	Code,
	Smartphone,
	Key,
	Lock,
	User,
	Building2,
	ShoppingBag,
	Film,
	Headphones,
	MapPin,
	Gift,
	Wallet,
	ShoppingCart,
	Folder,
	Monitor,
	Wifi,
	MessageSquare,
	DollarSign,
	Tv,
	Server,
} from "lucide-react";
import type { CategoryDef } from "@/domain/types";
import { cn } from "../ui";

// ── Icon registry ─────────────────────────────────────────────────────────────
// `name` doubles as the i18n key suffix: the tooltip is `t("icon." + name)`.

export type IconEntry = {
	name: string;
	Icon: React.FC<{ size?: number; className?: string }>;
};

export const ICON_LIST: IconEntry[] = [
	{ name: "Tag", Icon: Tag },
	{ name: "Globe", Icon: Globe },
	{ name: "Shield", Icon: Shield },
	{ name: "Key", Icon: Key },
	{ name: "Lock", Icon: Lock },
	{ name: "User", Icon: User },
	{ name: "CreditCard", Icon: CreditCard },
	{ name: "Wallet", Icon: Wallet },
	{ name: "DollarSign", Icon: DollarSign },
	{ name: "Mail", Icon: Mail },
	{ name: "Phone", Icon: Phone },
	{ name: "MessageSquare", Icon: MessageSquare },
	{ name: "Home", Icon: Home },
	{ name: "Building2", Icon: Building2 },
	{ name: "Briefcase", Icon: Briefcase },
	{ name: "Folder", Icon: Folder },
	{ name: "Cloud", Icon: Cloud },
	{ name: "Server", Icon: Server },
	{ name: "Database", Icon: Database },
	{ name: "Monitor", Icon: Monitor },
	{ name: "Smartphone", Icon: Smartphone },
	{ name: "Wifi", Icon: Wifi },
	{ name: "Code", Icon: Code },
	{ name: "Tv", Icon: Tv },
	{ name: "Film", Icon: Film },
	{ name: "Music", Icon: Music },
	{ name: "Headphones", Icon: Headphones },
	{ name: "Camera", Icon: Camera },
	{ name: "Gamepad2", Icon: Gamepad2 },
	{ name: "GraduationCap", Icon: GraduationCap },
	{ name: "BookOpen", Icon: BookOpen },
	{ name: "Heart", Icon: Heart },
	{ name: "Star", Icon: Star },
	{ name: "Car", Icon: Car },
	{ name: "Plane", Icon: Plane },
	{ name: "MapPin", Icon: MapPin },
	{ name: "Coffee", Icon: Coffee },
	{ name: "Gift", Icon: Gift },
	{ name: "ShoppingCart", Icon: ShoppingCart },
	{ name: "ShoppingBag", Icon: ShoppingBag },
	{ name: "Zap", Icon: Zap },
];

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
