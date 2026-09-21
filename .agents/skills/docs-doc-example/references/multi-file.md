# 多文件与渐进快照

## 多文件 demo（子文件 + 自动 diff）

默认每个 demo 内联自包含（见上）。当 demo 体量过大、或多步共用同一套基础设施（自定义形状 / 布局 / 端点表）时，把内容拆成**子文件**，由 `<ComponentPreview files={[...]}>` 一并展示。`files` 的**第一项必须是主 demo**，后续项才是附加子文件。子文件分两类：

| 类别       | 命名                                                                                       | 用途                           | diff         |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------------------ | ------------ |
| 步内子文件 | `<主demo名>.<subName>.tsx`（**无 `.demo`**，如 `ohms-law-circuit-02-shapes.elements.tsx`） | 只属于某一步、随步演进         | 自动（见下） |
| 共享子文件 | 独立名 `<name>.tsx`（如 `circuitShapes.tsx`）                                              | 跨多步复用、基本不变的基础设施 | 不 diff      |

- 子文件是**纯源码**（不渲染），用普通 `.tsx` / `.ts`，**不要带 `.demo.tsx`**——带了会被当成可渲染 demo（要求 default 导出 FC、并去算 IR）。
- 步内子文件以**所属步的主 demo 名**为前缀，`<subName>` 在各步间保持稳定（如各步都叫 `.elements.tsx`），这是自动 diff 配对的钥匙。
- **造的数据集**用专门的 `<主demo名>.data.ts` 子文件（多数据集 `<主demo名>.<dataset>.data.ts`），有专属 Database 图标——通用约定见 [`ComponentPreview 按需契约`](../../docs-doc-principle/references/component-preview.md)。

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
