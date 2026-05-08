# ADR-0004：Target 字符串的扩展语法

- 状态：Proposed
- 决策日期：2026-05-08
- 关联：[v0-roadmap §v0.1.0-alpha.1](../plans/v0-roadmap.md) · [tikz-gap-analysis §1 P0](../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

当前 `IRTarget = Position | PolarPosition | string`，其中 string 仅作为 node id 引用——内部走 `boundaryPoint(rect, neighbor)` 自动算朝向。

TikZ 用户要求精确指定锚点：

| TikZ 字面 | 含义 |
|---|---|
| `(A)` | 节点 A，自动朝向 |
| `(A.north)` | 节点 A 的"北"边中点 |
| `(A.north east)` | 右上角 |
| `(A.30)` | 从节点 A 中心向 30° 方向射线与 boundary 的交点 |

本 ADR 决定 IR 字符串如何承载这些扩展。

## 选项

### A. 字符串内部用 `.` 分隔（**推荐**）

```ts
type IRTarget = Position | PolarPosition | string;
// 字符串语法：
// 'A'              → node center / boundaryPoint 自动
// 'A.north'        → 命名 anchor
// 'A.north-east'   → 复合 anchor 名（连字符）
// 'A.30'           → 角度 anchor（数字）
// 'A.-15'          → 负角度
```

### B. IR 用结构化对象

```ts
type NodeRef = { node: string; anchor?: string | number };
type IRTarget = Position | PolarPosition | string | NodeRef;
```

### C. 多前缀字符串

```ts
'A'          → node
'A@north'    → anchor
'A%30'       → angle
```

## 决策

选 **A**：字符串内部 `.` 分隔。

```ts
// schema 仍 union 三态，string 上加正则约束 + describe
const NodeRefStringSchema = z.string().regex(/^[\w][\w-]*(\.[\w-]+|\.-?\d+(\.\d+)?)?$/);
```

解析逻辑独立放 `packages/core/src/compile/parseTarget.ts`：

```ts
type ParsedNodeRef =
  | { kind: 'node'; id: string }
  | { kind: 'anchor'; id: string; anchor: string }     // 命名 anchor
  | { kind: 'angle'; id: string; angle: number };      // 度数

export const parseNodeRef = (s: string): ParsedNodeRef => { ... };
```

## 理由

1. **AI 友好 / TikZ 字面**：`A.north`、`A.30` 与 TikZ 写法字面一致，LLM 训练语料里大量出现，零翻译
2. **JSON 紧凑**：字符串比对象短，AI 生成 / 持久化 / 传输都更紧凑（一个流程图可能有几十个 step.to）
3. **schema 形态不变**：IR 仍是 `string | Position | PolarPosition`，对老 IR 兼容，对 TS 类型友好（不用引入新 union 分支）
4. **`.` 分隔无歧义**：node id 我们约束为 `[\w][\w-]*`（不含 `.`）；anchor 名也不含 `.`；角度是纯数字（含可选小数点 + 负号）。三段语义靠首字符（数字 / 字母）即可区分
5. **B 方案破坏简洁性**：JSON 对象嵌套显著加重 IR；string 三态 union 强 alpha 开发期心智成本最低
6. **C 方案符号陌生**：`@` / `%` 不是 TikZ 字面，AI 友好下降

## 边界与约束

### Node id 命名

- 允许：`[A-Za-z_][\w-]*`（字母/下划线开头，含字母数字下划线连字符）
- **禁止 `.`**（与 anchor 分隔符冲突）
- 禁止以数字开头（与角度区分）

### Anchor 名（alpha.1 首批）

`'center' | 'north' | 'south' | 'east' | 'west' | 'north-east' | 'north-west' | 'south-east' | 'south-west'`

不在 alpha.1 落地的：`'text' | 'base' | 'mid'`（文字基线，等 alpha.2 字体改造）。

不识别的 anchor 名：`parseNodeRef` 抛错，由 compile 层包成 friendly error。

### 角度

- 纯数字（可选小数 / 负号）：`'A.30'` / `'A.-45'` / `'A.180.5'`
- 在 0..360 之外：归一化到 `[0, 360)`（与 polar 角度一致）

### 复合形态

alpha.1 暂不支持的（留后续 ADR）：
- 多 anchor 链：`A.north.east`
- 表达式：`A.north -- B.south`
- 组合 anchor：`A.center -| B.south`

## 影响

### IR

`packages/core/src/ir/path/target.ts` 改 describe + 加正则（不改 union 形态）。

### Compile

`packages/core/src/compile/parseTarget.ts`（新文件）：

```ts
export type ParsedNodeRef =
  | { kind: 'node'; id: string }
  | { kind: 'anchor'; id: string; anchor: RectAnchor }
  | { kind: 'angle'; id: string; angle: number };

export const parseNodeRef = (s: string): ParsedNodeRef => {
  const dot = s.indexOf('.');
  if (dot < 0) return { kind: 'node', id: s };
  const id = s.slice(0, dot);
  const tail = s.slice(dot + 1);
  if (/^-?\d+(\.\d+)?$/.test(tail)) {
    return { kind: 'angle', id, angle: Number(tail) };
  }
  return { kind: 'anchor', id, anchor: tail as RectAnchor };  // 校验留给 layoutLookup
};
```

`packages/core/src/compile/path.ts` 中处理 string target：

```ts
if (typeof target === 'string') {
  const ref = parseNodeRef(target);
  const node = nodeIndex.get(ref.id);
  if (!node) return null;
  switch (ref.kind) {
    case 'node':
      // 现有 boundaryPoint 逻辑
    case 'anchor':
      // 取该 shape 的 anchor()，shape 多态见 ADR-0003
    case 'angle':
      // 从节点中心向角度方向射线 → boundaryPoint of shape
  }
}
```

### React

DSL 不动——`IRTarget` 仍是 string union，`<Step to="A.north" />` 类型自然通过。

## 等价性测试

- `parseNodeRef('A')` → `{ kind: 'node', id: 'A' }`
- `parseNodeRef('A.north')` → `{ kind: 'anchor', id: 'A', anchor: 'north' }`
- `parseNodeRef('A.north-east')` → `{ kind: 'anchor', id: 'A', anchor: 'north-east' }`
- `parseNodeRef('A.30')` → `{ kind: 'angle', id: 'A', angle: 30 }`
- `parseNodeRef('A.-45')` → `{ kind: 'angle', id: 'A', angle: -45 }`
- 编译等价：`'A.center'` → 与节点 center 坐标一致；`'A.north'` 与 `rect.anchor(rect, 'north')` 一致；`'A.0'` 与 `rect.boundaryPoint(rect, [+∞, 0])` 一致

## 待办

- [ ] schema 加正则约束
- [ ] parseTarget.ts 实现
- [ ] compile/path.ts 三种分支处理
- [ ] 多 shape 时 anchor 查找接 ADR-0003 多态
- [ ] 完整解析测试 + 编译等价性测试

## 备选方案 / 演进

| 阶段 | 计划 |
|---|---|
| v0.1 alpha.1（本 ADR） | `id` / `id.anchor` / `id.degree` |
| v0.2+ | anchor 名扩 `text` / `base` / `mid` |
| v0.3+ | 引入 `(A.north)+(0,1)` 等 calc 语法时再开 ADR |
