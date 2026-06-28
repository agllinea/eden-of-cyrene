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
import type { CategoryDef } from "../../domain/types";
import { cn } from "../ui";

// ── Icon registry ─────────────────────────────────────────────────────────────

export type IconEntry = {
	name: string;
	label: string;
	Icon: React.FC<{ size?: number; className?: string }>;
};

export const ICON_LIST: IconEntry[] = [
	{ name: "Tag",          label: "标签",   Icon: Tag },
	{ name: "Globe",        label: "网站",   Icon: Globe },
	{ name: "Shield",       label: "安全",   Icon: Shield },
	{ name: "Key",          label: "密钥",   Icon: Key },
	{ name: "Lock",         label: "锁",     Icon: Lock },
	{ name: "User",         label: "账户",   Icon: User },
	{ name: "CreditCard",   label: "支付",   Icon: CreditCard },
	{ name: "Wallet",       label: "钱包",   Icon: Wallet },
	{ name: "DollarSign",   label: "金融",   Icon: DollarSign },
	{ name: "Mail",         label: "邮件",   Icon: Mail },
	{ name: "Phone",        label: "电话",   Icon: Phone },
	{ name: "MessageSquare",label: "消息",   Icon: MessageSquare },
	{ name: "Home",         label: "家庭",   Icon: Home },
	{ name: "Building2",    label: "公司",   Icon: Building2 },
	{ name: "Briefcase",    label: "工作",   Icon: Briefcase },
	{ name: "Folder",       label: "文件夹", Icon: Folder },
	{ name: "Cloud",        label: "云服务", Icon: Cloud },
	{ name: "Server",       label: "服务器", Icon: Server },
	{ name: "Database",     label: "数据库", Icon: Database },
	{ name: "Monitor",      label: "电脑",   Icon: Monitor },
	{ name: "Smartphone",   label: "移动",   Icon: Smartphone },
	{ name: "Wifi",         label: "网络",   Icon: Wifi },
	{ name: "Code",         label: "开发",   Icon: Code },
	{ name: "Tv",           label: "影视",   Icon: Tv },
	{ name: "Film",         label: "电影",   Icon: Film },
	{ name: "Music",        label: "音乐",   Icon: Music },
	{ name: "Headphones",   label: "音频",   Icon: Headphones },
	{ name: "Camera",       label: "相机",   Icon: Camera },
	{ name: "Gamepad2",     label: "游戏",   Icon: Gamepad2 },
	{ name: "GraduationCap",label: "教育",   Icon: GraduationCap },
	{ name: "BookOpen",     label: "阅读",   Icon: BookOpen },
	{ name: "Heart",        label: "个人",   Icon: Heart },
	{ name: "Star",         label: "收藏",   Icon: Star },
	{ name: "Car",          label: "交通",   Icon: Car },
	{ name: "Plane",        label: "旅行",   Icon: Plane },
	{ name: "MapPin",       label: "地图",   Icon: MapPin },
	{ name: "Coffee",       label: "生活",   Icon: Coffee },
	{ name: "Gift",         label: "礼品",   Icon: Gift },
	{ name: "ShoppingCart", label: "购物车", Icon: ShoppingCart },
	{ name: "ShoppingBag",  label: "购物",   Icon: ShoppingBag },
	{ name: "Zap",          label: "能源",   Icon: Zap },
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
