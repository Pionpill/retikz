---
name: docs-doc-example
description: Use when writing a step-by-step Retikz tutorial that combines capabilities into a complete result, regardless of solution directory; AI prompt demonstrations are optional and task-specific.
---

# 综合示例教程

先读 docs-doc-principle 与 [页型词典](../docs-doc-principle/references/page-contract.md)。固定入门难度，以完整作品为载体教调用已有能力；不要求 examples 路径。成品展示额外读 docs-doc-showcase；完整内部过程使用 docs-doc-mechanism，不混进跟做步骤。

## 阅读结构

1. 开篇：说明目标，hero 复用最后一步的 ComponentPreview
2. 仅当案例教授 AI 创作时增加 `## Prompt`，普通教程省略
3. `## 过程`：每步用 `### 步骤 N：<目标>`（英文 Step N），说明新增结果、原因和真实代码；demo 累加前一步内容
4. `## 能力`：需要复盘组合关系时用能力链接、角色与步骤锚点表，不复制 API 字典
5. `## 错误与限制`：只写本例真实边界，存在时展示，不虚构 roadmap 或缺口
6. `## 延伸阅读`：LinkedSections 链接相关能力与后续任务，无链接则省略

步骤 H3 进入 TOC，DocStep 仅用于步内接入操作。复杂度增加时保留可跟随的最小主线；独立的进阶专题拆成底层页，不通过修改教程难度掩盖阅读负担。

## Demo

- 新主 demo 使用 `<example-id>-NN-<topic>.tsx`，NN 两位数字；可见文案用同名 i18n 字典，具体约定见 [ComponentPreview](../docs-doc-principle/references/component-preview.md)
- 每步是自包含、可复制的阶段快照；简单 helper 内联，大型共享设施用附属文件并展示源码，不隐藏依赖
- 单能力教程链接 usage；自定义 Definition 链接 extension；不强制所有领域都使用 Kernel 的某一种绘图组件
- 颜色与叙述图遵循现有预览和图示契约；每步 demo 展示清晰的新增效果，不靠图数证明教学完整

## 多文件 demo（子文件 + 自动 diff）

默认每个 demo 内联自包含（见上）。当 demo 体量过大、或多步共用同一套基础设施（自定义形状 / 布局 / 端点表）时，把内容拆成**子文件**，由 `<ComponentPreview files={[...]}>` 一并展示。`files` 的**第一项必须是主 demo**，后续项才是附加子文件。子文件分两类：

| 类别       | 命名                                                                                       | 用途                           | diff         |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------------------ | ------------ |
| 步内子文件 | `<主demo名>.<subName>.tsx`（**无 `.demo`**，如 `ohms-law-circuit-02-shapes.elements.tsx`） | 只属于某一步、随步演进         | 自动（见下） |
| 共享子文件 | 独立名 `<name>.tsx`（如 `circuitShapes.tsx`）                                              | 跨多步复用、基本不变的基础设施 | 不 diff      |

- 子文件是**纯源码**（不渲染），用普通 `.tsx` / `.ts`，**不要带 `.demo.tsx`**——带了会被当成可渲染 demo（要求 default 导出 FC、并去算 IR）。
- 步内子文件以**所属步的主 demo 名**为前缀，`<subName>` 在各步间保持稳定（如各步都叫 `.elements.tsx`），这是自动 diff 配对的钥匙。
- **造的数据集**用专门的 `<主demo名>.data.ts` 子文件（多数据集 `<主demo名>.<dataset>.data.ts`），有专属 Database 图标——通用约定见 [`ComponentPreview 按需契约`](../docs-doc-principle/references/component-preview.md)。

### 渐进式例子的子文件 = 自包含快照

渐进式例子若用子文件，**每步的步内子文件必须是该阶段的自包含快照**——直接写出本步完整内容，**不要 `import` 上一步的子文件**。import 链虽 DRY，但相邻步是不同模块、diff 没有意义；自包含快照换来「步与步之间真正可 diff」。跨步不变的部分才抽进共享子文件。

### 自动 diff 配对

`<ComponentPreview>` 的 `files` 第一项给主 demo 设了 `diffFrom` 后：

- 后续项里**以当前 demo 名为前缀**、且没有显式 `diffFrom` 的步内子文件，自动与 `<主 diffFrom>.<同 subName>.tsx` 做 diff（默认只看新增高亮）；baseline 不存在则静默无 diff。
- 共享子文件（非该前缀）不 diff，原样展示。

```mdx
<ComponentPreview
  files={[
    { file: 'ohms-law-circuit-02-shapes', diffFrom: 'ohms-law-circuit-01-meters' },
    'ohms-law-circuit-02-shapes.elements.tsx',
    'circuitShapes.tsx',
  ]}
/>
{/* elements.tsx 自动 diff ohms-law-circuit-01-meters.elements.tsx；circuitShapes.tsx 共享件不 diff */}
```

跨步 / 跨名的特殊配对，用显式对象形式覆盖：`{ file: 'a.tsx', diffFrom: 'b.tsx' }`。

## AI 创作案例的 Prompt

仅 AI 创作案例使用，普通教程不添加。

### 形态：`<ExamplePrompt>`

`<ExamplePrompt>` 只读，默认显示 `short`；有 `detailed` 时可展开。按钮行为由组件负责：复制时加 retikz 外部上下文，发送到站内 AI 时只填当前 prompt。

### Prompt 写作要点

- **`short`**：markdown，一句话能讲完。重点是「画什么」，不是「怎么画」。可用 `**bold**` 强调关键短语
- **`detailed`**：markdown，3-7 个分类（如「几何」/「颜色」/「标注」/「文字」），分类标题用 `**bold**`，每类下 bullet 列表 ≤ 5 行
- **避免**给精确坐标——让 LLM 有发挥空间。给意图 + 约束，不给坐标
- **`detailed` 可省略**——简单 example 单 `short` 即可
- 双语：index.zh.mdx 与 index.en.mdx 各自写一份 `short` / `detailed`——两边语义对齐，不强求逐字翻译
- Prompt 内容**不要列 retikz 组件清单**（如「用 Path / Step / Draw / Node」）——这种限定 LLM 用什么 API 反而压表达空间；复制按钮的上下文头已经提示 AI 可用任意 `@retikz/*` API + 让它查 llms.txt，文档化任何具体能力都是反模式

## 验证

沿步骤实际检查每步能运行、相邻快照 diff 有意义、能力链接和 H3 锚点有效。中文或含符号标题的锚点从真实 slug 核对，不手猜。检查双语、两种接入入口与最终结果，按 docs-doc-principle 的受影响范围门禁执行。
