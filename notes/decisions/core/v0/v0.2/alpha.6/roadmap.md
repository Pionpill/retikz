# v0.2.0-alpha.6 实施待办：结构化 Target / Anchor + `<TikZ>` → `<Layout>` 命名整理

> 写于 2026-05-23。v0.2 第六段（末段）。两件事同窗口收尾：**主任务**把 path target 从字符串形态（`'A'` / `'A.north'` / `'A.30'`）升级为对象 IR（`{ id, anchor?, offset? }`）、core schema / compile / 错误诊断以对象字段为准；**并入项**把 React 顶层容器 `<TikZ>` 改名 `<Layout>`（`<TikZ>` 保留 deprecated alias）。两者同属"DSL 表达力整理"主题，AST 白名单 + system prompt 一次同步。
>
> 关联：[`v0.2 总计划 §alpha.6 设计预想`](../roadmap.md) · [`roadmap §结构化 Target / Anchor 提案`](./roadmap.md) · [`roadmap §<TikZ> → <Layout> 命名提案`](./roadmap.md) · [`v0.2-alpha.5.md`](../alpha.5/roadmap.md)（前一段，sugar 透传形态的 target 直接受益于本段对象化）

## 背景

### 主任务：结构化 Target / Anchor

path target 现状是 6 分支 union（`packages/core/src/ir/path/target.ts:24-35`）：

```ts
// 现状
export const TargetSchema = z.union([
  PositionSchema,                  // [x, y] 笛卡尔
  PolarPositionSchema,             // { origin?, angle, radius }
  z.string().min(1),               // 节点 id：'A' / 'A.north' / 'A.30'
  RelativeTargetSchema,            // { relative: [dx, dy] }
  RelativeAccumulateTargetSchema,  // { relativeAccumulate: [dx, dy] }
  OffsetPositionSchema,            // { of, offset: [dx, dy] }
]);
```

痛点：节点引用的 anchor 语义全藏在字符串里——schema 只看到 `string`，无法约束 anchor 枚举 / 角度 / 边上比例点 / offset；`.` 分隔符把"节点 id 不能含点"这种解析细节暴露给用户；LLM 生成时只能盲拼字符串，错了只能报"字符串解析失败"而非结构化诊断。

解析逻辑现在分两处：
- `packages/core/src/compile/parseTarget.ts:24-38` `parseNodeRef(s)` —— 编译期把 `'A.north'` 拆成三态 `{ kind:'node'|'anchor'|'angle', ... }`
- `packages/core/src/parsers/parseTargetSugar.ts:10-21` `parseTargetSugar(input)` —— react / Draw 端只解析 `'+dx,dy'` / `'++dx,dy'` 相对偏移，节点 id 字符串原样透传给 core

消费方：`packages/core/src/compile/path/anchor.ts` 的 `refPointOfTarget`（17-42）/ `clipForTarget`（58-84）逐 step 调 `parseNodeRef` + `resolveAnchor` / `boundaryPointOf`。

### 并入项：`<TikZ>` → `<Layout>` 命名整理

`<TikZ>`（`packages/react/src/kernel/TikZ.tsx:110`）是 React 顶层渲染容器，**没有 displayName**（不是 kernel marker，builder 不靠它识别），职责是"收集 DSL/IR → 编译布局 → 交给当前 renderer 输出 SVG"。`Layout` 更贴近这个抽象，不把用户理解锁死在 SVG / LaTeX TikZ 语境。

改动面（探查实测）：
- react：`TikZ.tsx` 组件 + `TikZProps` 类型 + `kernel/index.ts` / `src/index.ts` 导出
- docs demo.tsx：**171 个文件 / 175 处** `<TikZ>`（100% 的 demo 都用）
- docs mdx 内联：**66 处** `<TikZ>`
- docs AST 白名单：`apps/docs/src/lib/jsx-to-ir/parser.ts:33-51` `COMPONENT_REGISTRY`（现 17 个，含 TikZ）
- docs system prompt：`apps/docs/src/layout/ai-chat/context.ts` 中英双语组件列举（30-31 / 136-138）+ IR `to` 字段速查（65-67 / 171-173）

## 为什么排在最后 / 为什么并入

- **依赖 alpha.3 的 anchor 接口**（接口先后，非排期紧邻）：结构化 anchor 的解释面与 `ShapeDefinition.anchor(rect, name)`（`packages/core/src/shapes/types.ts`）同源。alpha.3 已固化 anchor 接口（命名 anchor 走各 shape `anchor`、数字角度走通用 `angleBoundaryOf`），alpha.6 把 path target 升级为对象 IR 时直接消费这套入口，不出现"内置 4 shape anchor 走旧路径、注册 shape anchor 走新路径"的双轨。
- **`{ side, t }` 是本段引入的新几何能力**：现仓库零实现（`AnchorRef` 草案在 roadmap，代码里不存在）。它要求 anchor 解释面从"字符串名"扩到"结构化键"，正好趁对象化一并落地。
- **并入而非单列改名段**：改名机械、低风险、与 IR/compile/emit/sugar 工作面零交叉；与结构化 Target/Anchor 同属"DSL 整理"主题，AST 白名单 + system prompt 两处**两件事都要改**，并入后一次同步，不必分两段各刷一遍。

---

## 第一部分：结构化 Target / Anchor

### IR 改动清单

| 改动 | 文件 | 形态 |
| --- | --- | --- |
| 新增 `AnchorRefSchema` | `ir/path/target.ts`（或新 `ir/path/anchor.ts`） | 命名 anchor（复用 `RECT_ANCHORS` 9 名）∪ 数字角度 ∪ `{ side, t }` 边上比例点 |
| 新增 `NodeTargetSchema` | `ir/path/target.ts` | `{ id, anchor?, offset? }` —— 对象主契约 |
| `TargetSchema` union 改对象唯一 | `ir/path/target.ts` | union 加 `NodeTargetSchema`，**删 `z.string().min(1)` 分支**（决策 2） |
| `parseNodeRef` → `parseNodeTarget` 并搬层 | 新 `parsers/parseNodeTarget.ts`（删 `compile/parseTarget.ts`） | 返回 `NodeTarget` 对象（单一真源，仅 React DSL 层消费） |
| `ShapeDefinition` 加 `edgePoint?` | `shapes/types.ts` | 可选方法解释 `{ side, t }`；内置 4 shape 必实现 |
| anchor-cache 加 `resolveEdgePoint` | `compile/anchor-cache.ts` | `{ side, t }` 结果缓存（key = `${side}:${t}`） |
| `{ side, t }` 真实边界几何 | 新 `geometry/_edge.ts`（`EDGE_ENDS`）+ `geometry/{rect,circle,ellipse,diamond}.ts` | rect 直边 / circle·ellipse 周长弧段 / diamond 斜边（带 rotate / local→world） |

### `AnchorRef` / `NodeTarget` schema

```ts
// 新增（草案，ADR 阶段固化命名）
import { RECT_ANCHORS } from '../../geometry/rect';

/** 命名 anchor 的 9 个枚举值（复用 geometry/rect.ts，避免两套常量） */
const NAMED_ANCHORS = Object.values(RECT_ANCHORS) as [string, ...string[]];

export const AnchorRefSchema = z
  .union([
    z.enum(NAMED_ANCHORS),                 // 'center' / 'north' / ... / 'south-west'
    z.number().finite(),                    // 角度 anchor（同 PolarPosition 度数约定；禁 NaN/Infinity）
    z.object({
      side: z.enum(['north', 'south', 'east', 'west']),
      // 边上比例点：t=0/1 端点见 EDGE_ENDS（north/south = 西→东，east/west = 北→南）
      t: z.number().min(0).max(1),         // min/max 已隐式拒 NaN/Infinity
    }),
  ])
  .describe('Anchor reference: named anchor, angle in degrees, or proportional point { side, t } on the real shape boundary');

export const NodeTargetSchema = z
  .object({
    id: z.string().min(1),
    anchor: AnchorRefSchema.optional(),       // 缺省 = 自动贴边界（同旧 'A' shorthand）
    // 世界系平移，在 anchor / 边点解析后叠加；不随节点 rotate 旋转（见决策 3）
    offset: z.tuple([z.number().finite(), z.number().finite()]).optional(),
  })
  .describe('Reference to a Node/Coordinate by id, with optional anchor and world-space 2D offset');

export type IRAnchorRef = z.infer<typeof AnchorRefSchema>;
export type IRNodeTarget = z.infer<typeof NodeTargetSchema>;
```

`TargetSchema` union 升级——**去除 `z.string()` 分支，core 端只接受对象**（字符串 shorthand 由 react / parsers eager 转对象，core ir / compile 永远拿对象；见决策 2）：

```ts
// 改后（节点引用对象唯一契约；无字符串分支）
export const TargetSchema = z
  .union([
    PositionSchema,
    PolarPositionSchema,
    NodeTargetSchema,                // 节点 / Coordinate 引用：唯一契约（不再有字符串形态）
    RelativeTargetSchema,
    RelativeAccumulateTargetSchema,
    OffsetPositionSchema,
  ])
  .describe('Path endpoint: Cartesian [x, y], polar, node target object { id, anchor?, offset? }, relative offset, or offset position');
```

> union 内 `NodeTargetSchema`（key `id`）与 `OffsetPositionSchema`（key `of`）/ `RelativeTargetSchema`（key `relative`）无 key 冲突，zod 判别无歧义。`arc` step 的 `center?`、`rectangle` step 的 `from`/`to`（`ir/path/step.ts:208,277-278`）共用 `TargetSchema`，**自动获得对象形态**，无需逐 step 改。
>
> **破坏性**：去掉字符串分支后，直接手写字符串 target 的 core 测试 / fixture 需迁移成对象（react JSX 不受影响——eager 解析在前）。pre-rc 允许破坏（v0.2.md §与 v0.1 衔接）。

### `parseNodeRef` → `parsers/parseNodeTarget`（单一真源，移出 compile 层）

字符串 shorthand 仍要解析成对象，**但只解析在一个地方**。现 `parseNodeRef` 在 `compile/parseTarget.ts`——若让 react adapter 复用它，会形成 parser / adapter 层反向依赖 compile 层。改为**搬到 parser 入口** `packages/core/src/parsers/parseNodeTarget.ts`（与 `parseTargetSugar` 同层），compile 不再消费字符串（core 已对象唯一），唯一消费方是 react adapter（`parseTargetSugar` / `Draw`）：

```ts
// packages/core/src/parsers/parseNodeTarget.ts（新文件，从 compile/parseTarget.ts 搬迁 + 改返回类型）
import { RECT_ANCHORS, type RectAnchor } from '../geometry/rect';
import type { IRNodeTarget } from '../ir';

const ANCHOR_NAMES = new Set<string>(Object.values(RECT_ANCHORS));
const ANGLE_RE = /^-?\d+(\.\d+)?$/;

/**
 * 字符串 shorthand → NodeTarget 对象（单一真源）
 * @description 'A' → { id:'A' }；'A.north' → { id:'A', anchor:'north' }；'A.30' → { id:'A', anchor:30 }。
 *   字符串 shorthand **不支持** { side, t }（结构化新能力仅对象形态可表达，刻意保持 shorthand 简单）。
 *   不命中 ANCHOR_NAMES 抛错，避免静默吞拼写错误。
 */
export const parseNodeTarget = (s: string): IRNodeTarget => {
  const dot = s.indexOf('.');
  if (dot < 0) return { id: s };
  const id = s.slice(0, dot);
  const tail = s.slice(dot + 1);
  if (ANGLE_RE.test(tail)) return { id, anchor: Number(tail) };
  if (!ANCHOR_NAMES.has(tail)) {
    throw new Error(`parseNodeTarget: unknown anchor '${tail}' in '${s}' (supports: ${[...ANCHOR_NAMES].join(', ')})`);
  }
  return { id, anchor: tail as RectAnchor };
};
```

> 旧 `compile/parseTarget.ts`（`parseNodeRef` + `ParsedNodeRef`）整体删除——其原消费方 `compile/path/anchor.ts` 改为对象唯一（见下游改动），不再解析字符串。

### compile 端消费对象（core 对象唯一）

`refPointOfTarget` / `clipForTarget`（`compile/path/anchor.ts`）改为**对象唯一**——core schema 已无字符串分支，编译期不再 `parseNodeRef`：

```ts
// compile/path/anchor.ts 改后（核心结构，clipForTarget 同构）
export const refPointOfTarget = (target, nameStack, scopeChain = []) => {
  // 对象 NodeTarget：{ id, anchor?, offset? }
  if (isNodeTarget(target)) {
    const node = nameStack.lookup(target.id);
    if (!node) return null;
    const a = target.anchor;
    const base =
      a === undefined        ? [node.rect.x, node.rect.y] :        // 自动 → 中心（refPoint 用）
      typeof a === 'number'  ? resolveAnchor(node, String(a)) :     // 角度
      typeof a === 'string'  ? resolveAnchor(node, a) :             // 命名
                               resolveEdgePoint(node, a.side, a.t); // { side, t } 边上比例点
    return target.offset ? [base[0] + target.offset[0], base[1] + target.offset[1]] : base;
  }

  // relative/relativeAccumulate 防御性守卫（已被 normalizeRelativeTargets 预解析）
  if (isRelative(target)) return null;
  const local = resolvePosition(target, nameStack, undefined, scopeChain);
  if (!local) return null;
  return scopeChain.length === 0 ? local : applyTransformChain(local, scopeChain);
};
```

`clipForTarget` 唯一差异：`anchor === undefined` 时走 `boundaryPointOf(node, toward)`（自动贴边界），其余分支同 `refPointOfTarget`。`offset` 在两函数都**最后叠加**（anchor / boundary 求出后再平移，世界系）。

新增类型守卫（`compile/path/anchor.ts` 内部 helper）：

```ts
const isNodeTarget = (t: IRTarget): t is IRNodeTarget =>
  typeof t === 'object' && t !== null && !Array.isArray(t) && 'id' in t;
const isRelative = (t: IRTarget): boolean =>
  typeof t === 'object' && t !== null && !Array.isArray(t) && ('relative' in t || 'relativeAccumulate' in t);
```

### `{ side, t }` 边上比例点几何（新能力）

`{ side, t }` 在仓库零实现，是本段唯一**新增几何能力**。落地三处：

**决策 1（review 确认）**：`{ side, t }` 表示**真实 shape 边界**上的点，不是外接矩形边。

| shape | side 的"边" | t=0 → t=1 方向 |
| --- | --- | --- |
| rectangle | 矩形四条直边 | north/south：西→东；east/west：北→南 |
| circle / ellipse | 该侧可见**周长弧段**参数化（非外接矩形边） | 同上（沿弧段，端点为相邻象限分界） |
| diamond | 菱形四条可见斜边 | 同上（沿斜边） |
| 自定义 shape | **不强制**——`edgePoint?` 可选；不实现时收到 `{ side, t }` 编译期抛明确错 | — |

内置 rectangle / circle / ellipse / diamond **必须实现** `edgePoint`。

**1. ShapeDefinition 加可选 `edgePoint`**（`shapes/types.ts`）：

```ts
export type ShapeDefinition = {
  // ...现有 circumscribe / boundaryPoint / anchor / emit 不变...
  /**
   * 边上比例点：side 边（真实边界）从约定起点起 t∈[0,1] 处（轴对齐空间求出后由 layout 投回世界系）
   * @description 可选；不实现的 shape 收到 { side, t } target 时编译期报明确错。内置 4 shape 必实现。
   */
  edgePoint?: (rect: Rect, side: 'north' | 'south' | 'east' | 'west', t: number) => Position;
};
```

**2. 几何实现进 `geometry/`**（复用前提，与 alpha.5 几何下沉同口径）：

```ts
// geometry/_edge.ts 新增（方向约定单一真源）
//   north/south: 西→东（t=0 在 west 端）；east/west: 北→南（t=0 在 north 端）
export const EDGE_ENDS = {
  north: ['north-west', 'north-east'],
  south: ['south-west', 'south-east'],
  east: ['north-east', 'south-east'],
  west: ['north-west', 'south-west'],
} as const;

// geometry/rect.ts：矩形四直边线性插值
export const rectEdgePoint = (rect: Rect, side: Side, t: number): Position => {
  const [a, b] = EDGE_ENDS[side];      // 如 north → ['north-west', 'north-east']
  return lerp(rectAnchor(rect, a), rectAnchor(rect, b), t);  // 复用现有 9-anchor，已含 localToWorld
};

// geometry/circle.ts / ellipse.ts：该侧周长弧段参数化（端点 = 相邻象限分界角，按 t 在弧上取角度）
// geometry/diamond.ts：相邻两顶点（如 north → 顶点 N、E 的连线？）——按"四条可见斜边"取，端点为 side 两侧顶点
```

> circle/ellipse 的"north 边"= 顶部那段可见弧（端点为左上 / 右上象限分界），沿弧按 t 取角度插值，**不**退化到外接矩形边；diamond 的边为相邻顶点连成的斜边。各自精确端点 / 角度区间在 ADR 固化（含 t 沿弧是等角还是等弧长——倾向等角，简单且与角度 anchor 同心智）。

**3. anchor-cache 加 `resolveEdgePoint`**（`compile/anchor-cache.ts`）：

```ts
export const resolveEdgePoint = (layout: NodeLayout, side: Side, t: number): IRPosition => {
  if (!layout.shapeDef.edgePoint) {
    throw new Error(`shape '${layout.shape}' does not support side anchors ({ side, t })`);
  }
  // 缓存 key = `${side}:${t}`，与命名 anchor 共用 layout 的 Map（key 命名空间不冲突）
  return cachedBy(layout, `${side}:${t}`, () => layout.shapeDef.edgePoint!(layout.rect, side, t));
};
```

### react 端：eager 解析（唯一的字符串→对象入口）

core schema 已对象唯一,字符串 shorthand 必须在抵达 core 前转成对象——react 在构造 IR 时即解析,序列化 / LLM tool schema / JSON patch 都拿对象:

- `parseTargetSugar`（`packages/core/src/parsers/parseTargetSugar.ts`）扩展：现仅解析 `'+dx,dy'`；改为**字符串节点 ref 也经 `parseNodeTarget` 转对象**（相对偏移分支保留在前）。纯函数，react adapter + Draw DSL 共用。
- `builder.ts`（`packages/react/src/kernel/builder.ts:173,184,228,267,276,284`）各 step 已调 `parseTargetSugar(p.to)`——扩展后自动产出对象，无需逐处改。
- `Draw` / `parseWay`（`packages/core/src/parsers/parseWay.ts` + `sugar/Draw.tsx`）：way item 的节点 ref 字符串同样经 `parseNodeTarget` 归一。
- 对象形态也要能直接写：用户可写 `<Step kind="line" to={{ id: 'A', anchor: { side: 'north', t: 0.25 } }} />`——builder 透传对象，`parseTargetSugar` 对非字符串原样返回（现行为已支持）。

公开类型（react `src/index.ts`，供用户写对象形态时有类型）：从 `@retikz/core` re-export `IRNodeTarget` / `IRAnchorRef`（或更友好的别名 `NodeTarget` / `AnchorRef`，命名见 §待定）。

### 字符串 shorthand：仅 React DSL 层（core 不认）

**决策 2（review 确认）**：core schema **不保留** `z.string()` 兼容分支——alpha.6 直接去除,不等到 rc。字符串 shorthand 只活在 React DSL / Draw way,经 eager 解析转对象后才入 core。

- `'A'` / `'A.north'` / `'A.30'` 在 React JSX / Draw way 继续可写（react 层 sugar）；**core ir / compile / 错误诊断只见对象**。
- `{ side, t }` **仅对象形态**——shorthand 刻意不扩 `'A.north:0.25'` 这种字符串小 DSL（避免再膨胀字符串语法，正是对象化要解决的问题）。
- **dotted id 限制（明说）**：`parseNodeTarget` 按**第一个点**切分（`'A.north'` → id `'A'` + anchor `'north'`），所以**含 `.` 的 id 不能用字符串 shorthand**——必须写对象 `{ id: 'a.b', anchor: 'north' }`。这是字符串 shorthand 的固有限制（沿用旧 `parseNodeRef` 行为），文档须写清；对象形态不受此限。
- IR 主契约 / 文档 / system prompt / API 示例**全部只推对象**；字符串仅在"React DSL 便捷写法 / 迁移"语境出现。

---

## 第二部分：`<TikZ>` → `<Layout>` 命名整理

### react 端改名 + alias

`<TikZ>` 无 displayName，builder 不靠它识别（探查确认），改名纯机械：

1. `packages/react/src/kernel/TikZ.tsx` → 重命名文件为 `Layout.tsx`；组件 `export const Layout: FC<LayoutProps>`、类型 `LayoutProps`（原 `TikZProps` 内容不变）。
2. **`TikZ` 作 deprecated alias**——thin wrapper FC，dev mode 只 warn 一次后渲染 `<Layout>`：

```ts
// packages/react/src/kernel/Layout.tsx 末尾
export type TikZProps = LayoutProps;

let tikzDeprecationWarned = false;
/** 确定性生产判定：仅当能读到 NODE_ENV==='production' 才算生产，其余（含裸 ESM）都当 dev */
const isProductionEnv = (): boolean =>
  typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
/** @deprecated 用 `<Layout>` 代替；本 alias 将在未来版本移除 */
export const TikZ: FC<TikZProps> = props => {
  // fail-open：非确定性生产即 warn（best-effort dev warning）——让真实 browser dev 也拿到提示，
  // 只有确定性生产被 bundler 替换为静默。不用 import.meta.env.DEV（Vite 专属、CJS 下语法错、跨打包器不可移植）。
  if (!isProductionEnv() && !tikzDeprecationWarned) {
    tikzDeprecationWarned = true;
    console.warn('[retikz] <TikZ> is deprecated; use <Layout> instead.');
  }
  return <Layout {...props} />;
};
```

3. 导出：`kernel/index.ts` 把 `export * from './TikZ'` 改 `export * from './Layout'`；`src/index.ts` 导出 `Layout` / `LayoutProps` 为主，保留 `TikZ` / `TikZProps`。

### docs 全量切换（codemod）

- demo.tsx（171 文件 / 175 处）+ mdx 内联（66 处）机械替换：`import { TikZ }` → `import { Layout }`、`<TikZ` → `<Layout`、`</TikZ>` → `</Layout>`。脚本化 codemod（node / PowerShell 正则）一次刷完，**保留一页**演示 deprecated alias（`core/components/layout/` 内单独小节，明示 `<TikZ>` 仍可用但已弃用）。
- AST 白名单（`parser.ts:33-51`）：`COMPONENT_REGISTRY` 加 `Layout`，**保留 `TikZ` 条目**作兼容入口（两者指同一组件）→ **registry 接受 18 个名字**（17 主组件 + `TikZ` 兼容别名）。
- **验证 parser 是否硬编码根组件名**：`apps/docs/src/lib/jsx-to-ir/parser.ts` + `convertReactNodeToIR` 若要求根 === `'TikZ'`，改为接受 `Layout`（也接受 `TikZ`）。`parser.test.ts` 的"解析空 TikZ"等用例改 Layout（保留一条 TikZ 兼容用例）。
- system prompt（`context.ts`）：**面向 LLM / 文档的主契约仍是 17 个组件——只列 `Layout`，`TikZ` 作 deprecated alias 不计入**（中英双语把 `TikZ` 换成 `Layout` 并加一句 alias 注脚）；**结构化 IR / JSON 速查（65-67 / 171-173）的 `to` 字段去字符串节点引用、只列对象 `{ id, anchor?, offset? }` + `[x,y]` / polar / relative / offset**（core 已对象唯一，写字符串会诱导 LLM 生成 core 拒收的 IR）；字符串 shorthand 仅在 `retikz-tsx` JSX / Draw DSL 语境提及（react 层 eager 解析）。

---

## 实现拆分

每片一个语义闭环、独立可验收、单独 commit（commit 前按用户确认逐条执行）。

1. **core schema + 类型**（`ir/path/target.ts`）：新增 `AnchorRefSchema`（角度 `.finite()`）/ `NodeTargetSchema`（offset `.finite()`）+ `TargetSchema` union **去除 `z.string()` 分支**；导出 `IRAnchorRef` / `IRNodeTarget`；`src/index.ts` 公开。**测试**：schema 接受对象各 anchor 形态、`{side,t}` t 越界报 `anchor.t`、角度 NaN/Infinity 被拒、**字符串被 reject**。
2. **parseNodeTarget 新建于 parser 层**（新 `parsers/parseNodeTarget.ts`，删 `compile/parseTarget.ts`）：从 compile 搬迁、返回 `IRNodeTarget` 对象；`parsers/index.ts` 导出。**测试**：`'A'` / `'A.north'` / `'A.30'` → 对象；拼错 anchor 抛错；含 `.` 的 id 切分行为（dotted-id 限制）。
3. **`{side,t}` 几何 + 接口**（`shapes/types.ts` + `geometry/_edge.ts` + `geometry/{rect,circle,ellipse,diamond}.ts` + `compile/anchor-cache.ts`）：`ShapeDefinition.edgePoint?`、`EDGE_ENDS`、各 shape `edgePoint`、`resolveEdgePoint`；内置 4 shape **必实现**（rect 直边 / circle·ellipse 周长弧段 / diamond 斜边），自定义 shape 不支持时报错。**测试**：rect 四边 t=0/0.5/1 端点 + 旋转 rect + circle/ellipse 弧段点在周长上 + diamond 斜边 + 不支持的 shape 报错。
4. **compile 消费对象**（`compile/path/anchor.ts`）：`refPointOfTarget` / `clipForTarget` **对象唯一**（删字符串分支 + `parseNodeRef` import）+ `offset` 世界系叠加 + `isNodeTarget`/`isRelative` 守卫。**同片迁移**直接手写字符串 target 的 core 测试 / fixture → 对象形态。**测试**：对象各 anchor 形态正确；offset 叠加；Coordinate 退化（决策见 §待定）。
5. **react eager 解析 + 公开类型**（`core/parsers/parseTargetSugar.ts` + `parseWay.ts` + `react/src/index.ts`）：`parseTargetSugar` 节点 ref 字符串经 `parseNodeTarget` 转对象；Draw way 同步；re-export `IRNodeTarget`/`IRAnchorRef`。**测试**：`buildIR(<Step to="A.north"/>)` 产出对象 IR、与等价对象写法 diff=0；`<Step to={{id,anchor}}>` 透传；Draw way shorthand → 对象。
6. **TikZ → Layout 改名 + alias**（`kernel/Layout.tsx` + `kernel/index.ts` + `src/index.ts`）：改名、`Layout` 主名、`TikZ` deprecated wrapper（dev once-warn）。**测试**：`<Layout>` 渲染 === 旧 `<TikZ>`；`<TikZ>` 仍渲染且 dev 触发一次 warn（spy console.warn）。
7. **docs 白名单 + parser 根 + system prompt**（`parser.ts` + `convertReactNodeToIR` + `context.ts`）：白名单加 Layout 留 TikZ；根组件接受 Layout；system prompt 组件列举 + `to` 字段对象形态。**测试**：`parser.test.ts` 根为 Layout 解析通过 + TikZ 兼容用例 + `registry.test.ts` 计数。
8. **docs codemod 全量切换**（171 demo + 66 mdx）：脚本替换 import / JSX 标签；保留一页 alias 演示。**验收**：`grep '<TikZ'` 仅剩 alias 演示页 + 兼容说明；docs build 通过。
9. **文档页**：`core/components/layout/index.{zh,en}.mdx`（Layout 主页 + TikZ alias 小节）；Target/Anchor 概念页（`core/concepts/anchors/`）补对象形态主推 + `{side,t}` 边上比例点示例；含 anchor 的 11 个 demo 补一个对象形态对照。
10. **全量验收 + ADR 落档**：core / react / docs 三包测试全绿；ADR 集合（`notes/decisions/core/v0/v0.2/alpha.6/`）固化全部待定项。

---

## 测试

- **schema**：`AnchorRefSchema` 接受命名 / 角度 / `{side,t}`；`t` 越界（<0 / >1）报 `anchor.t` 结构化错误；角度 NaN/Infinity 被拒（`.finite()`）；offset 非有限被拒；`NodeTargetSchema` 缺 `id` 报错；**`TargetSchema` reject 字符串**（字符串分支已移除）。
- **parseNodeTarget 等价性**（parser 层）：`'A'`/`'A.north'`/`'A.30'` → 对应对象；拼错 anchor 抛错带候选名；dotted-id（`'a.b.north'` 按第一个点切 → id `'a'`，文档已声明该限制）。
- **react eager == 对象写法**：`buildIR(<Step to="A.north"/>)` 与 `buildIR(<Step to={{id:'A',anchor:'north'}}/>)` 产出 IR diff = 0（覆盖 node/anchor/angle 三态）。
- **`{side,t}` 几何**：rect 四边 t=0/0.5/1 坐标精确；旋转 rect（`rect.rotate ≠ 0`）edgePoint 经 local→world 正确；circle/ellipse 弧段点落在周长上、diamond 点落在斜边上；offset 叠加；不支持 edgePoint 的自定义 shape 报明确错。
- **offset**：anchor + offset / boundary + offset / 纯角度 + offset 各一例；旋转 node 上 offset **不随 rotate 旋转**（决策 3）。
- **core fixture 迁移**：原直接手写字符串 target 的 core 测试改对象后仍通过（无静默行为变化）。
- **改名**：`<Layout>` 与旧 `<TikZ>` 渲染快照一致；`<TikZ>` alias 渲染正常且 dev 仅 warn 一次（多次渲染不重复 warn）；prod 静默。
- **docs**：`parser.test.ts` Layout 根 + TikZ 兼容；`registry.test.ts` 计数；codemod 后全量 demo 构建 / 现有 snapshot 通过。
- **回归**：alpha.1–alpha.5 全部测试通过（core 1017 / react 291 / docs 64 基线不退）。

## 文档

- `core/components/layout/index.{zh,en}.mdx`：Layout 主页（Usage / Examples / API Reference / Related）+ "从 TikZ 迁移"小节（alias + codemod 建议）。
- `core/concepts/anchors/index.{zh,en}.mdx`：主推对象形态 `{ id, anchor?, offset? }`；新增 `{ side, t }` 边上比例点 + 三等分点示例；字符串写法降级为"便捷写法 / 迁移兼容"。
- IR Schema 参考（target / step 相关页）：`to` / `from` / `center` 字段文档展示对象主契约 + 字符串 shorthand。
- 含 anchor 的 demo（11 个，如 `anchors-explicit` / `scope-anchor-cross`）：至少一个补对象形态对照（让用户看清"字符串只是 shorthand"）。
- 新增 example：`core/examples/edge-proportional-anchor/`（`{ side, t }` 边上比例点连线）。

## 验收

- path target 对象形态（`{ id, anchor?, offset? }`）端到端可用：core schema 校验、compile 解析、错误诊断三处以对象字段为准；**core 不再接受字符串节点引用**。
- 字符串 shorthand（`'A'`/`'A.north'`/`'A.30'`）仅在 React DSL / Draw way 可用，react eager 转对象——序列化 IR 即对象形态；含 `.` 的 id 必须用对象形态（dotted-id 限制已文档化）。
- `{ side, t }` 边上比例点落在**真实边界**（rect 直边 / circle·ellipse 周长弧段 / diamond 斜边）、旋转正确；不支持的自定义 shape 报结构化错（`shape 'X' does not support side anchors`）。
- `anchor.t` 越界报 `anchor.t must be between 0 and 1` 级结构化错误，而非字符串解析失败。
- `<Layout>` 为主名、渲染等价旧 `<TikZ>`；`<TikZ>` deprecated alias 仍工作（dev 一次 warn / prod 静默）。
- docs 全量切 `<Layout>`（仅保留 alias 演示页用 `<TikZ>`）；AST 白名单 + system prompt 同步；parser 根接受 Layout（兼容 TikZ）。
- 三包测试全绿、现有 demo snapshot 仅受 schema 扩张影响的更新、用户层既有用法零破坏。

## 已决策（review 确认）

- **决策 1 — `{ side, t }` = 真实 shape 边界**：rect 按矩形四直边；circle / ellipse 按该侧可见**周长弧段**参数化；diamond 按四条可见斜边。方向：north/south = 西→东，east/west = 北→南。自定义 shape **不强制**（`edgePoint?` 可选，不支持时抛明确错），内置 rect/circle/ellipse/diamond **必实现**。
- **决策 2 — core 字符串分支直接去除**：alpha.6 即从 `TargetSchema` 删 `z.string()`，不留到 rc。IR 主契约 = 对象 target，docs / system prompt / API 示例全部只推对象；字符串 shorthand 仅作 React DSL / Draw way sugar（eager 转对象后入 core）。
- **决策 3 — `offset` 用世界系 / 已解析坐标系，不随节点 rotate**：先把 `{ id, anchor }` / `{ side, t }` 解析到最终点，再直接加 `[dx, dy]`；节点旋转只影响 anchor / 边点位置，不旋转 offset。未来若需节点局部偏移，另加显式字段，不让 `offset` 变双语义。
- **schema 禁非有限数值**：角度 anchor `z.number().finite()`、`offset` 两分量 `.finite()`（与 `position` / `transform` / `font` 既有 `.finite()` 约定一致；NaN/Infinity 与 JSON 可序列化 IR 契约冲突）。
- **dev-warning 守卫（fail-open + best-effort）**：`<TikZ>` alias 仅当 `typeof process !== 'undefined' && process.env.NODE_ENV === 'production'`（确定性生产）才静默，其余一切环境（含裸 browser ESM / process 未定义）fail-open 到 warn——让真实 docs browser dev 也拿到 deprecation warning；不用 `import.meta.env.DEV`（Vite 专属、CJS 构建 `import.meta` 语法错、跨打包器不可移植）。详 [ADR-03 决策细节 #1](.//03-tikz-to-layout-rename.md)。
- **`parseNodeTarget` 落 parser 层**：放 `packages/core/src/parsers/`，避免 parser / adapter 反向依赖 compile。
- **计数口径**：parser registry 接受 18 个名字（17 主组件 + `TikZ` 兼容别名）；面向 LLM / 文档的主契约 17 个组件，只列 `Layout`，`TikZ` 为 deprecated alias 不计入。

## 待定（ADR 阶段敲定）

- **`AnchorRef` 字段命名**：`{ side, t }` vs `{ edge, position }`；倾向 `side/t`（避免与 `Node.position` 混淆，roadmap 已倾向）。
- **circle / ellipse 边点 t 参数化**：沿弧 t 是等角还是等弧长——倾向等角（简单，与角度 anchor 同心智），ADR 固化各侧弧的角度区间端点。
- **`Coordinate` 的 anchor 退化语义**：Coordinate 零尺寸，所有 anchor / `{ side, t }` 退化为中心，还是对结构化 `anchor` 显式 warn / error。
- **`NodeTarget` 命名**：`NodeTarget`（roadmap 草案）vs `RefTarget`（也引用 Coordinate，不止 Node）；react 公开别名是否去 `IR` 前缀（`NodeTarget` / `AnchorRef`）。
- **alias 去留 / codemod**：`<TikZ>` alias 是否在 rc 前继续保留；是否随包提供 codemod（jscodeshift / 文档给 sed 片段）。
- **`parseWay` shorthand 边界**：way item 字符串现支持哪些形态，节点 ref 经 `parseNodeTarget` 后与坐标 / 相对字符串的优先级。

## 设计 ADR

开工前另起（位置 `notes/decisions/core/v0/v0.2/alpha.6/`，编号到时定），固化上节全部"待定"项，并落以下交付物：

- `AnchorRefSchema` / `NodeTargetSchema` 最终字段清单 + `{ side, t }` 方向约定表（`EDGE_ENDS`）+ circle/ellipse 弧角度区间。
- 字符串 shorthand → 对象的归一规则（`parsers/parseNodeTarget` 单一真源，仅 React DSL 层）+ dotted-id 限制声明 + core 去除字符串分支的破坏性边界。
- `ShapeDefinition.edgePoint` 契约（可选性、内置 4 shape 实现定义、自定义 shape 兜底报错文案）。
- compile 消费对象的代码路径（对象唯一、offset 世界系叠加、Coordinate 退化）。
- `<TikZ>` → `<Layout>` 改名 + alias 策略（dev warn 守卫与触发条件、prod 行为、alias 寿命）。
- AST 白名单 18 条目（17 主组件 + TikZ 兼容别名）+ `composeSystem` system prompt 17 组件列举（只列 Layout）+ `to` 字段对象形态更新内容。
- 测试覆盖矩阵（schema 拒字符串 / parseNodeTarget 等价 / `{side,t}` 真实边界几何 / react eager == 对象写法 / core fixture 迁移 / 改名快照 / docs parser）。
