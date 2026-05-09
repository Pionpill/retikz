# ADR-0004：边标注（Step.label）的归位

- 状态：Proposed
- 决策日期：2026-05-09
- 关联：[v0-roadmap §v0.1.0-alpha.3](../plans/v0-roadmap.md) · [tikz-gap-analysis §2 P1](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

TikZ 在 path 边上挂文字标注是流程图、UML、状态机的高频需求：

```latex
\draw (a) -- node[midway, above] {accept} (b);
\draw (q0) edge[bend left] node[sloped, above] {0/1} (q1);
```

`node[midway, above]` 这一坨语法挂在 path 内部、贴住前一个 step 段：

- `midway` / `near start` / `near end`：标注在该段的几何位置
- `above` / `below` / `left` / `right` / `sloped`：标注与段方向的相对位置

retikz alpha.1 的 IR 完全没有这能力——一条 path 只能光秃秃画线，画完后用户得手动算坐标再独立加 `<Node>`，体验差。

## 选项

### A. 嵌入 Step 字段（**推荐**）

```ts
type IRStep = {
  // ...既有字段
  label?: {
    text: string;
    position?: 'midway' | 'near-start' | 'near-end';  // 缺省 midway
    side?: 'above' | 'below' | 'left' | 'right' | 'sloped';  // 缺省 above
  };
};
```

sugar 层提供 `<EdgeLabel>` 组件，作为 Step 的 prop / child 翻译到 IR `step.label`。

### B. 单独 sugar child（IR 不感知）

```tsx
<Path>
  <Step to="A" />
  <Step to="B">
    <EdgeLabel position="midway" side="above">accept</EdgeLabel>
  </Step>
</Path>
```

IR 层把 EdgeLabel 编译成独立的 IRTextNode，不留在 path step 里。

### C. Path-level label 数组（不嵌入 step）

```ts
type IRPath = {
  steps: Array<IRStep>;
  labels?: Array<{
    onSegment: number;  // step 索引
    text: string;
    position?: ...;
    side?: ...;
  }>;
};
```

## 决策

选 **A：IR 嵌入 `Step.label`**；sugar 层提供 `<EdgeLabel>` 组件，编译到对应 step.label。

## 理由

1. **绑定关系明确**：标签贴的是哪一段 step？A 方案在结构上就回答了——`step.label` 就是这一段的。B / C 方案需要额外的"index 引用"或"位置匹配"机制，多一层间接
2. **TikZ 语义直接对齐**：`(a) -- node[midway, above] {x} (b)` 里 `node[...]` 是 `--` 这一段的修饰符，IR 嵌入 step 跟 TikZ AST 1:1
3. **C 方案的 onSegment 索引脆弱**：用户在 path 中插入 / 删除 step 时，labels 数组的 onSegment 不会自动更新，运行时静默错位。绑定关系应跟着结构走
4. **B 方案让 IR 编译期"找前驱 step"**：要决定 EdgeLabel 标注到哪段 step，sugar builder 需要看 `<EdgeLabel>` 的兄弟前序节点——这把 IR 转换从"局部 build"推到"上下文敏感 build"，复杂度上升
5. **sugar 层仍然用户友好**：A 决策的 IR 是嵌入式，但 sugar 可以同时支持两种写法：
   - prop 写法：`<Step to="B" label="accept" />`
   - child 写法：`<Step to="B"><EdgeLabel side="above">accept</EdgeLabel></Step>`
   两者都翻译到同一个 IR `step.label`，与本 ADR 兼容
6. **AI 友好**：LLM 写 path 时 `step.label` 直接挂在 step 上，不用学"路径上有几个标签、各贴哪段"的额外规则
7. **字段膨胀可控**：`label` 是单个可选 sub-object，对 step union 各 kind 透明（line / curve / cubic / arc 都可挂），不会污染特定 kind 的 schema

## 影响

### IR Schema

`packages/core/src/ir/path/step.ts`：所有 step kind（除 `move` / `cycle` 外）共享 `label?: LabelSchema`。

```ts
export const StepLabelSchema = z.object({
  text: z.string()
    .describe('Label text content. Single-line; for multi-line use \\n.'),
  position: z.enum(['midway', 'near-start', 'near-end']).optional()
    .describe('Position along the step segment. Default `midway`.'),
  side: z.enum(['above', 'below', 'left', 'right', 'sloped']).optional()
    .describe('Side relative to segment direction. `sloped` rotates label along tangent. Default `above`.'),
});
```

`move` / `cycle` 不挂 label——move 不画线、cycle 是闭合标记，挂标签语义不清。schema 用 `z.discriminatedUnion('kind', ...)`，仅在画线 kind 上加 label 字段。

### Compile

`packages/core/src/compile/path.ts`：

- 编译每条 step 时按 `position` 算几何点：
  - `midway`：段中点（直线段）/ 参数 `t = 0.5`（曲线段贝塞尔参数）
  - `near-start`：`t = 0.25`
  - `near-end`：`t = 0.75`
- 按 `side` 算偏移：
  - `above` / `below` / `left` / `right`：沿段法向偏移固定 padding
  - `sloped`：旋转角等于段切线方向，标签贴段
- emit 一个 TextPrim（与 Node 内的 text 复用同一渲染管线）

### React DSL

`packages/react/src/`：

- Step 组件加 `label` prop（直接传对象）
- sugar 加 `<EdgeLabel>` 组件，作为 Step 的 child；Step builder 检测 children 中是否有 EdgeLabel，提取到 `step.label`
- 两种写法等价

### 测试

- core：每种 (position × side) 组合在 line / curve / cubic / arc 上的几何坐标
- core：sloped 在曲线段上的切线方向计算（参数 t 处的导数向量）
- core：cycle path 上 label 的合理性（cycle step 不允许 label，应在 IR schema 阶段拒绝）
- react：sugar `<EdgeLabel>` child 与 prop `label={...}` 的等价性

## 等价性测试

- IR ↔ JSON：`step.label` 序列化无损
- builder ↔ unbuilder：JSX `<Step><EdgeLabel>x</EdgeLabel></Step>` ↔ IR `{ kind: 'line', ..., label: { text: 'x' } }` 双向
- 渲染：sloped 模式下 label 的 `transform="rotate(...)"` 角度对齐段切线
