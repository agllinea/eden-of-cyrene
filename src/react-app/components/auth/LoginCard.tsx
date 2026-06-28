import { Database, Plus, Upload } from "lucide-react";
import { motion } from "motion/react";
import { useRef } from "react";

import { CardButton } from "../ui";
import { App, AppLogo, Card, cardMotion } from "./shared";

export function LoginCard({ app }: { app: App }) {
	const fileRef = useRef<HTMLInputElement>(null);

	return (
		<motion.div {...cardMotion}>
			<Card>
				<AppLogo subtitle="安全、优雅的密码管理器" />

				<div className="space-y-3">
					<CardButton
						variant="light"
						onClick={() => fileRef.current?.click()}
						title="上传 Vault 文件"
						text="打开本地 .eden.json 文件"
						icon={<Upload size={20} />}
						fullWidth
					/>

					<CardButton
						variant="light"
						onClick={() => void app.openCachedVault()}
						title="使用浏览器缓存"
						text={app.cacheStatus}
						icon={<Database size={20} />}
						fullWidth
					/>

					<CardButton
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
