import type { MessageKey } from "./en";

// Chinese dictionary. Must provide exactly the keys declared in `en`.
export const zh: Record<MessageKey, string> = {
	// ── Common ──
	"common.cancel": "取消",
	"common.save": "保存",
	"common.confirm": "确认",
	"common.delete": "删除",
	"common.close": "关闭",

	// ── Login ──
	"login.subtitle": "安全、优雅的密码管理器",
	"login.openFile.title": "上传 Vault 文件",
	"login.openFile.text": "打开本地 .eden.json 文件",
	"login.useCache.title": "使用浏览器缓存",
	"login.newVault.title": "新建 Vault",
	"login.newVault.text": "从零开始创建",

	// ── Setup: password ──
	"setup.title": "新建 Vault",
	"setup.vaultName": "Vault 名称",
	"setup.password": "密码",
	"setup.next": "下一步",
	"setup.noPassword": "不使用密码",

	// ── Setup: security questions ──
	"setupQ.title": "设置安全问题（可选）",
	"setupQ.question": "问题 {n}",
	"setupQ.answer": "回答 {n}",
	"setupQ.add": "添加安全问题",
	"setupQ.saveEnter": "保存并进入 Vault",
	"setupQ.skip": "跳过，稍后在设置中配置",

	// ── Unlock ──
	"unlock.title": "解锁 Vault",
	"unlock.password": "密码",
	"unlock.answer": "回答",
	"unlock.questionLabel": "问题 {n}：{q}",
	"unlock.unlocking": "解锁中…",
	"unlock.unlock": "解锁",
	"unlock.useQuestions": "使用安全问题解锁",
	"unlock.usePassword": "使用密码解锁",

	// ── Entry table ──
	"table.empty.title": "还没有密码",
	"table.empty.hint": "点击右下角的 + 按钮来新建密码",
	"table.noMatch": "没有匹配的密码",
	"column.name": "名称",
	"column.loginName": "登录名",
	"column.password": "密码",
	"column.notes": "备注",
	"column.category": "类别",

	// ── Vault page ──
	"fab.newEntry": "新建密码",

	// ── Entry modal ──
	"entry.new": "新建密码",
	"entry.edit": "编辑密码",
	"entry.name": "名称",
	"entry.namePlaceholder": "例：GitHub",
	"entry.loginName": "登录名 / 邮箱",
	"entry.loginPlaceholder": "user@example.com",
	"entry.password": "密码",
	"entry.category": "类别",
	"entry.notes": "备注",
	"entry.notesPlaceholder": "可选备注…",
	"entry.customProps": "自定义属性",
	"entry.attachments": "附件",
	"entry.confirmDelete": "确认删除？",

	// ── Category input ──
	"categoryInput.placeholder": "选择或新建类别…",
	"categoryInput.create": "新建 “{name}”",

	// ── Category modal ──
	"categoryModal.new": "新建类别",
	"categoryModal.editIcon": "编辑图标",
	"categoryModal.name": "类别名",
	"categoryModal.namePlaceholder": "例：工作",
	"categoryModal.commonIcons": "常用图标",
	"categoryModal.customImage": "自定义图片",
	"categoryModal.uploaded": "已上传自定义图片",
	"categoryModal.reupload": "重新上传",
	"categoryModal.upload": "上传图片",
	"categoryModal.imageHint": "支持 PNG / JPG / SVG · 最大 200 KB",
	"categoryModal.tooLarge": "图片太大（{size} KB），请上传 200 KB 以内的图片。",

	// ── Attachments ──
	"attachment.add": "添加附件",

	// ── Custom properties ──
	"customProps.confirmDelete": "删除 “{key}”？",
	"customProps.value": "值",
	"customProps.key": "属性名",
	"customProps.add": "添加属性",

	// ── Sidebar ──
	"sidebar.search": "搜索…",
	"sidebar.all": "全部",
	"sidebar.editIcon": "编辑图标",
	"sidebar.newCategory": "新建类别",

	// ── Settings ──
	"settings.title": "Vault 设置",
	"settings.vaultName": "Vault 名称",
	"settings.cache": "浏览器缓存",
	"settings.autoSave": "自动保存到浏览器",
	"settings.export": "导出",
	"settings.download": "下载 Vault 文件",
	"settings.downloading": "下载中…",
	"settings.encryption": "加密",
	"settings.encrypted": "已加密",
	"settings.noEncryption": "无加密",
	"settings.password": "密码",
	"settings.passwordPlaceholder": "请输入密码",
	"settings.securityQuestions": "安全问题",
	"settings.questionN": "安全问题 {n}",
	"settings.question": "问题 {n}",
	"settings.answer": "回答 {n}",
	"settings.addQuestion": "添加安全问题",
	"settings.save": "保存设置",
	"settings.language": "界面语言",
	"lang.zh": "中文",
	"lang.en": "English",

	// ── Cache state labels ──
	"cache.idle": "尚未储存",
	"cache.none": "没有浏览器缓存",
	"cache.unavailable": "无法读取浏览器缓存",
	"cache.available": "可用缓存：{time}",
	"cache.saving": "缓存中…",
	"cache.saved": "缓存中，已储存",
	"cache.error": "缓存中，储存失败",

	// ── Status (toasts) ──
	"status.saved": "已储存。",
	"status.saveFailed": "储存失败。",
	"status.fileLoaded": "文件已读取。",
	"status.openFailed": "无法打开文件。",
	"status.cacheEmpty": "浏览器缓存为空。",
	"status.cacheLoaded": "已读取浏览器缓存。",
	"status.cacheReadFailed": "无法读取缓存。",
	"status.unlocked": "Vault 已解锁。",
	"status.unlockFailed": "解锁失败，请检查输入。",
	"status.vaultCreatedNoPassword": "已创建无密码 Vault。",
	"status.passwordRequired": "请输入密码，或选择不使用密码。",
	"status.vaultCreated": "已创建 Vault。",
	"status.entrySaved": "Entry 已保存。",
	"status.entryDeleted": "Entry 已删除。",
	"status.downloaded": "已下载 Vault 文件。",
	"status.downloadFailed": "下载失败。",

	// ── Icon labels ──
	"icon.Tag": "标签",
	"icon.Globe": "网站",
	"icon.Shield": "安全",
	"icon.Key": "密钥",
	"icon.Lock": "锁",
	"icon.User": "账户",
	"icon.CreditCard": "支付",
	"icon.Wallet": "钱包",
	"icon.DollarSign": "金融",
	"icon.Mail": "邮件",
	"icon.Phone": "电话",
	"icon.MessageSquare": "消息",
	"icon.Home": "家庭",
	"icon.Building2": "公司",
	"icon.Briefcase": "工作",
	"icon.Folder": "文件夹",
	"icon.Cloud": "云服务",
	"icon.Server": "服务器",
	"icon.Database": "数据库",
	"icon.Monitor": "电脑",
	"icon.Smartphone": "移动",
	"icon.Wifi": "网络",
	"icon.Code": "开发",
	"icon.Tv": "影视",
	"icon.Film": "电影",
	"icon.Music": "音乐",
	"icon.Headphones": "音频",
	"icon.Camera": "相机",
	"icon.Gamepad2": "游戏",
	"icon.GraduationCap": "教育",
	"icon.BookOpen": "阅读",
	"icon.Heart": "个人",
	"icon.Star": "收藏",
	"icon.Car": "交通",
	"icon.Plane": "旅行",
	"icon.MapPin": "地图",
	"icon.Coffee": "生活",
	"icon.Gift": "礼品",
	"icon.ShoppingCart": "购物车",
	"icon.ShoppingBag": "购物",
	"icon.Zap": "能源",

	// ── Misc ──
	"a11y.close": "关闭",
};
