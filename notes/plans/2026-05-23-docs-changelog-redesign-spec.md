# 文档站 Changelog 界面重设计 — 设计文档

- 日期:2026-05-23
- 状态:待评审(Draft)
- 范围:`apps/docs` 文档站的 changelog 页面

## 1. 背景与目标

现版 changelog 是纯 MDX 散文(`contents/about/releases/changelog/index.{zh,en}.mdx`),由 `<Update>` 组件渲染成「左=月份+包名 / 右=mdx 正文」两列。所有 v0.1/v0.2 内容压在一个 `2026.05` 块里,左侧聚合维度与右侧实际版本跨度脱节,且无法按包筛选、无法折叠预发布。

目标:把 changelog 改成**结构化数据驱动**的三栏界面,参考 langchain changelog 的信息密度:

- 默认只呈现「中版本」(如 `v0.2` / `v0.1` / `v0.0`),预发布 / patch(alpha / beta / rc / `x.y.z`)默认折叠
- 左侧时间线按中版本排列,显示**具体日期**
- 右侧用**多选包筛选**替代 TOC
- 每个「包 × 中版本」一块内容:包名+版本、≤200 字符描述、可嵌套的 label:content 列表、可展开的逐预发布明细

## 2. 已确认的需求决策

| # | 决策 |
|---|---|
| 数据形式 | TS 数据模块 + 专用 React 组件;文本字段为 markdown 字符串,双语 `{ zh, en }` |
| 时间线粒度 | 按中版本(MINOR)一个节点,倒序 |
| 时间线日期 | 该中版本 **stable 发布日**;无 stable → 显示「开发中」 |
| 日期来源 | 从 git 记录推导(tag 优先,无 tag 从 version bump / changelog commit 推) |
| 折叠模型 | **模型 A**:highlights 常驻 + 展开补每版明细 |
| highlights 来源 | **两层分别撰写**:highlights 为中版本级精选(单独写),`subVersions[].items` 为逐预发布明细 |
| 筛选 | 多选,默认全选,持久化;「文档站」也是可筛选包 |
| 筛选效果 | 取消某包 → 隐藏该包所有块;某 Release 无可见块 → 整节点+内容隐藏;时间线节点内的包行随筛选过滤 |
| 搜索索引 | **不纳入本次范围** |

## 3. 数据模型 `apps/docs/src/data/changelog.ts`

类型可单独放 `interface.ts` 或与数据同文件。

```ts
type Localized = { zh: string; en: string };

/** 一条变更:加粗 label + markdown content,可嵌套 */
type ChangeItem = {
  label: Localized;
  content: Localized;          // markdown 字符串(链接 / 行内 code)
  children?: ChangeItem[];
};

/** 一个预发布 / patch */
type SubVersion = {
  version: string;            // 'alpha.4' | 'rc.2' | 'beta.1' | '1'(patch) …
  date: string;              // 'YYYY-MM-DD',git 推导
  summary?: Localized;        // 该预发布一句话定位(可选)
  items: ChangeItem[];        // 该预发布的逐版明细
};

/** 一个包在某中版本里程碑下的整块内容 */
type PackageBlock = {
  pkg: PackageId;            // '@retikz/core' | '@retikz/react' | 'docs' | 'retikz' | 未来 '@retikz/plot'
  version: string;           // 'v0.2'(该包在此里程碑的中版本)
  description: Localized;     // ≤200 字符中版本级摘要
  highlights: ChangeItem[];   // 常驻精选(单独撰写)
  subVersions: SubVersion[];  // 逐预发布明细(默认收起)
};

/** 一个中版本里程碑 = 一个时间线节点 */
type Release = {
  minor: string;             // 'v0.2'(key)
  stableDate: string | null;  // stable 发布日;null ⇒「开发中」
  packages: PackageBlock[];
};

export const changelog: Release[] = [ /* 倒序 */ ];
```

- `PackageId` 用 `as const` 数组派生联合类型(对齐本仓 `ValueOf` + 派生枚举风格),筛选 chips 列表也由它派生
- 文本字段一律用 `InlineMdx` 渲染(同步编译,支持链接 / 行内 code)
- 若加 zod 校验:`description` 长度上限 200;`PackageBlock.pkg` 限定在 `PackageId`;date 格式 `YYYY-MM-DD`

## 4. 组件与文件结构 `apps/docs/src/components/shared/changelog/`

| 文件 | 职责 |
|---|---|
| `ChangelogView.tsx` | 中栏容器,内部 2 列 grid:`[时间线 rail][发布列表]` |
| `ChangelogTimeline.tsx` | 左 rail:节点=日期+各包名/版本,sticky,点击滚动定位,滚动高亮当前节点 |
| `ChangelogRelease.tsx` | 一个 Release → 渲染其可见 PackageBlock 列表 |
| `ChangelogPackageBlock.tsx` | 包头 + 描述 + highlights + 展开器(无线框,平铺) |
| `ChangelogSubVersions.tsx` | 展开后的逐版明细(版本 + 日期 + items) |
| `ChangelogFilter.tsx` | 右 aside:多选筛选 chips |
| `changelogToMarkdown.ts` | 数据 → markdown 序列化(AI 上下文 / 复制) |
| `index.ts` | 桶导出 |

每块内部结构:`包名(mono) + 版本徽章` → `description` → `highlights 列表(label:content,可嵌套)` → `▸ 共 N 个预发布` 展开器 → 展开后 `逐 SubVersion(version + date + items)`。

## 5. DocPage 接入与共享状态

- `DocPage.tsx` 增加分支:命中 changelog 页(`moduleId=about` & `sectionId=releases` & `pageId=changelog`)时:
  - 中栏渲染 `<ChangelogView>`,**跳过** `useMdxSource` / `MdxContent`
  - aside 渲染 `<ChangelogFilter>`,**替代** `MdxToc`
  - 其余壳保留:页标题(i18n `about.changelog`)、`description`(从 changelog 数据模块导出 `changelogPageDescription: Localized`,DocPage 取当前语言串)、`DocPageFooterNav`
- 新增 `useChangelogFilterStore`(`apps/docs/src/store/`,zustand + persist,仿 `useTocStore`):存「选中包集合」,默认全选。`ChangelogFilter` 写,`ChangelogView` / `ChangelogTimeline` 读
- AI 上下文 & 页面动作:`changelogToMarkdown(lang)` 产出 markdown,喂给 `setAiChatCurrentPage({ mdx })`;`DocPageActions` 的复制走同一序列化;其「查看源文件」`rawUrl` 指向 GitHub 上的 `apps/docs/src/data/changelog.ts`

## 6. 时间线 / 筛选 行为细节

**时间线(左 rail)**
- 每个 Release 一个节点,倒序
- 节点内容:`stableDate`(无则斜体「开发中」)+ 各包 `pkg vX.Y` 竖排(随筛选过滤)
- 点击节点 → 平滑滚动到对应 Release;滚动时按视口位置高亮当前节点(仿 `MdxToc` 的 scroll 监听 + offset)

**筛选(右 aside)**
- 多选 chips,默认全选,持久化
- 取消某包 → 隐藏其所有 PackageBlock
- 某 Release 在筛选后无可见块 → 整个时间线节点 + 内容块一并隐藏
- 边界:全不选 → 显示空态提示

## 7. 日期来源(实现时执行)

写数据时从 git 推导:

- 有 tag 的版本:取 tag 日期
- 无 tag 的(`v0.1.0` stable、`v0.1.0-beta.1`、`v0.2.0-alpha.1` 等):从对应 version bump / changelog commit 日期推
- 时间线节点 `stableDate`:取该中版本 stable 发布日;v0.2 尚无 stable → `null` →「开发中」

## 8. 受影响的旧物 + 周边触点

- 删 `contents/about/releases/changelog/index.{zh,en}.mdx`
- 删 `components/shared/update/`(`Update.tsx` 仅 changelog 用过)+ 从 `mdx-content/components.tsx` 的 `mdxComponents` 注销 `Update`
- i18n 补串(zh+en):`筛选包` / `开发中` / `共 N 个预发布` / `展开` / `收起` / 空筛选态等
- `gen-llms-txt`:changelog 仍由 sections 数据列出,删 mdx 后仅丢失 description 行;**可选**让脚本调 `changelogToMarkdown` 补 description(低优先)
- 搜索索引:**本次不处理**(已确认 out of scope)

## 9. 响应式

- aside(筛选)沿用 TOC 的 `@[64rem]` 容器查询显隐 + toggle;窄屏 aside 收起时,筛选 chips 改为内容区顶部一行横排
- 时间线 rail:移动端隐藏,改为每个 Release 顶部内联「日期 + 包/版本」头

## 10. 测试

- 数据类型自洽(若加 zod,补 `description` 超长 / 非法 `pkg` / 非法 date 用例)
- `changelogToMarkdown` 序列化快照
- `useChangelogFilterStore` 行为 + 全不选边界
- 组件渲染:收起/展开切换、筛选隐藏块、空筛选态、「开发中」节点

## 11. 非目标 / Out of scope

- 搜索索引接入 changelog 数据
- 自动从 git 实时生成 changelog(本次为手工撰写数据 + 一次性 git 推导日期)
- RSS / 订阅
- 旧 `<Update>` 的兼容保留

## 12. 开放问题

无(关键决策已在第 2 节确认)。
