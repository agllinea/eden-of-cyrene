# TODO — 项目审查发现的问题

来自 2026-07-03 的一次全项目结构 / 代码质量 / 安全性审查。按优先级排列。

## P0 — 明显 bug

- [x] ~~成功提示被全部吞掉 — `src/react-app/App.tsx:16`~~
  确认是有意为之的设计（只对 error 弹 toast），不修。

- [x] **"搜索"按钮实际打开的是设置弹窗** — `src/react-app/components/vault/VaultHeader.tsx`
  已修复：移除了重复的"搜索"按钮（本来就和齿轮图标功能重复，搜索本身已经是 onChange 实时生效），
  恢复了 `placeholder`/`containerClassName`，删掉死代码注释。

## P1 — 安全性

- [ ] **没有自动锁定 / 手动锁定功能** — 全仓库搜不到 lock/relock 逻辑（`hooks/useVaultApp.ts`）。
  vault 解锁后明文数据会在内存中一直存在到关闭标签页，共享设备场景风险明显。
  建议：加一个"锁定"按钮回到解锁界面 + 可选的闲置超时自动锁定。

- [x] **缺少 CSP（Content-Security-Policy）** — 已修复：在 `index.html` 加了 CSP meta 标签
  （`default-src 'self'`；`script-src`/`connect-src`/`frame-src` 放行 `accounts.google.com`
  供 Google Identity Services 用；`connect-src` 放行 `www.googleapis.com`/`oauth2.googleapis.com`
  供 Drive REST API 用；`img-src` 放行 `data:` 供分类图标的 base64 图片用；`object-src 'none'`）。
  `npm run build`/`tsc -b`/测试全部通过；生产构建的 `dist/client/index.html` 里 meta 标签在最前面、
  应用脚本是同源外链 script，策略能正常覆盖。**没能做到的**：这个环境里没有 `chromium-cli`/已装好的
  Playwright 浏览器，没法起一个真实浏览器把 Google 登录流程完整点一遍来确认 CSP 不会挡住 OAuth 弹窗/回调——
  建议你本地跑一下 `npm run dev`，实际测一次"连接 Google Drive"确认没有被 CSP 拦截。

- [x] **安全问题（security questions）key slot 归一化方式** — 已按你的要求调整：
  `src/react-app/services/cryptoVault.ts` 的 `normalizeAnswers` 只做 `trim()`，去掉了
  `toLocaleLowerCase()`。现在答案区分大小写，也不会因为 locale-aware 的大小写转换而误伤非拉丁字母的
  语言（比如某些语言的大小写转换规则依赖 locale，之前用 `toLocaleLowerCase()` 存在这个隐患）。
  已同步更新了对应的单元测试（`cryptoVault.test.ts`）和 `CLAUDE.md` 里的说明。
  注意：这是行为变更——如果有人已经用某个答案设置过安全问题槽位，"大小写不同"的输入现在会解锁失败
  （以前会成功），这只影响新加密的 vault 或用户重新设置安全问题之后。

- [ ] **PBKDF2 迭代次数偏低** — `src/react-app/services/cryptoVault.ts:11`（`210_000`）。
  OWASP 当前对 PBKDF2-SHA256 建议 ≥ 600,000 次。可做成"用户下次输入密码时顺带用新迭代次数重新加密"
  的渐进升级，不需要一次性强制迁移。（本次未改，涉及迁移策略，需要单独讨论。）

- [x] **Google Drive 请求失败不区分 401（token 过期）与其他错误** — 已修复：
  `src/react-app/services/googleDrive.ts` 新增了 `driveFetch` helper，`driveGet`/`driveCreate`/
  `driveUpdate`/`driveDeleteReq` 现在都走它；遇到 401 会清掉缓存的 token 并强制走一次 `signIn()`
  重新拿 token，再重试一次原请求，还是失败才 throw。

- [x] **并发 `signIn()` 调用会互相覆盖 `pendingAuth`** — 已修复：加了 `inFlightAuth` 变量，
  `signIn()` 在已有请求在途时直接复用同一个 Promise，不会再对 `tokenClient.requestAccessToken()`
  发起重复调用、也不会再丢弃前一个调用者的 `resolve`/`reject`。

## P2 — 缺失功能

- [ ] **密码生成器** — 全仓库搜不到 generate/generator 相关逻辑。
- [ ] **密码强度提示 / 弱密码检测** — `continueWithPassword`（`hooks/useAuthFlow.ts:226`）只检查非空。
- [x] **附件查看 / 下载** — 已修复：`components/vault/AttachmentList.tsx` 每个附件行新增一个
  查看/下载按钮：图片类型（`type.startsWith("image/")`）点击弹出预览模态框（复用 `Modal`/`ModalHeader`/
  `ModalBody`），非图片类型直接触发浏览器下载（用 `<a download>` + 已有的 `dataUrl`，不需要额外的
  Blob/ObjectURL）。新增 `attachment.view`/`attachment.download` 两个 i18n key。
- [ ] **重复密码 / 已泄露密码检测**（无本地实现，也无外部泄露库比对）。

## P3 — 代码质量 / 重复代码

- [ ] **`CacheListCard.tsx` 与 `DriveListCard.tsx` 结构 90% 重复**
  （`components/auth/CacheListCard.tsx`、`components/auth/DriveListCard.tsx`）——
  头部+返回按钮+加载态+空态+可删除列表行都一样，值得抽出共享的 `SourceListCard`/列表行组件。

- [ ] **`useAuthFlow.ts` 里 Drive 合并逻辑重复两遍** —
  `openVaultFileObject`（约 93-101 行）和 `unlockVault`（约 186-192 行）逐字重复了
  `reconcileWithLocalCache` → `hasContentDiverged` → `saveToDrive` → `linkVaultToDrive` 这段序列，
  应该提成一个共享 helper。

- [ ] **`useAuthFlow.ts` 文件过大（334 行），揉了四类职责** —
  打开文件/缓存/Drive、解锁、密码设置、安全问题设置。可以考虑拆分成更小的 hook。

- [ ] **多余的类型断言** — `components/vault/SettingsModal.tsx:304`
  `(q as { answer: string }).answer`。`localSettings.securityQuestions` 已经是
  `Array<SecurityQuestion & { answer: string }>`（`domain/types.ts:94`）强类型，直接写 `q.answer` 即可。

- [ ] **`goBackFromCacheList`/`goBackFromDriveList` 是完全相同的一行函数**
  （`hooks/useAuthFlow.ts:274-275`），可以合并（低优先级）。

- [ ] **`mergeVaults` 时间戳完全相等时用 JSON 字符串大小兜底** —
  `domain/vaultMerge.ts:14-18,68-69,94-95`。确定性没问题，但结果本质上是任意的，
  两台设备时钟一致导致 `updatedAt` 撞车时，哪一边的编辑被保留是不可预测的。
  建议在文档里更明确写出这个边界情况的行为，而不是改动逻辑（改动会破坏 order-independence 的测试保证）。

## P4 — 一致性 / 风格（低优先级）

- [ ] **缩进不统一** — `EntryModal.tsx`、`CategoryInput.tsx`、`CustomPropertiesEditor.tsx`、
  `AttachmentList.tsx` 用 4 空格缩进，其余文件按约定用 tab。

- [ ] **一处硬编码字符串未走 i18n** — `components/Toaster.tsx:109` 的 `aria-label="Close"`。

- [ ] **CLAUDE.md 与代码有一处小漂移** — 文档里 `IconButton` 的 variant 写的是
  `del | x | eye | row | copy`，实际代码（`components/button/tokens.ts`、`IconButton.tsx`）
  只有 `del | x | eye | copy`（"row" 已并入 "copy"），文档需要更新。

## 已知限制（CLAUDE.md 中已记录，仅供交叉参考，无需重复修）

- `services/storage.ts` 缺少测试（需要 `fake-indexeddb`）。
- `Vault.deletedEntries` 墓碑永不清理。
- Drive file-id ↔ vault 映射存在 `localStorage`，多设备场景下 "connect" 已链接过的 vault 会重复创建文件。
