# ADR-0001：Node font 字段——对象 vs 扁平字段

- 状态：Proposed
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.2](../plans/v0-roadmap.md) · [tikz-gap-analysis §1 P1](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

alpha.1 的 `IRNode` 只有标量 `fontSize: number`——粗体 / 斜体 / 字族全部表达不了。TikZ 端 `\node[font=\bfseries\Large] {...}` 是日常常见组合，alpha.2 必须补齐。

字体相关属性是一组：family / size / weight / style，可能还会扩 line-height、letter-spacing 等。一次决定怎么承载它们。

## 选项

### A. 嵌套对象（**推荐**）

```ts
type IRNode = {
  font?: {
    family?: string;        // 'serif' / 'monospace' / 自定义
    size?: number;          // user units，替代 fontSize 标量
    weight?: 'normal' | 'bold' | number;
    style?: 'normal' | 'italic' | 'oblique';
  };
  // ...
};
```

### B. 扁平字段

```ts
type IRNode = {
  fontFamily?: string;
  fontSize?: number;     // 已有
  fontWeight?: ...;
  fontStyle?: ...;
};
```

### C. 字符串语法（TikZ 风格）

```ts
type IRNode = {
  font?: '\\bfseries\\Large' | string;  // 字符串模板
};
```

## 决策

选 **A：嵌套对象**。`font` 是 IRNode 的一个 sub-object。

`fontSize` 标量字段在 alpha.2 起标记 deprecated，与 `font.size` 共存一个版本（取值优先级 `font.size ?? fontSize`），alpha.3 删除。

## 理由

1. **命名空间聚类**：font 相关属性是一族，对象天然聚合；扁平后 IR schema 顶层散落 4 个 `fontXxx`，把 IR 的"位置 / 形状 / 文本 / 样式"几大块拉得更分散
2. **AI 友好（zod schema）**：嵌套对象的 zod `describe` 可在外层和内层都写 description，LLM 能拿到"font 是什么、它各字段是什么"两层语义；扁平字段必须靠 fieldName 自描述
3. **未来扩展**：`font.lineHeight` / `font.letterSpacing` 等只会越加越多，对象天然不污染 IRNode 顶层
4. **C 方案 LaTeX 控制序列在浏览器无对应**：`\bfseries` 这种命令需要 parser，alpha.2 不做 text DSL；硬塞字符串等于把表达力压到字符串里，反而难解析

唯一缺点：嵌套结构在 SVG 渲染时需要展开成多个 `<text font-family fontSize fontWeight>` 属性。compile 层加一行解构就解决。

## 影响

### IR Schema

`packages/core/src/ir/node.ts`：

```ts
export const FontSpecSchema = z
  .object({
    family: z.string().optional()
      .describe('Font family CSS string, e.g. "serif", "monospace", "Inter, sans-serif"'),
    size: z.number().positive().optional()
      .describe('Font size in user units; replaces top-level `fontSize` (still readable for backward compat in alpha.2)'),
    weight: z.union([z.enum(['normal', 'bold']), z.number()]).optional()
      .describe('CSS font-weight: keyword `normal` / `bold` or numeric 100..900'),
    style: z.enum(['normal', 'italic', 'oblique']).optional()
      .describe('CSS font-style'),
  })
  .describe('Font properties for the node text label; all fields optional.');

export const NodeSchema = z.object({
  // ...
  font: FontSpecSchema.optional()
    .describe('Font spec for the inner text; preferred over the deprecated `fontSize` scalar.'),
  fontSize: z.number().optional()
    .describe('@deprecated since v0.1.0-alpha.2 — use `font.size`. Will be removed in alpha.3.'),
  // ...
});
```

派生类型 `IRNode['font']` 即可被外部 import。

### Compile

`packages/core/src/compile/node.ts`：

- `layoutNode` 读取 effective font：`size = node.font?.size ?? node.fontSize ?? DEFAULT_FONT_SIZE`
- text emit 把 family / weight / style 透传到 TextPrim（已有 `fontFamily` / `fontWeight` / `fontStyle` 字段，alpha.0 起就预留）

### React DSL

`packages/react/src/kernel/Node.tsx`：

```tsx
type NodeProps = {
  font?: IRNode['font'];
  /** @deprecated 用 `font.size` */
  fontSize?: number;
};
```

`_builder.ts` / `_unbuilder.ts`：透传整个 `font` 对象。

## 等价性测试

- `<Node fontSize={14}>` 与 `<Node font={{ size: 14 }}>` 编译产出相同 TextPrim
- 同时设 `font.size: 12` 与 `fontSize: 14` → 用 12（font.size 优先）
- 显式 `font.weight: 'bold'` → SVG `<text font-weight="bold">`

## 待办

- [ ] FontSpecSchema 落地
- [ ] layoutNode + emitNode text 透传
- [ ] React Node props + builder/unbuilder
- [ ] alpha.2 changelog 注明 fontSize deprecate 时间表

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.2（本 ADR） | font 对象引入，fontSize 共存 |
| v0.1 alpha.3 | fontSize 移除 |
| v0.2+ | font.lineHeight / letterSpacing 按需加（不破 schema） |
| v0.3+ | text DSL 介入时考虑 `font: '\\bfseries\\Large'` 字符串映射 |
