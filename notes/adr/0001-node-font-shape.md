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

**alpha.2 直接删除 `fontSize` 标量字段**——alpha 阶段允许破坏，不留 deprecate 共存窗口；老用法 `<Node fontSize={14}>` 改写为 `<Node font={{ size: 14 }}>`。

## 理由

1. **命名空间聚类**：font 相关属性是一族，对象天然聚合；扁平后 IR schema 顶层散落 4 个 `fontXxx`，把 IR 的"位置 / 形状 / 文本 / 样式"几大块拉得更分散
2. **AI 友好（zod schema）**：嵌套对象的 zod `describe` 可在外层和内层都写 description，LLM 能拿到"font 是什么、它各字段是什么"两层语义；扁平字段必须靠 fieldName 自描述
3. **未来扩展**：`font.lineHeight` / `font.letterSpacing` 等只会越加越多，对象天然不污染 IRNode 顶层
4. **C 方案 LaTeX 控制序列在浏览器无对应**：`\bfseries` 这种命令需要 parser，alpha.2 不做 text DSL；硬塞字符串等于把表达力压到字符串里，反而难解析
5. **不留 deprecate 窗口**：alpha 阶段用户量极少（首发 alpha.1 刚发布），共存一个版本只增加 compile 层 fallback 分支与文档说明负担，没有真正受益方；一刀切干净

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
      .describe('Font size in user units.'),
    weight: z.union([z.enum(['normal', 'bold']), z.number()]).optional()
      .describe('CSS font-weight: keyword `normal` / `bold` or numeric 100..900'),
    style: z.enum(['normal', 'italic', 'oblique']).optional()
      .describe('CSS font-style'),
  })
  .describe('Font properties for the node text label; all fields optional.');

export const NodeSchema = z.object({
  // ...
  font: FontSpecSchema.optional()
    .describe('Font spec for the inner text label.'),
  // fontSize: 字段移除（alpha.2 起改用 font.size）
  // ...
});
```

派生类型 `IRNode['font']` 即可被外部 import。

### Compile

`packages/core/src/compile/node.ts`：

- `layoutNode` 读取 effective font：`size = node.font?.size ?? DEFAULT_FONT_SIZE`
- text emit 把 family / weight / style 透传到 TextPrim（已有 `fontFamily` / `fontWeight` / `fontStyle` 字段，alpha.0 起就预留）

### React DSL

`packages/react/src/kernel/Node.tsx`：

```tsx
type NodeProps = {
  font?: IRNode['font'];
  // fontSize prop 移除
};
```

`_builder.ts` / `_unbuilder.ts`：透传整个 `font` 对象。

### 站点示例 / 文档

- 所有现存 demo / 文档里 `<Node fontSize={...}>` 改写为 `<Node font={{ size: ... }}>`
- alpha.2 changelog 注明 BREAKING：`fontSize` → `font.size`

## 等价性测试

- `<Node font={{ size: 14 }}>` 编译产出 TextPrim 的 `fontSize === 14`
- 显式 `font.weight: 'bold'` → SVG `<text font-weight="bold">`
- 显式 `font.style: 'italic'` → SVG `<text font-style="italic">`
- 显式 `font.family: 'serif'` → SVG `<text font-family="serif">`
- 未设 font → 走 DEFAULT_FONT_SIZE 等默认值

## 待办

- [ ] FontSpecSchema 落地，删除 NodeSchema 上的 fontSize 字段
- [ ] layoutNode 读取改 `node.font?.size ?? DEFAULT`
- [ ] React Node props 删 fontSize、加 font；builder/unbuilder 透传
- [ ] 全仓 demo / mdx / 测试中 `fontSize={...}` 改写为 `font={{ size: ... }}`
- [ ] alpha.2 changelog 注明 BREAKING

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.2（本 ADR） | font 对象引入，fontSize 标量直接删 |
| v0.2+ | font.lineHeight / letterSpacing 按需加（不破 schema） |
| v0.3+ | text DSL 介入时考虑 `font: '\\bfseries\\Large'` 字符串映射 |
