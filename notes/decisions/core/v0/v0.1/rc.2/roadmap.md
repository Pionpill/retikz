# v0.1.0-rc.2 示例库与搜索体验计划

> 写于 2026-05-14。rc.2 承接 rc.1 暂不处理的用户体验增强：独立 Examples / Recipes section、搜索索引增强、AI 对话输入框重构、AI 回复渲染 retikz 图。
>
> 关联：[`v0.1-rc.1.md`](../rc.1/roadmap.md) · [`flow-rc`](../../../../../../.agents/skills/flow-rc/SKILL.md)

## 背景与定位

rc.1 先处理核心文档结构、组件页拆分与发布候选验收。rc.2 再补面向任务的示例库和搜索能力，避免 rc.1 范围过大。

## 进度看板

> 状态更新 2026-05-17：TODO-2 / 3 / 4 已落地；TODO-1 基础设施 + 首例（Karl 单位圆）就绪，更多场景示例由维护者按需续加。

| # | 标题 | 状态 | 工作量 | 优先级 | 关键提交 |
| --- | --- | --- | --- | --- | --- |
| 1 | 新增 Examples / Recipes section | 进行中（铺例中） | 中 | P0 | `59b9702` 分组首例 / `c666602` 规范重写 + `InlineMarkdown` |
| 2 | 搜索索引增强 | 已完成 | 中 | P1 | `746849f` mdx 正文索引 + 命中高亮与 snippet |
| 3 | AI 对话输入框重构 v4.2：线框风 + 上下分离 + Detail/Settings popover + 润色 + 语音 | 已完成 | 大 | P1 | `74e7c03` Copilot 风格重构 / `8c911b2` v4.2 落实施 / `1fc6092` picker icon-only + tooltip 收尾；移动端 Sheet（`14e45fe`）+ 拖拽变宽（`4ebaaed`）顺带 |
| 4 | AI 回复中渲染 retikz 图：ComponentPreview 抽核心 + ` ```retikz-ir` / ` ```retikz-tsx` 双协议 | 已完成 | 大 | P1 | `9ea242f` 4-1 抽 `ComponentRender` / `24f9081` 4-2 `jsx-to-ir` / `6270b1c` 4-3 `RetikzPreview` / `81b63b9` 4-4 `AiChatMessage` 识别围栏 / `171e89a` 4-5 `DiagramFormatPicker` + `composeSystem` 协议 / `53223a3` 4-6 i18n 收尾 |

---

## TODO-1 — 新增 Examples / Recipes section

### 问题

现有示例数量不少，但分散在组件页中。用户常见问题通常不是“某个 prop 怎么写”，而是“怎么画一个流程图 / 箭头关系图 / 带 label 的路径 / 虚线样式图”。

### 页面挑选

具体页清单待定（由维护者按当前用户问得最多的场景挑），不在此处提前列死。每页落在 `core/examples/<page-id>/index.{zh,en}.mdx`。

每页结构：

1. 一句话说明适用场景。
2. 一个可复制的完整 `<TikZ>` 示例。
3. 简短拆解：用了哪些组件、关键 props 是什么。
4. 指向相关 API 页面。

### 验收

- 每页中英文并行。
- 每页至少一个 `<ComponentPreview>`。
- 示例使用 rc API，不出现旧字段。
- 示例能作为用户复制粘贴入口，不依赖阅读内部 ADR / plan。

---

## TODO-2 — 搜索索引增强

### 问题

当前搜索主要基于 `data` label。用户搜索 `dashPattern`、`layout`、`anchor`、`lineCap` 这类正文和代码标识符时，结果可能不够直接。

### 建议

轻量增强即可：

- 从 mdx raw 提取 frontmatter title / description。
- 提取 `##` / `###` 标题。
- 提取代码标识符或 inline code。
- 搜索结果保留当前页面跳转粒度，先不做 heading 深链。

### 验收

- 搜 `dashPattern` 能命中 Draw / Path / Node stroke style 相关页。
- 搜 `layout` 能命中 TikZ / Scene schema / changelog 或 migration 相关页。
- 搜 `anchor` 能命中 Anchors / Coordinate / Node 相关页。

---

## TODO-3 — AI 对话输入框重构 v4.2：线框风 + 上下分离 + Detail/Settings popover + 润色 + 语音

### 问题

当前 `AiChatSettings` 把两类性质不同的参数堆在同一表单：

- **一次性配置**（写一次几乎不再动）：Provider 选择、API Key、Base URL
- **每请求参数**（按对话切换）：Model、Context Mode

Model 是按请求传给 provider 的运行时字段，同一 API Key 对该 provider 旗下所有模型通用；用户想"快问用便宜模型、难题切高端"时被迫返回 Settings 视图，与 ChatGPT / Claude / Cursor / VSCode Copilot 等主流 chat UI 心智不符。Context Mode 同理。

同时，当前 provider 列表硬编码 DeepSeek / OpenAI / Anthropic 三家，OpenAI 兼容生态里大量厂商（Together / Mistral / Groq / 本地 vLLM 等）用户无法接入。

### 设计（参考 Dribbble "AI Prompt Input Anatomy"，线框风）

input 整体分三段，**header / footer 都脱离主 card，独立排在上下两侧**（无 border / 无填色，跟外层 bg 同色）：

```
[chips（max 2 行 + 滚动）         ............... [Detail] [Settings]]   ← detached header
╭────────────────────────────────────────────────────────────────╮
│ textarea（默认 2 行、最多 5 行后内部滚动）                [Wand2] │
│                                                                  │
│ [+] │ deepseek-v4-flash ▾  Balanced ▾    [25% 圆环] [Mic] [Send]│   ← toolbar
╰────────────────────────────────────────────────────────────────╯
[Esc] 取消生成                                                       ← detached footer
```

**header（detached，无 border）**：

- 左侧：**只展示 chips 列表**（不再放 Add Context 按钮，Add Context 挪到 toolbar 的 `+`）
  - chips 仍 border-only、无背景填充
  - **最多展开 2 行**（`max-h ≈ 44px`），更多用 `flex-wrap` + 内部 y 滚动（滚动条隐藏）
  - 当前页自动入选、可手动 × 移除
- 右侧：两个 icon 按钮（ghost）
  - **Detail**（Eye icon）→ 点击弹 popover 展示所有引用文件细节
  - **Settings**（SlidersVertical 类 icon）→ 点击弹 popover 展示所有配置详情

**prompt card（唯一有 border 的容器，bg-transparent）**：

1. **textarea** —— 默认 2 行高度，自适应展开 **最多 5 行**（`max-h ≈ 120px`），超出后内部 y 滚动（滚动条隐藏）。Enter 提交、Shift+Enter 换行。
2. **右上角 Wand2 润色按钮** —— 点击调当前模型把 draft 重写为更清晰版本，结果替换 draft；进行中按钮 spinner / disabled。
3. **底部 toolbar**：
   - 左：`+`（icon-only，Add Context） │ 竖分隔线 │ **Model picker（文字 + ChevronDown）** │ **Context Mode picker（文字 + ChevronDown）**
   - 右：**上下文圆环 + 百分比**（点击仍弹用量细节 + 压缩按钮）│ **Mic**（Web Speech API 可用时显示）│ **ghost Send**（Lucide `Send` 飞机 icon，size-7 ghost，沿用现有实现）

**footer（detached，无 border）**：

- 仅左侧：`[Esc]` kbd + "取消生成"，始终可见

### Add Context popover（沿用现有实现）

`+` 按钮触发，仍走 v3 已抽好的 `DocsSearchPanel`（搜索 + 多选 toggle + 共用 ContextMode key）。位置改在 toolbar 而非 header，行为不变。

### Model picker / Context Mode picker

- **Model picker 文本按钮**：显示当前 model id（如 `deepseek-v4-flash ▾`，font-mono）；点击弹 popover，按 provider 分组、未填 Key 的内置 provider 整组隐藏、底部 `+ 自定义模型名…` / `+ 添加 Provider…` 双入口（沿用 v3 实现）
- **Context Mode picker 文本按钮**：显示当前 mode 翻译（`Balanced ▾`）；点击弹 popover（沿用 v3 实现）

### Detail popover（header 右 Eye 按钮触发）

- 顶部一行：context 总览（用量圆环 + `xK / xK · x%`）
- 中间列表：每个已选 context 文件
  - File icon + 标题 + slug 路径（font-mono 小字）
  - 右侧估算 tokens（`~ 6.2K`）
  - System prompt 单独一行（intro + llms.txt 索引、`~ 21.7K`）
- 底部一个 **"压缩对话"按钮**（沿用 `compressConversation` 实现，从原 meta 行的 Compress 挪到这里）

### Settings popover（header 右 SlidersVertical 按钮触发）

紧凑展示当前配置：

- Provider / Model / Context Mode / API Key 状态（masked）/ Base URL
- 底部一个 **"打开完整 Settings…"** 链接，跳现有 `view='settings'`

### Wand2 润色按钮

- 仅当 `draft.trim().length > 0` 时启用
- 实现：用当前 provider + model 调一次非流式（或流式攒成 string），prompt 大致为：
  - zh：`把以下用户提问改写得更清晰、信息更完整，保留原意，不要回答：\n<draft>`
  - en：`Rewrite the following user message to be clearer and more complete. Preserve intent, do not answer.\n<draft>`
- 完成后 `setDraft(rewritten)` + focus；失败给 toast / 不动 draft

### Mic 麦克风

- 渲染前检测 `'SpeechRecognition' in window || 'webkitSpeechRecognition' in window`，不支持则按钮整个不渲染
- 点击开始录音、按当前 i18n 选 `lang='zh-CN' | 'en-US'`；识别中按钮高亮 + 提示；结束把 transcript append 到 draft
- 简易实现：单次录音模式（不做长按 / push-to-talk）

### Store 扩展

- 沿用 v3 的 `customProviders` / `customModels` / `contextSelection` / `draft` / `focusInputNonce` / `compressConversation`
- 新增 `polishingDraft: boolean` 标记润色进行中
- 新增 action `polishDraft(): Promise<void>`：用当前 provider 改写 draft

### 实现拆分

1. **拆 PR**：先做布局重排（header detach / toolbar 加 +、Wand2、Mic、圆环挪位置），再做 Detail / Settings popover，最后做 Wand2 + Mic 实际行为
2. `AiChatInput` 重构：抽出 `AiChatInputHeader`（chips + Detail/Settings 入口）/ `AiChatInputCard`（textarea + Wand2 + toolbar）/ `AiChatInputFooter`（Esc 提示）三层结构
3. 新增 `AiChatInputDetailPopover` / `AiChatInputSettingsPopover` 两个子组件
4. `AiChatInputPolishButton` / `AiChatInputMicButton` 独立子组件
5. 把现有 `AiChatInputMetaRow` 的圆环逻辑搬到 toolbar 的 `ContextUsageButton`（保留 popover）
6. Settings popover 复用已有 store selector；不破坏现有完整 `AiChatSettings` view
7. i18n：补 Detail / Settings popover / Wand2 / Mic 相关 key

### 验收

- header 与 footer 视觉上"脱离" card，无 border / 无填色，只剩内容
- chips 最多展开 2 行；超出内部 y 滚动；当前页自动入选
- Detail icon 弹窗展示所有引用文件 + 估算 tokens + 用量圆环 + 压缩按钮
- Settings icon 弹窗展示当前配置紧凑摘要 + 跳完整 Settings
- textarea 默认 2 行、最多 5 行后内部滚动
- Wand2 按钮调 LLM 重写 draft，成功后 setDraft；失败给可见错误
- Mic 按钮在不支持的浏览器（Firefox / Safari 部分版本）整体隐藏
- toolbar 左：`+`（icon） / 竖分隔 / Model 文字 / Context Mode 文字
- toolbar 右：上下文圆环 + % / Mic / ghost Send；点圆环仍弹用量细节 + Compress
- 底部 footer 只剩 Esc 提示

### 设计稿

`~/.claude-mockup/index.html`（本地静态预览，未入仓）。当前 v4.2 三段独立 variant：A 默认 / B header chips 满 2 行滚动 / C textarea 满 5 行滚动；Detail / Settings popover 沿用 v4.1 D/E variant 示意（card 移出 popover 内嵌的部分对应这版仍适用）。

### 已完成（v3 阶段）

- 多 Provider model picker 分组 / 自定义 model 与 provider 双入口
- Custom Providers section（settings 内）
- Context chips + Add Context popover（DocsSearchPanel 复用）
- compressConversation 动作
- 空态 suggestion 引导

### 待定

- chip 文案：`title`（"Button"）还是 slug 路径
- 当前页 chip 手动移除后是否自动随导航重新加入
- `contextSelection` 持久化与否
- 自定义 Provider 的 `id` 生成策略
- Wand2 润色用当前 model 还是固定走便宜 model 省成本
- Mic 录音中是否锁定其他 toolbar 操作

---

## TODO-4 — AI 回复中渲染 retikz 图：ComponentPreview 抽核心 + ```retikz-ir / ```retikz-tsx 双协议

### 问题

当前 AI 回复经 `AiChatMessage` 的极简 markdown 解析器渲染——段落 / 围栏代码块 / 列表 / 标题。回答 retikz 相关问题时，AI 只能"贴一段 TSX 让用户复制"或"画 ASCII"，**没有"AI 直接出图、用户看到 demo 卡"的能力**。

同时，文档 mdx 用的 `ComponentPreview` 走 build-time `import.meta.glob('../../../contents/**/*.demo.tsx')` 找 `.demo.tsx` 模块，**无法**复用到运行时 AI 内容——加载机制错位。

### 设计

#### 架构（Core + 两个 wrapper）

```
                ┌────────────────────────────────────────┐
                │ ComponentRender                         │
                │ ────────────────                        │
                │ 入参：                                  │
                │  - Component: FC                        │
                │  - sourceViews: { react?, ir? }         │
                │  - align / size / hideCode / className   │
                │ 负责：卡片骨架 / pan&zoom / 工具条 /     │
                │       View Code 折叠 / IR/React 切换 /  │
                │       复制 / 放大对话框                  │
                └─────┬──────────────────────────┬───────┘
                      │                          │
       ┌──────────────┴───────┐    ┌─────────────┴────────────┐
       │ ComponentPreview     │    │ RetikzPreview            │
       │ （MDX 文档站用）     │    │ （AI 消息用）             │
       │ ──────              │    │ ──────                   │
       │ name → glob 找 demo  │    │ format + source →        │
       │ → 源码字符串 + 模块  │    │  - retikz-ir: JSON.parse │
       │ → derive IR          │    │  - retikz-tsx: parseJsx  │
       │ → 喂 ComponentRender │    │    ToIR → IR             │
       │                      │    │ → <TikZ ir={ir}/> 当     │
       │                      │    │   Component，加源码视图  │
       │                      │    │ → 失败：错误卡            │
       └──────────────────────┘    └──────────────────────────┘
```

`ComponentRender` 只关心"卡 + 已经能渲染的内容"，不再触碰 glob 或 AST。

#### 协议：fenced lang 双 sentinel

AI 回复里两种 fenced block 触发图渲染：

````markdown
```retikz-ir
{ "children": [ { "type": "node", "position": { "x": 0, "y": 0 }, "text": "A" } ] }
```

```retikz-tsx
<TikZ>
  <Node position={{ x: 0, y: 0 }}>A</Node>
  <Draw from="a" to="b" />
</TikZ>
```
````

- `retikz-ir`：`JSON.parse` → `<TikZ ir={ir} />`；Preview 代码区**只**有 IR 视图（React toggle 隐藏）
- `retikz-tsx`：走 AST 解析（无 eval）→ React element 数组 → 现有 `convertReactNodeToIR` → IR → `<TikZ ir={ir} />`；Preview 代码区**双**视图：React = AI 原文 / IR = 派生

两种 sentinel 名一律小写、无别名，便于 system prompt 教模型只学这两个串。

#### AST 解析器（`apps/docs/src/lib/jsx-to-ir/`）

放 docs app 内（不污染 `@retikz/react` 运行时包），将来 cli / playground 也要用再升级为 `@retikz/parser`。

- 用 `acorn` + `acorn-jsx` parse 成 ESTree
- **组件白名单**：只识别 `@retikz/react` 当前导出的 8 个组件名 — `TikZ / Node / Path / Step / Text / Coordinate / Draw / EdgeLabel`
- **props 限制**：只允许字面量——string / number / boolean / null / 数组字面量 / 对象字面量；遇到 Identifier / CallExpression / ArrowFunction / BinaryExpression 等直接报错
- **children**：仅嵌套 JSX 元素 + 字符串字面量 / `JSXText`
- 不通过时给出**具体**不支持原因——例：`不支持的表达式：foo.map(...)`、`不支持的组件：div`、`不支持的 prop 值：x={i * 20}`
- 单一公开签名：`parseJsxToIR(source: string): { ok: true, ir: IR } | { ok: false, error: string }`

字段名一律全称遵守 AGENTS.md § 代码风格：`direction` 不写 `dir`、`position` 不写 `pos`、`startAngle` 不写 `start`。AI 出全称、AST 解析不接受缩写别名。

#### 流式占位

`AiChatMessage` 的极简 markdown 解析器（`parseBlocks`）多一个分支：**未闭合的 fenced 块**（扫到 ` ``` retikz-ir` / ` ``` retikz-tsx` 起点、但流尾在闭合 ` ``` ` 之前）渲染成 `ComponentRender` **骨架**（与已闭合时同尺寸的 card 外壳 + skeleton shimmer 动画）。块闭合后整段 markdown 重渲染就自然替换为真图。

实现：`parseBlocks` 现在遇 ` ``` ` 找不到关合就被忽略；改成"找不到关合且 lang 是 `retikz-*`"时产 `{ type: 'retikz-pending', format }` 块；其它 lang 维持现在的（默认按普通 code 块继续解析直到流尾）。

#### 错误处理

`RetikzPreview` 拿到非法 IR / 非法 TSX 时，渲染**错误卡**（不打 toast、不污染 chat-level error，错误就近粘在 message 内）：

- 顶部一行：红色 `AlertCircle` + 错误分类与原因（例：`IR JSON 解析失败：Unexpected token } at column 47`、`JSX → IR 失败：不支持的表达式 foo.map(...)`）
- 下方折叠的"View source"按钮 → 展开原始 AI 字符串（`<CodeBlock lang="json"/"tsx" />`），用户能复制、能再让 AI 重试

### AI 输入框新增 DiagramFormatPicker

放 `AiChatInput` 底部 toolbar 左侧、`AiChatInputContextModePicker` 之后：

```
[+] │ deepseek-v4-flash ▾  Balanced ▾  Auto Diagram ▾    [25%] [Mic] [Send]
                                       └─ 新增选择器（Popover）
```

三档（枚举值与 fenced lang 对齐，picker label 保留口语 "JSX"）：

| 枚举值 | picker label | 默认 | 含义 | 拼进 system prompt 的指令（中/英对应） |
|----|----|------|------|------|
| `auto` | Auto | ✓ | 让 AI 自选 | 「需要画图时，简单几何用 ```retikz-tsx，复杂 / 嵌套深的拓扑用 ```retikz-ir。」 |
| `ir`   | IR  |   | 强制 IR | 「需要画图时只输出 ```retikz-ir，不要给 TSX。」 |
| `tsx`  | JSX |   | 强制 JSX/TSX | 「需要画图时只输出 ```retikz-tsx，不要给 IR JSON。」 |

实现：抄 `AiChatInputContextModePicker` 的 Popover + 文字按钮样式（与 ModelPicker 同型）。icon 走 Lucide `Shapes`（备选 `GitBranch` / `Sparkles`，待定）。

### System prompt 扩展（`composeSystem`）

签名加第四参数：

```ts
composeSystem(
  mode: ContextMode,
  page: CurrentPage | null,
  extras: ReadonlyArray<ExtraContextItem> = [],
  diagramFormatPreference: 'auto' | 'ir' | 'tsx' = 'auto',
): Promise<string>
```

在 intro 之后、`## Current page` 之前插入 **"Diagram output protocol"** 段（中英对应）。内容：

1. 介绍两个 sentinel 名与典型外观（各给一个最小示例）
2. retikz-tsx 的硬约束：组件白名单（列 8 个名）+ props 仅字面量 + 禁 `.map` / hooks / 表达式
3. 字段名一律全称（IR schema 字段 + JSX prop 名）
4. 按 `diagramFormatPreference` 拼一句**强约束**（`auto` 走选词建议，`ir` / `tsx` 走"只能用 X"）

IR schema 不全量塞 system prompt（太大），靠 llms.txt 索引 + 当前页 mdx + 模型自身记忆。需要时引导 AI 去站内 IR schema 页查（`/core/ir/schema` 等）。

### Store 扩展（`useAiChatStore`）

- 新增 state `diagramFormatPreference: 'auto' | 'ir' | 'tsx'`，默认 `'auto'`
- 新增 action `setDiagramFormatPreference(p)`
- `send` 内调 `composeSystem(state.contextMode, state.currentPage, state.contextSelection, state.diagramFormatPreference)`
- `partialize` 把它加进持久化字段列表（与 contextMode / model 同 persist）

### 实现拆分

1. **`ComponentRender` 抽取（无功能变化）**：把 `ComponentPreview.tsx` 现有渲染 / pan&zoom / 工具条 / 折叠 / IR-React 切换 / Copy / Maximize 逻辑搬到新建 `ComponentRender`；`ComponentPreview`（MDX）退化成 "glob 加载 + derive IR + 调 `ComponentRender`" 的薄壳。验收：文档站所有现有 `<ComponentPreview>` 用法视觉与行为完全不变
2. **AST 解析器**：`apps/docs/src/lib/jsx-to-ir/` 新建；单测覆盖白名单组件 / 字面量 props / 嵌套 children / 不支持表达式 / 不支持组件 / `<Draw way="..." />` 字符串 DSL / 异常输入
3. **RetikzPreview**：接 `format: 'ir' | 'tsx'` + `source: string`，按 format 走 JSON.parse 或 `parseJsxToIR` → 喂 `ComponentRender` 或错误卡；hideCode 等 prop 走默认值，调用者通常不传
4. **markdown 解析器扩展**：`parseBlocks` 加 `retikz-pending` / `retikz-block` 两种 block；`renderMarkdown` 里两种 block 都走 `RetikzPreview` / 骨架
5. **DiagramFormatPicker** + store 字段 + `composeSystem` 第四参数 + system prompt 段（中英）
6. i18n：补 `ai.diagramFormat*`（picker label / 三档名）/ `ai.diagramRenderError*` / `ai.diagramGenerating` key 中英

### 验收

- MDX 文档站所有现有 `<ComponentPreview>` 用法**视觉与行为完全不变**（Core 抽取无回归）
- AI 回复 ```retikz-ir 块能渲染成 Preview 卡（IR 单视图、React toggle 不出现）
- AI 回复 ```retikz-tsx 块能渲染成 Preview 卡（React + IR 双视图：React = AI 原文不重排版、IR = 派生）
- 非法 IR / 非法 TSX 显示错误卡 + 可展开原始 source；不打 toast、不污染对话
- ```retikz-tsx 包含表达式 / hooks / `.map()` / 非白名单组件时**报具体不支持类型**，不静默渲染半个图
- 流式生成中：扫到 fenced 开头立即出骨架；闭合后无缝替换为真图、不出现"先报错再变成图"
- 输入框 toolbar 出现 DiagramFormatPicker（IR / JSX / Auto），选中后持久化、下次会话自动恢复
- DiagramFormatPicker 选择反映到 system prompt——切到 `ir` 后强约束生效，AI 不再产 TSX 块（依赖模型遵守，能观测到即可）
- 字段名缩写（如 `dir` / `pos`）在 AST 解析里被识别为"未知 prop"而非静默忽略

### 待定

- 错误卡上是否加 "重新生成" 按钮（重发上条对话 + 暗示让 AI 修复）
- DiagramFormatPicker 的 icon（Shapes / GitBranch / Sparkles）和文案（`Auto Diagram` / `Diagram: Auto` / 仅 icon + tooltip）
- AST 解析器是否允许 `<Draw>` 的 `way` DSL prop（`way` 是 string DSL，字面量字符串可以，但内嵌 sugar 函数调用应拒绝）
- `retikz-ir` block 顶层是否允许省略 `{"children": ...}` 外壳、直接给 children 数组（省 AI token，但 IR 顶层将来若加 schema 字段会破坏向后兼容）
- 流式中间态骨架是 spinner 还是几行 shimmer，骨架是否也带"取消生成"小按钮
- 是否需要在 `lean` 模式下也强制带 diagram protocol 段（`lean` 当前只送当前页+intro，最省 token——加 protocol 段会膨胀几百 token）
