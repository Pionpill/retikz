# ADR-0003：padding / margin 是否迁移到 innerXSep / innerYSep / outerSep

- 状态：Proposed
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.2](../plans/v0-roadmap.md) · [tikz-gap-analysis §1 P2](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

alpha.1 的 `IRNode` 用对称的：

- `padding: number` —— 文本到 border 的内边距（X / Y 同值）
- `margin: number` —— border 到 path 附着点的外边距（X / Y 同值）

TikZ 原生支持分轴：

- `inner xsep` / `inner ysep`（X / Y 各设一个内边距）
- `inner sep`（同时设 X / Y，相当于 retikz 的 `padding`）
- `outer sep`（外边距，相当于 retikz 的 `margin`）

要不要迁移命名 + 是否分轴？

## 选项

### A. 完全迁移到分轴 + 老字段移除

```ts
type IRNode = {
  innerXSep?: number;
  innerYSep?: number;
  outerSep?: number;
  // padding / margin 直接删
};
```

### B. 引入分轴字段 + 保留 padding/margin 作 alias（**推荐**）

```ts
type IRNode = {
  innerXSep?: number;
  innerYSep?: number;
  outerSep?: number;
  /** alias for inner X+Y sep；写 padding 等价于 innerXSep=padding & innerYSep=padding */
  padding?: number;
  /** alias for outerSep */
  margin?: number;
};
```

读取顺序：`effectiveX = innerXSep ?? padding ?? DEFAULT`，`effectiveY = innerYSep ?? padding ?? DEFAULT`，`effectiveOuter = outerSep ?? margin ?? 0`。

### C. 三套字段全保留共存（不推荐）

无优先级规则，混用时行为不定。

## 决策

选 **B：分轴字段为新增首选，padding / margin 保留为别名**。

## 理由

1. **alpha.1 用户零破坏**：所有 `<Node padding={8} margin={4}>` 用法继续工作
2. **90% 场景不需分轴**：节点的内 / 外边距同值是默认期望，padding / margin 写起来比 `innerXSep={8} innerYSep={8}` 短得多
3. **分轴是逃生口**：少数需要 X / Y 不同的场景（横长节点放短文本、强制控制纵向间距等），用 innerXSep/innerYSep 单独设
4. **TikZ 命名一致**：`inner xsep` / `inner ysep` / `outer sep` 是 TikZ 原词，AI 训练语料里大量出现，写入 IR schema 让 LLM 输出更自然
5. **A 方案破坏性大**：alpha.1 已发到 npm，任何用户的 `<Node padding>` 都得改——alpha 期允许破坏但没必要在简单 alias 上付这个代价

## 影响

### IR Schema

`packages/core/src/ir/node.ts`：

```ts
export const NodeSchema = z.object({
  // ...
  innerXSep: z.number().nonnegative().optional()
    .describe('Inner horizontal padding from text to border in user units. Falls back to `padding` then default.'),
  innerYSep: z.number().nonnegative().optional()
    .describe('Inner vertical padding from text to border in user units. Falls back to `padding` then default.'),
  outerSep: z.number().nonnegative().optional()
    .describe('Outer margin from border to path attachment point in user units; does NOT change the visible border. Falls back to `margin`.'),
  padding: z.number().nonnegative().optional()
    .describe('Symmetric inner padding (alias for `innerXSep` + `innerYSep`); axis-specific fields take precedence.'),
  margin: z.number().nonnegative().optional()
    .describe('Symmetric outer margin (alias for `outerSep`); axis-specific field takes precedence.'),
  // ...
});
```

### Compile

`packages/core/src/compile/node.ts` `layoutNode`：

```ts
const xSep = node.innerXSep ?? node.padding ?? DEFAULT_PADDING;
const ySep = node.innerYSep ?? node.padding ?? DEFAULT_PADDING;
const outer = node.outerSep ?? node.margin ?? 0;

const innerHalfW = Math.max(textHalfW + xSep, xSep);
const innerHalfH = Math.max(textHalfH + ySep, ySep);
// shape 外接公式仍按 innerHalfW / innerHalfH 计算（ADR-0003 alpha.1 不变）
```

`NodeLayout.margin` 字段同步改名 `outerSep`（或保留 `margin`，对外暴露的字段名是 IR 层概念，layout 层是内部不一定要改名，但建议改名以保持统一）。

### React DSL

```tsx
type NodeProps = {
  innerXSep?: number;
  innerYSep?: number;
  outerSep?: number;
  /** @alias innerXSep + innerYSep */
  padding?: number;
  /** @alias outerSep */
  margin?: number;
};
```

`_builder` / `_unbuilder` 全字段透传。

## 等价性测试

- `<Node padding={8}>` ≡ `<Node innerXSep={8} innerYSep={8}>`
- `<Node margin={4}>` ≡ `<Node outerSep={4}>`
- `<Node padding={8} innerXSep={12}>` → X 用 12，Y 用 8（轴特化覆盖 alias）
- 同时设 `outerSep={4}` + `margin={2}` → 用 4

## 文档侧

`apps/docs/src/contents/core/components/node/`：

- 现有 "padding / margin" 章节升级为 "inner sep / outer sep"
- API 表加 `innerXSep` / `innerYSep` / `outerSep` 行
- `padding` / `margin` 行打 alias 标记
- 加分轴 demo（如长方形 button-like 节点：`innerXSep={16} innerYSep={4}`）

## 待办

- [ ] schema 加 3 个新字段
- [ ] layoutNode 优先级解析逻辑
- [ ] React DSL props + builder/unbuilder
- [ ] 文档章节升级 + 分轴 demo

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.2（本 ADR） | 引入 inner X / Y sep + outerSep；padding / margin alias 保留 |
| v0.2+ | 评估是否给 padding / margin 加 deprecation 警告（控制台 warn 一次） |
| v0.3+ | 不计划移除 padding / margin（TikZ 也保留 `inner sep` 同义短写） |
