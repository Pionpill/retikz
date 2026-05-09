# ADR-0002：多行文本——数组 vs 字符串内嵌 `\n`

- 状态：Proposed
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.2](../plans/v0-roadmap.md) · [tikz-gap-analysis §1 P1](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

alpha.1 的 `IRNode.text: string` 只能放单行——TikZ 用 `\\` 或者 `align=center, text width=…` 表达多行 / 自动换行，retikz 端目前完全做不到。

alpha.2 需要支持多行文本。问题：怎么在 IR 层承载多行？

## 选项

### A. 数组（**推荐**）

```ts
type IRNode = {
  text?: string | Array<string>;
};
```

调用：`<Node text={['Line 1', 'Line 2']}>`。每个数组元素一行。

### B. 字符串内嵌 `\n`

```ts
type IRNode = {
  text?: string;  // '\n' 表示换行
};
```

调用：`<Node text={'Line 1\nLine 2'}>`。compile 层按 `\n` split。

### C. 独立 `lines` 字段

```ts
type IRNode = {
  text?: string;        // 单行用
  lines?: Array<string>; // 多行用，与 text 互斥
};
```

## 决策

选 **A：`text` 字段类型升级为 `string | Array<string>`**。

单行场景仍可写 `text: 'Hello'`（向后兼容）；多行写 `text: ['Line 1', 'Line 2']`。

## 理由

1. **JSON 友好**：数组在 JSON 里直接表达，不需 escape。`\n` 字符串在 JSON 里写成 `"Line 1\\nLine 2"`，AI 生成 / 编辑器粘贴时易出错（双重转义、单 `\n` vs 双 `\\n` 混淆是 LLM 常见 bug）
2. **数据结构显式**：`Array<string>` 直接告诉读者"这是一组行"；`'\n'` 字符串需要看代码才能知道分隔符是什么
3. **SVG `<tspan>` 天然映射**：每个数组元素一个 `<tspan dy>`，渲染逻辑直接对应，不需要在 compile 层做 split
4. **未来扩展空间**：每行未来可能要加属性（per-line align / 颜色），数组是 `Array<string | LineSpec>` 的自然进化路径；`'\n'` 字符串则没法承载行级属性
5. **B 方案"看起来短"是假象**：JSON 里 `["Line 1", "Line 2"]` 比 `"Line 1\\nLine 2"` 更紧凑且结构清晰
6. **C 方案双字段冗余**：`text` / `lines` 互斥意味着每个使用方都要分两条路径处理，没必要

向后兼容性：alpha.1 的 `text: string` 调用都自动落入 A 的"单 string"分支，零破坏。

## 影响

### IR Schema

`packages/core/src/ir/node.ts`：

```ts
export const NodeTextSchema = z
  .union([z.string(), z.array(z.string()).min(1)])
  .describe(
    'Text label rendered inside the node; either a single string (one line) or a non-empty array of strings (one element per line).',
  );

export const NodeSchema = z.object({
  // ...
  text: NodeTextSchema.optional(),
  // ...
});
```

### Compile

`packages/core/src/compile/node.ts`：

- `layoutNode` 把 text 标准化为 `Array<string>`（单 string → `[s]`），保留 `textLines` 字段
- 内部度量逻辑取所有行 `width` 的 max、`height` 的 sum（含 line-height 间距）
- `outerHalfW`/`outerHalfH` 用最终的 textBox 尺寸算（与现有公式不变）

### Scene Primitive

`packages/core/src/primitive/text.ts` 的 `TextPrim` 升级：

```ts
export type TextPrim = {
  type: 'text';
  x: number;
  y: number;
  // ...
  /** 单行可仍传 `content: 'Hello'`；多行传 lines 数组 */
  content?: string;        // @deprecated since alpha.2 — use `lines`
  lines: Array<string>;    // 至少 1 行
  lineHeight?: number;     // user units，默认 = fontSize × 1.2
};
```

或者简化：直接把 `content` 改成 `lines: Array<string>`（最少 1 行），不留兼容字段——alpha 阶段允许这种破坏。

### Renderer

`packages/react/src/render/renderPrim.tsx`：

`<text>` 内为每行画一个 `<tspan x={cx} dy>`：

```tsx
<text x={p.x} y={p.y} fontSize={p.fontSize} ...>
  {p.lines.map((line, i) => (
    <tspan key={i} x={p.x} dy={i === 0 ? 0 : lineHeight}>
      {line}
    </tspan>
  ))}
</text>
```

### React DSL

- `Node.tsx`：`text?: string | Array<string>`；`children` 仍兼容字符串
- `_builder.ts` / `_unbuilder.ts`：透传

## 配套字段

本 ADR 同时为后续这些字段铺路（alpha.2 同 PR 落地，但设计已此处确定）：

- `align?: 'left' | 'center' | 'right'`：多行内文本对齐（默认 center，与 TikZ 行为一致）
- `textWidth?: number`：固定宽度，超出长度的行自动按字符宽度断行（实现可选 alpha.2 / alpha.3）
- `lineHeight?: number`：行间距（user units），未设走 fontSize × 1.2 默认

## 等价性测试

- `text: 'Hello'` 与 `text: ['Hello']` 编译产出相同 TextPrim
- `text: ['Line 1', 'Line 2']` → SVG 输出含两个 `<tspan>`，第二个 `dy ≈ fontSize × 1.2`
- 多行节点的 height 约为 `(lines × fontSize × 1.2) + 2 × padding`
- `Array<string>` 的空数组应被 schema 拒绝（min(1)）

## 待办

- [ ] IR schema 升级 + 类型导出
- [ ] compile/node.ts 度量与 emit 逻辑改 lines 数组
- [ ] primitive/text.ts 字段调整
- [ ] renderPrim `<tspan>` 渲染
- [ ] React DSL props
- [ ] 配套 align / lineHeight 字段（可拆 PR）

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.2（本 ADR） | `text: string \| Array<string>`，配 align / lineHeight |
| v0.1 alpha.3 | textWidth + 自动换行（按字符 measure 后软断行） |
| v0.2+ | `Array<string \| LineSpec>` 支持行级 color / weight 等覆盖 |
