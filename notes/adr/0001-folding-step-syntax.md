# ADR-0001：折角 step 的 IR 语法

- 状态：Proposed
- 决策日期：2026-05-08
- 关联：[v0-roadmap §v0.1.0-alpha.1](../plans/v0-roadmap.md) · [tikz-gap-analysis §2 P0](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

TikZ 的"折角"是流程图刚需：从 A 走到 B 时强制中点拐一次直角。两种走向：

| TikZ 字面 | 含义 |
|---|---|
| `(A) -\| (B)` | 先水平到 B.x，再垂直到 B |
| `(A) \|- (B)` | 先垂直到 B.y，再水平到 B |

retikz 当前 `IRStep` 仅 `move` / `line`，没有折角表达。本 ADR 决定折角的 IR 形态。

## 选项

### A. 单 step + via 字段（**推荐**）

```ts
{ type: 'step', kind: 'step', via: '-|' | '|-', to: IRTarget }
```

`kind: 'step'` 与 TikZ 习惯术语对齐（TikZ 路径的 "step" 操作就是折角）。`via` 字面照搬 TikZ 写法。

### B. 两个独立 kind

```ts
{ type: 'step', kind: 'hvline', to: IRTarget }  // 先水平后垂直
{ type: 'step', kind: 'vhline', to: IRTarget }  // 先垂直后水平
```

### C. 把折角拆成两个 line step

不在 IR 层提供概念，让用户/Sugar 显式拆 `line → 中点 → line`。

## 决策

选 **A**：`kind: 'step'` + `via: '-|' | '|-'`。

## 理由

1. **AI 友好**：LLM 训练语料里 TikZ 写法海量，`-|` / `|-` 是它们见过的字面；JSON 字符串里直接放这些字面零翻译成本
2. **一对一映射 TikZ**：retikz 的核心定位是"浏览器原生 TikZ 子集"，IR 越贴近 TikZ 字面越好
3. **扩展空间**：将来要加"圆角折角"（`bend at corner`）只需在 `via` 加新字面（`'-|~'` 之类），不污染 kind 枚举
4. **避免 kind 爆炸**：B 方案把方向编进 kind，未来 `step` 家族还可能有 `'step-rounded'` / `'step-double'`，会撑爆 `kind` 枚举；via 把"什么类型的折角"和"具体走向"解耦
5. **C 方案破坏 IR 抽象**：折角本身是一个语义动作（"go via L-shape"），拆两段 line 就丢失这个意图，影响后续 codec（IR → TikZ 文本）的还原能力

## 影响

### Schema 改动

`packages/core/src/ir/path/step.ts`：

```ts
export const FoldStepSchema = z.object({
  type: z.literal('step'),
  kind: z.literal('step'),     // 与 TikZ 文档术语 step 一致；schema 名取 Fold 避免重复
  via: z.enum(['-|', '|-']),
  to: TargetSchema,
});

export type IRFoldStep = z.infer<typeof FoldStepSchema>;

// 并入 StepSchema = discriminatedUnion('kind', [Move, Line, Fold])
```

### Compile 改动

`packages/core/src/compile/path.ts` 的 `emitPathPrimitive`：

- step 端点解析与 line 一致
- 写 d 字符串时，遇到 `kind: 'step'`：在 prev 与 curr 之间插一个中间点
  - `via: '-|'`：中间点 `[curr.x, prev.y]`（先水平）
  - `via: '|-'`：中间点 `[prev.x, curr.y]`（先垂直）
- 中间点也要并入 `points` 累积，确保 viewBox 计算覆盖折角

### React 改动

- `packages/react/src/kernel/Step.tsx`：`StepProps` discriminated union 加 `{ kind: 'step', via, to }`
- `_builder.ts` `readPathChildren`：透传 `via` 字段
- `_unbuilder.ts` `stepToElement`：透传 `via`

## 等价性测试

```ts
// 折角 -| 等价于人工拆两段 line
const folded: IRPath = {
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'step', via: '-|', to: [10, 5] },
  ],
};

const manual: IRPath = {
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [0, 0] },
    { type: 'step', kind: 'line', to: [10, 0] },  // 先水平
    { type: 'step', kind: 'line', to: [10, 5] },  // 再垂直
  ],
};

// emitPathPrimitive(folded).primitive.d === emitPathPrimitive(manual).primitive.d
```

## 备选方案

若团队认为 `via` 字面值含 `|` 在某些工具链下不友好（YAML / shell），可在 v0.2+ 出 ADR 加同义别名（`via: 'horizontal-first' | 'vertical-first'`），双向兼容。

## 待办

- [ ] 实现 schema 改动（task #7）
- [ ] 实现 compile / React 透传（task #7）
- [ ] 等价性测试落地
