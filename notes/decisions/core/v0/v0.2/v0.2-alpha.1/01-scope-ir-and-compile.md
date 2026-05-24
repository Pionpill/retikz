# ADR-01：`<Scope>` IR 容器 + compile 下沉到 GroupPrim

- 状态：Accepted
- 决策日期：2026-05-16
- 关联：[v0 roadmap §v0.2 预备](../../roadmap.md) · [v0.2 总计划](../roadmap.md) · [v0.2-alpha.1 plan](./roadmap.md) · [alpha.5 ADR-01 (Scene 结构化)](../../v0.1/v0.1-alpha.5/01-scene-primitive-structured.md)

## 背景

v0.1 的 IR 是扁平结构：`Scene.children: Array<Node | Path | Coordinate>`，没有分组容器。TikZ 用户用 `\begin{scope}[opts]...\end{scope}` 做三件事：

1. **局部 transform**：scope 内坐标先经局部变换、再叠外层；CM 栈外向内 push
2. **样式默认值作用域**：`every node/.style={...}` 只在 scope 内生效（v0.2 alpha.2 处理，不在本 ADR）
3. **结构分组**：可视化的 "subdiagram" 概念，方便 codec / 反推时聚拢

retikz Scene Tier 3 已有 `GroupPrim = { type: 'group', transforms?: Array<Transform>, children: ScenePrimitive[] }`（alpha.5 ADR-01 结构化的产物），承担 transform 复合的实际渲染。但 IR 层完全没有容器概念——所有意图都写在 IRChild 平铺中。

本 ADR 引入 IR 层 `<Scope>` 一等基元：**Q2 决策只引入 `<Scope>`，不引入 `<Group>`**。理由：TikZ 用户视角只接触 `\begin{scope}`，Scene `GroupPrim` 是内部 Tier 3 实现细节；两个相似 IR 基元会让 schema 复杂度翻倍 + LLM 生成纠结。

## 选项

### A. 引入 `IRScope` 作为 IRChild 第 4 类 discriminator（**推荐**）

```ts
// packages/core/src/ir/scope.ts
export const ScopeSchema = z
  .object({
    type: z.literal('scope').describe('Discriminator: this child is a scope container'),
    id: z
      .string()
      .min(1)
      .optional()
      .describe(
        'Optional reference id; when set, registers a synthetic rectangle node (scope bbox) in the **parent** namespace frame so paths / positions can target the scope as a whole; bbox semantics详 ADR-03',
      ),
    localNamespace: z
      .boolean()
      .optional()
      .describe(
        'When true, this scope creates a local namespace boundary—child node / coordinate / nested-scope ids registered inside do NOT propagate to parent namespace; external lookups cannot see them. Default false (matches TikZ pgf default: child ids flow up to global). scope.id itself always registers in **parent** frame regardless of this flag (it is the external handle). Resolution semantics详 ADR-02.',
      ),
    transforms: z
      .array(TransformSchema)
      .optional()
      .describe('Local transforms applied to all scope children; array order = application order (outer→inner); supports 6 variants: translate / polar-translate / at-translate / offset-translate / rotate / scale'),
    children: z
      .array(ChildSchema)  // 见下面"递归 schema 实现说明"
      .describe('Scope children: nested nodes / paths / coordinates / scopes'),
  })
  .describe('Scope container: groups child IR elements and applies local transforms; corresponds to TikZ \\begin{scope} (with optional `local bounding box=id` when id is set, and `name prefix`-like isolation when localNamespace is true)');
```

`TransformSchema`（IR 层）= **6 变体** discriminated union；**4 个 translate 变体完全镜像 Node.position 4 形态**（Position / PolarPosition / AtPosition / OffsetPosition），rotate / scale 与 Scene 层一致。所有 translate 变体在 compile 时展平为 Cartesian Translate 再下沉到 Scene `GroupPrim`，**实现复用 `resolvePosition`**——把 translate "shift 量"看作 Position 字面量解析后的 (x, y) 向量：

```ts
// packages/core/src/ir/transform.ts
const TranslateSchema = z.object({
  kind: z.literal('translate'),
  x: z.number().describe('Cartesian x translation (user units)'),
  y: z.number().describe('Cartesian y translation (user units, screen y-down)'),
});

const PolarTranslateSchema = z.object({
  kind: z.literal('polar-translate'),
  origin: z
    .union([z.string().min(1), PositionSchema, PolarPositionSchema])
    .optional()
    .describe('Origin reference (same union as PolarPosition.origin): node id string / Cartesian [x,y] / nested PolarPosition; omit = origin at (0,0) so polar-translate behaves as absolute polar shift'),
  angle: z.number().describe('Angle in degrees, 0° = +x, 90° = +y (screen-down); matches PolarPosition.angle convention'),
  radius: z.number().describe('Radius / distance in user units'),
});

const AtTranslateSchema = z.object({
  kind: z.literal('at-translate'),
  direction: z.nativeEnum(AT_DIRECTIONS).describe('8 方向枚举 (与 AtPosition.direction 同集合)'),
  of: z.string().min(1).describe('Referent node id (forward-reference rejected; mirrors AtPosition.of)'),
  distance: z.number().optional().describe('Distance along direction; omit → use CompileOption.nodeDistance (与 AtPosition.distance 同义)'),
});

const OffsetTranslateSchema = z.object({
  kind: z.literal('offset-translate'),
  of: z
    .union([z.string().min(1), PositionSchema, PolarPositionSchema])
    .describe('Referent base point (same union as OffsetPosition.of): node id / Cartesian / PolarPosition'),
  offset: z
    .tuple([z.number(), z.number()])
    .optional()
    .describe('Additional [dx, dy] offset; omit = [0, 0] (translate exactly to referent)'),
});

const RotateSchema = z.object({
  kind: z.literal('rotate'),
  degrees: z.number(),
  cx: z.number().optional(),
  cy: z.number().optional(),
});

const ScaleSchema = z.object({
  kind: z.literal('scale'),
  x: z.number(),
  y: z.number().optional(),
});

export const TransformSchema = z.discriminatedUnion('kind', [
  TranslateSchema,
  PolarTranslateSchema,
  AtTranslateSchema,
  OffsetTranslateSchema,
  RotateSchema,
  ScaleSchema,
]);
```

**Translate 4 变体语义对照**（与 Node.position union 一一对应）：

| Transform 变体 | 对应 Position 变体 | TikZ 对应 | 解析方法 |
|---|---|---|---|
| `translate {x, y}` | `[x, y]`（笛卡尔字面量） | `[shift={(x, y)}]` | 直接用作 vector |
| `polar-translate {origin?, angle, radius}` | `PolarPosition` | `[shift={(angle:radius)}]` 或 `[shift={($(A) + (angle:radius)$)}]` | 调 `resolvePosition` 把它当 PolarPosition 解析，结果即 vector |
| `at-translate {direction, of, distance?}` | `AtPosition` | `[shift={(<direction:distance from A>)}]` | 调 `resolvePosition` 把它当 AtPosition 解析 |
| `offset-translate {of, offset?}` | `OffsetPosition` | `[shift={($(A) + (dx, dy)$)}]`（TikZ `calc`） | 调 `resolvePosition` 把它当 OffsetPosition 解析 |

**递归 schema 实现说明**：zod v3 的 `discriminatedUnion` 不支持单选项延迟，但整体 union 可用 `z.lazy` 包裹 + `z.ZodType<T>` 显式类型注解实现递归：

```ts
// packages/core/src/ir/scene.ts（递归 ChildSchema）
export const ChildSchema: z.ZodType<IRChild> = z.lazy(() =>
  z.discriminatedUnion('type', [
    NodeSchema,
    PathSchema,
    CoordinateSchema,
    ScopeSchema,
  ]),
);
export type IRChild =
  | IRNode
  | IRPath
  | IRCoordinate
  | IRScope;
export type IRScope = {
  type: 'scope';
  transforms?: Array<IRTransform>;
  children: Array<IRChild>;
};
```

`IRChild` 类型需手写（不能用 `z.infer`），与 ScopeSchema 互递归——这是 zod 现有惯例（与 `PolarPosition.origin` 嵌套 polar 模式一致：v0.1 polar 用 `z.lazy` 处理嵌套 origin，留 `z.ZodType<PolarPosition>` 注解）。

**IR `TransformSchema` ≠ Scene `Transform`**：IR 层独立定义 **6** 变体（translate / polar-translate / at-translate / offset-translate / rotate / scale），与 Node.position union 4 形态完全镜像；4 个 translate 变体在 compile 阶段全部展平为 Cartesian translate 后再下沉到 Scene `GroupPrim.transforms`（Scene 层维持 3 变体不变，不污染底层渲染契约）。`ChildSchema` 改为递归——含 ScopeSchema 自己。

**Compile 下沉**（Pass 1/2 改造）：

- **Pass 1**：递归遍历 scope tree；对每个 node / coordinate **计算它所在 scope 链的累积 transform**，把 layout 存入 nodeIndex 时用**全局坐标系**（已 apply 全部 transform 链）。这样 Pass 2 path 引用仍走全局 nodeIndex，无需改造。
- **4 个 translate 变体展平**：scope.transforms 中的 polar-translate / at-translate / offset-translate 在 compile 累积 transform chain 时全部展平为 Cartesian translate——**实现复用 `compile/position.ts` 的 `resolvePosition`**：把 translate 变体的非 kind 字段重命名后构造一个 Position 字面量、调 `resolvePosition` 拿到 Cartesian `(x, y)`、再用作 translate 的 x/y。对应映射：polar-translate `{origin?, angle, radius}` → PolarPosition；at-translate `{direction, of, distance?}` → AtPosition；offset-translate `{of, offset?}` → OffsetPosition（`offset` 缺省 = `[0, 0]`）。GroupPrim emit 时只看 Cartesian。
- **scope.id 设值时**：scope 子树 Pass 1 完成后，**计算子树全部 layout 在全局坐标系的 axis-aligned bbox**，注册为 synthetic `NodeLayout`（shape: 'rectangle'）进 nodeIndex；详细 anchor 与边界语义在 ADR-03（id 冲突检测共享命名空间在 ADR-02）。
- **Scene emit**：每个 `IRScope` 对应一个 `GroupPrim`（嵌套时多层）；scope 内 node 的 primitive 包在对应 GroupPrim 内，**Scene primitive 仍带 transforms**——adapter 看到的几何是局部坐标 + GroupPrim transform 链（与 alpha.5 ADR-01 已有 Scene 结构一致，不改 adapter 协议）。
- **双重存储语义**：node 在 nodeIndex 是全局坐标（供其他节点 / path 引用）；node 在 Scene primitive 树里是局部坐标 + GroupPrim transform 链（供渲染）。两者由 compile 层各自计算，互不依赖。

### B. 引入 `IRScope` 但 nodeIndex 存"局部 layout + transform 链"，引用时即查即解

```ts
type NodeIndexEntry = {
  layout: NodeLayout      // 局部坐标系
  transformChain: Transform[]  // 从根到 node 的累积 transform 列表
}
```

Pass 2 path 引用时按 transformChain 投影。

- 优：保留语义层"node 在哪个 scope"的信息；codec 反推时直接还原 IR
- 缺：所有 nodeIndex 消费者（compile/path、resolvePosition、anchor 解析）都要改造为"transform-aware"；改造面大；anchor 数字角度 `.30` 涉及方向向量也要按 transform 旋转

### C. 不引入 IR Scope，让用户直接写 Scene `GroupPrim`

- 优：零 schema 改动
- 缺：违反 IR 分层（Tier 1 IR vs Tier 3 Scene）；用户得理解 ScenePrimitive；codec 反推丢失 scope 语义；样式继承（alpha.2）没地方挂

## 决策：A（IRScope 第 4 类 child + Pass 1 累积 transform 算全局坐标）

理由：

1. **改造面最小**：nodeIndex 形态不变（仍是 `Map<string, NodeLayout>`），Pass 2 / `resolvePosition` / anchor 解析无需改；只 Pass 1 加 transform 累积 + Scene 输出按 scope 树包 GroupPrim
2. **与 alpha.5 ADR-01 一致**：Scene 已有 GroupPrim + transforms 数组；IRScope 下沉到 GroupPrim 是自然映射
3. **codec 反推可行性**：alpha.5 已规约 Scene primitive 是结构化数据；GroupPrim → IRScope 反推由 `unbuilder` 处理（不在本 ADR 范围，但接口兼容）
4. **YAGNI**：方案 B 的"按需投影"在 v0.2 没有强需求——所有引用都需要全局坐标（path / position 引用是用户最终想要的世界坐标）

## 决策细节

> 选项 A 主决策之外，11 项细节均已拍板。下游 implement 阶段按此执行。

1. **`type` discriminator 字面量 = `'scope'`**：与现有 `'node'` / `'path'` / `'coordinate'` 风格一致
2. **`id` 可选**：缺省 → scope 仅承担分组 / transform / 样式作用域；设值 → 注册 bbox synthetic layout 进**父 namespace frame**（详 ADR-03）。`id` 字段类型 `z.string().min(1).optional()`，与 Node / Coordinate 同形。**关键**：scope.id 永远注册到父 frame，不受 `localNamespace` 影响（scope.id 是 scope 的"外部句柄"，必须能被外部引用）

11. **`localNamespace` 可选 boolean 字段**（**新**）：缺省 false → 子节点 id（child node / coordinate / 嵌套 scope.id）注册到**父 frame**（默认行为，与 TikZ pgf + v0.1 一致，全局扁平）；true → 创建一个 local namespace frame，子节点 id 注册到此 frame 不向上传播，外部不可见。scope 嵌套时**最上层 `<TikZ>` 才是真正的"全局" frame**，中间任何 `localNamespace: true` 的 scope 各自划出 sub-frame。**lookup 走 frame stack inside-out**——内部可以引用外部 id（shadowing），外部不能引用内部 id。详细 namespace stack 语义、duplicate-id 解析规则（warn + last-wins）在 ADR-02
3. **`transforms` 可选**：缺省 / 空数组 = 无变换（与 Scene `GroupPrim.transforms?` 一致）；空 scope 仍允许（只承担分组 / 引用语义，alpha.2 默认值挂点 / 视觉聚拢）
4. **Transform 6 变体（4 translate + rotate + scale），4 个 translate 完全镜像 Node.position union**：translate（笛卡尔字面量）/ polar-translate（带可选 origin 的极坐标，对应 PolarPosition）/ at-translate（对应 AtPosition）/ offset-translate（对应 OffsetPosition）/ rotate / scale。**kind 字面量命名规则**：`'polar-translate'` / `'at-translate'` / `'offset-translate'`（限定词在前，与 PolarPosition / AtPosition / OffsetPosition 命名风格对齐）；compile 阶段 4 个 translate 全部通过 `resolvePosition` 复用解析为 Cartesian `(x, y)`，下沉 GroupPrim 时只剩 3 变体（Cartesian translate + rotate + scale）。**前向引用规则**：at-translate.of / offset-translate.of / polar-translate.origin 引用 string id 时，被引用者必须在 scope 进入前的 IR 顺序中已定义（与 OffsetPosition / PolarPosition / AtPosition 前向引用规则一致）
5. **children 数组递归**：`ChildSchema` 用 `z.ZodType<IRChild>` + `z.lazy` 包裹整个 discriminatedUnion，支持 scope 嵌套自己（无深度限制，与 polar / offset 嵌套规则一致）
6. **transform 数组顺序约定**：**与 Scene `GroupPrim` 一致**——数组顺序应用，第 0 个最先生效（最内层）。即 `transforms: [t1, t2]` 等价于"先 t1 再 t2"应用到子坐标。这与 SVG `transform="t1 t2"` 语义一致。⚠️ TikZ `\begin{scope}[shift=..., rotate=...]` 多选项时是 option 出现顺序决定 CM 叠加顺序，retikz 复用 SVG/Scene 约定。
7. **空 scope 优化**：children 空数组 + transforms 空 / 缺省 + id 缺省 → compile 时省略 GroupPrim emit（不发空容器）。但任一非空（含 id 设值需要注册 bbox） → 仍 emit GroupPrim 或至少注册 bbox（bbox 在 children 空时退化为零尺寸 rectangle，详 ADR-03 边界）
8. **scope 内 coordinate 注册到全局 nodeIndex**：与 v0.1 / TikZ 默认行为一致——TikZ `\coordinate (name) at (...);` 在 `\begin{scope}` 内声明时全局可见（pgf 不限定命名空间）。retikz 沿用同一行为，scope 不引入局部命名空间。详 ADR-02
9. **scope `transforms: []` 空数组**：允许（与 Scene `GroupPrim.transforms?` 一致，等价 undefined 行为）；builder 层不强制 prune
10. **polar-translate radius 负数语义**：接受 `radius < 0`，等价 `(angle + 180°, |radius|)` —— compile 时按 `x = radius·cos(angle°)`, `y = radius·sin(angle°)` 数学公式直接算（负 radius 自然产生反向偏移），不加 schema `.nonnegative()` 限制。与 v0.1 PolarPosition.radius 行为一致

## 待决策点

> 选项 A 已锁，但实施前再判：

- **at-translate / offset-translate 引用 scope 自身 id**：scope X 用 `at-translate { of: 'X.someChild', ... }` 引用自己子节点 → 禁止（子节点未 layout）；scope X 用 `at-translate { of: 'X', ... }` 引用自己 scope.id → 禁止（synthetic bbox layout 此时尚未注册，违反前向引用规则）。本 ADR 默认禁止，alpha.1 实施期改为显式抛错 `OFFSET_BASE_UNRESOLVED` / `AT_TARGET_UNRESOLVED`（复用现有 CompileWarning code）
- **at-translate.distance 缺省时取 nodeDistance**：与 AtPosition 行为一致；CompileOption.nodeDistance 同样作用于 Transform 内的 at-translate

## DSL 表面

```tsx
import { TikZ, Scope, Node, Path, Step, Coordinate } from '@retikz/react';

// 最简：scope 包一组 node，整体平移
<TikZ>
  <Scope transforms={[{ kind: 'translate', x: 50, y: 30 }]}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={[40, 0]}>B</Node>
    <Path arrow="->">
      <Step kind="move" to="A" />
      <Step to="B" />
    </Path>
  </Scope>
</TikZ>
// 视觉效果：A 在 (50, 30)、B 在 (90, 30)；path 在 scope 内连两节点

// 嵌套 scope：外层旋转、内层再平移
<TikZ>
  <Scope transforms={[{ kind: 'rotate', degrees: 45 }]}>
    <Node id="root" position={[0, 0]}>root</Node>
    <Scope transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
      <Node id="child" position={[0, 0]}>child</Node>
      <Coordinate id="anchor" position={[50, 0]} />
    </Scope>
    <Path>
      <Step kind="move" to="root" />
      <Step to="child" /> {/* 跨 scope 引用：child 在外层全局坐标系正确投影 */}
      <Step to="anchor" /> {/* coordinate 跨 scope 引用同样工作 */}
    </Path>
  </Scope>
</TikZ>

// 仅分组、无 transform——为 alpha.2 样式继承挂点准备（本 ADR 不处理样式，但语法已就位）
<TikZ>
  <Scope>
    <Node position={[0, 0]}>solo</Node>
  </Scope>
</TikZ>

// 多 transform 数组：先平移再旋转（绕 scope 局部原点旋转，再外移）
<Scope transforms={[
  { kind: 'translate', x: 100, y: 0 },
  { kind: 'rotate', degrees: 30 },
]}>
  <Node position={[0, 0]}>rotated-then-translated</Node>
</Scope>

// 极坐标 transform：scope 中心位移到 30° 方向 50 单位（TikZ `[shift={(30:50)}]` 等价）
<Scope transforms={[{ kind: 'polar-translate', angle: 30, radius: 50 }]}>
  <Node position={[0, 0]}>polar-shifted</Node>
</Scope>

// 极坐标 transform 带 origin（镜像 PolarPosition.origin 用法）
<TikZ>
  <Node id="hub" position={[100, 50]}>hub</Node>
  <Scope transforms={[{ kind: 'polar-translate', origin: 'hub', angle: 45, radius: 30 }]}>
    <Node position={[0, 0]}>polar-from-hub</Node>
    {/* 视觉位置 = hub 全局 + 极坐标偏移 = (100 + 30·cos45, 50 + 30·sin45) */}
  </Scope>
</TikZ>

// 相对方向 transform：把 scope shift 到 "node A 右边 20 单位"（镜像 AtPosition）
<TikZ>
  <Node id="A" position={[0, 0]}>A</Node>
  <Scope transforms={[{ kind: 'at-translate', direction: 'right', of: 'A', distance: 20 }]}>
    <Node position={[0, 0]}>right-of-A</Node>
    <Node position={[10, 10]}>also-shifted</Node>
  </Scope>
</TikZ>

// 相对偏移 transform：scope shift 到 "node A 全局位置 + (10, 5)"（镜像 OffsetPosition）
<TikZ>
  <Node id="A" position={[50, 30]}>A</Node>
  <Scope transforms={[{ kind: 'offset-translate', of: 'A', offset: [10, 5] }]}>
    <Node position={[0, 0]}>at-A-plus-offset</Node>
    {/* 视觉位置 = A 全局 + (10, 5) = (60, 35) */}
  </Scope>
</TikZ>

// offset-translate 不带 offset：scope 原点对齐到 referent 全局位置
<TikZ>
  <Node id="A" position={[100, 100]}>A</Node>
  <Scope transforms={[{ kind: 'offset-translate', of: 'A' }]}>
    <Node position={[0, 0]}>at-A-exactly</Node> {/* 视觉位置 = A 全局 = (100, 100) */}
  </Scope>
</TikZ>

// 复合：先 offset-translate（用 referent 定位）+ 再 rotate
<TikZ>
  <Node id="anchor" position={[200, 0]}>anchor</Node>
  <Scope transforms={[
    { kind: 'offset-translate', of: 'anchor', offset: [0, 0] },
    { kind: 'rotate', degrees: 90 },
  ]}>
    <Node position={[50, 0]}>rotated-around-anchor</Node>
    {/* scope 局部 (50, 0) → rotate 90 → (0, 50) → offset-translate apply → (200, 50) 全局 */}
  </Scope>
</TikZ>

// offset-translate.of 可用 scope.id（引用先定义的 scope bbox）
<TikZ>
  <Scope id="left-cluster">
    <Node id="L1" position={[0, 0]}>L1</Node>
    <Node id="L2" position={[30, 0]}>L2</Node>
  </Scope>
  <Scope transforms={[{ kind: 'offset-translate', of: 'left-cluster', offset: [80, 0] }]}>
    <Node position={[0, 0]}>right-cluster-anchor</Node>
    {/* 视觉位置 = left-cluster bbox 中心 + (80, 0) */}
  </Scope>
</TikZ>

// localNamespace：scope 创建本地命名空间，子 id 不向外传播
<TikZ>
  <Scope localNamespace>
    <Node id="A" position={[0, 0]}>A-inside</Node>
    <Node id="B" position={[40, 0]}>B-inside</Node>
    <Path><Step kind="move" to="A" /><Step to="B" /></Path>
    {/* 内部 path 引用 "A" / "B" 完全正常 */}
  </Scope>
  <Node id="A" position={[100, 0]}>A-outside</Node>
  {/* 外层另一个 id="A" 不与 scope 内 "A" 冲突——两个 frame 隔离 */}
  <Path>
    <Step kind="move" to="A" />  {/* 在 TikZ 根 frame 查找，命中外层 A */}
    {/* <Step to="B" />  ❌ B 在 localNamespace scope 内，外部不可见 */}
  </Path>
</TikZ>

// scope.id + localNamespace：scope 整体可被外部引用，内部 id 隔离
<TikZ>
  <Scope id="cluster" localNamespace>
    <Node id="A" position={[0, 0]}>A-private</Node>
    <Node id="B" position={[20, 0]}>B-private</Node>
  </Scope>
  <Path>
    <Step kind="move" to="cluster.north" />  {/* ✓ scope.id 注册到父 frame，外部可见 */}
    {/* <Step to="A" />  ❌ A 在 cluster 内部 frame，外部不可见 */}
  </Path>
</TikZ>

// 嵌套 localNamespace：内层 frame 可看到外层 + 自己；外层不可见内层
<TikZ>
  <Node id="root-node" position={[0, 0]}>root</Node>
  <Scope localNamespace>
    <Node id="level1-node" position={[50, 0]}>L1</Node>
    <Scope localNamespace>
      <Node id="level2-node" position={[100, 0]}>L2</Node>
      <Path>
        <Step kind="move" to="root-node" />  {/* ✓ 从 L2 frame 向上 lookup 命中 TikZ 根 */}
        <Step to="level1-node" />  {/* ✓ 从 L2 frame 向上 lookup 命中 L1 frame */}
        <Step to="level2-node" />  {/* ✓ 当前 frame */}
      </Path>
    </Scope>
    {/* level2-node 此时不可见（已退出内层 frame） */}
  </Scope>
  {/* level1-node / level2-node 都不可见 */}
</TikZ>

// 同 frame duplicate id → warn + last-wins（详 ADR-02）
<TikZ>
  <Node id="A" position={[0, 0]}>A-first</Node>
  <Node id="A" position={[10, 0]}>A-second</Node>
  {/* compile warn DUPLICATE_NODE_ID；nodeIndex 内 "A" = A-second（last wins） */}
</TikZ>

// 带 id 的 scope —— 整体可被外层引用
<TikZ>
  <Scope id="cluster" transforms={[{ kind: 'translate', x: 100, y: 0 }]}>
    <Node id="A" position={[0, 0]}>A</Node>
    <Node id="B" position={[40, 30]}>B</Node>
    <Node id="C" position={[80, 0]}>C</Node>
  </Scope>
  <Node id="external" position={[0, 100]}>ext</Node>
  <Path arrow="->">
    <Step kind="move" to="external" />
    <Step to="cluster.north" /> {/* 引用 scope 整体 bbox 的 north 锚点 */}
  </Path>
</TikZ>
```

## 测试设计

`packages/core/tests/compile/scope.test.ts`（新建）+ `packages/core/tests/ir/scope.schema.test.ts`（新建）+ `packages/core/tests/compile/scope-transform-lowering.test.ts`（新建，专门测 4 translate 变体下沉）覆盖：

- schema：合法 / 嵌套 / 缺失 children / 非法 transform / 空 transforms / 空 children
- compile Pass 1：scope 内 node 坐标 = transform 链 apply 到局部 position
- compile Pass 2：跨 scope path 引用解析正确
- Scene 输出：每层 IRScope 对应一层 GroupPrim、transforms 透传
- 嵌套：3 层 scope、每层独立 transform
- 空 scope 优化：empty + no transform → 不 emit GroupPrim
- **Transform lowering**：4 translate 变体（translate / polar-translate / at-translate / offset-translate）各自走 resolvePosition lowering，最终下沉到 Scene Cartesian translate；referent 前向引用 / 自引用 / scope 内子引用拒绝

具体 case 拆分见下面"实现契约 § 测试象限"。

## 影响

- **`packages/core/src/ir/scope.ts`**（新文件）：`ScopeSchema` + `IRScope`（含 id? 字段）；`TransformSchema` 在 `ir/transform.ts` 独立定义（6 变体）
- **`packages/core/src/ir/scene.ts`**：`ChildSchema` discriminatedUnion 加 `ScopeSchema`；递归用 `z.lazy()`；`IRChild` type 扩
- **`packages/core/src/ir/index.ts`**：barrel 加 export
- **`packages/core/src/ir/transform.ts`**（新文件）：IR 层 transform schema 6 变体；引用 `packages/core/src/ir/position/*.ts` 的 PositionSchema / PolarPositionSchema / OffsetPosition union 复用——polar-translate.origin / offset-translate.of 复用 Position 体系 schema，保证 IR translate union 与 Node.position union 4 形态字段对齐；IR 与 Scene `group.ts` 各自独立 schema（Scene 维持 3 变体 Cartesian-only）
- **`packages/core/src/compile/compile.ts`**：Pass 1 改为递归遍历，每层进 scope 时**先**对 transforms 数组做 lower pass——把 polar-translate / at-translate / offset-translate 各自构造对应 Position 字面量、调 `resolvePosition` 拿到 Cartesian (x, y)、替换为 Cartesian translate；得到 Cartesian-only chain 后 push 进累积 transform；nodeIndex 写入时用累积 transform 应用过的 layout；Scene primitive 输出按 scope 树包 GroupPrim
- **`packages/core/src/compile/scope.ts`**（新文件）：scope 树遍历 + transform 累积 helpers + **`lowerScopeTransforms(transforms, nodeIndex, nodeDistance): Array<CartesianTranslate | Rotate | Scale>`** 把 IR 6 变体展平为 Scene 3 变体（调用 resolvePosition）
- **`packages/core/src/index.ts`**：公开 API 加 `ScopeSchema` / `IRScope` / `TransformSchema`（IR 版）
- **React adapter**：`packages/react/src/kernel/Scope.tsx`（新建，**kernel 而非 sugar**——Scope 是 IR 一等基元 emit IRScope，与 Node / Path / Coordinate 同层）；`builder.ts` 加 `<Scope>` → IRScope 翻译；`unbuilder.ts` 反推 IRScope → JSX
- **测试**：core schema + compile（scope Pass 1 / Pass 2 / 嵌套）+ react builder 双向 round-trip
- **文档双语**：`apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx`（新建，含 6+ demo）+ AGENTS.md 加 Scope 章节

## 不在本 ADR 范围

- **nodeIndex 跨 scope ID 唯一性 / anchor 投影细节 / id 冲突检测** → [ADR-02](./02-node-index-anchor-resolution.md)
- **scope.id 触发的 bbox 注册 / synthetic layout 计算 / scope 作为引用整体的 anchor 语义** → [ADR-03](./03-scope-id-bounding-box.md)
- **scope 下相对定位（Node.position `{ of, direction }` 等）的 referent 投影规则** → [ADR-04](./04-relative-position-in-scope.md)
- **scope 上挂 `nodeDefault` / `pathDefault` 默认值字段** → v0.2 alpha.2 单独 ADR
- **scope 下 path 跨 scope 走线的视觉裁剪** → 不需要（TikZ 也不裁剪，scope 是逻辑分组不是 clip region）
- **TikZ `cm` 任意 2×3 仿射矩阵** → v0.2 不做（YAGNI）；如需另开 `MatrixTransform` ADR
- **polar 形态的 rotate（绕极坐标点旋转）/ scale（极坐标各向异性缩放）** → 现实需求弱，v0.2 不做；如需另开 ADR
- **scope rotate 下 bbox 是 axis-aligned 旋转后 vs local 旋转前** → ADR-03 默认 axis-aligned 全局 bbox（TikZ `local bounding box` 默认行为），rotation-aware bbox 留为待决策点

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/core/src/ir/**`（新建 scope.ts + 改 scene.ts ChildSchema）
- 动 `packages/core/src/compile/**`（Pass 1 改递归 + 新建 scope.ts）
- 动 `packages/core/src/index.ts`（公开 API）
- 跨级取最高 = red

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `packages/core/src/ir/scope.ts` | 新建 schema | `ScopeSchema` | `z.object({ type, id?, transforms?, children })` | — | Scope 容器：分组 + 局部 transform + 可选 bbox 引用 id，对应 TikZ `\begin{scope}`（含 `local bounding box=id`） |
| `packages/core/src/ir/scope.ts` | 新建字段 | `ScopeSchema.type` | `z.literal('scope')` | — | discriminator |
| `packages/core/src/ir/scope.ts` | 新建字段 | `ScopeSchema.id` | `z.string().min(1).optional()` | undefined | 可选引用 id；设值则 scope 注册 bbox 为 synthetic rectangle node 进**父 namespace frame**（不受 localNamespace 影响，scope.id 是外部句柄；详 ADR-03）；与 Node / Coordinate.id 同形 |
| `packages/core/src/ir/scope.ts` | 新建字段 | `ScopeSchema.localNamespace` | `z.boolean().optional()` | false | opt-in 本地命名空间；true → 子节点 id 不向父 frame 传播（外部不可见）；最上层 `<TikZ>` 是全局 frame；具体 namespace stack 语义详 ADR-02 |
| `packages/core/src/ir/scope.ts` | 新建字段 | `ScopeSchema.transforms` | `z.array(TransformSchema).optional()` | undefined | 局部 transform 列表，数组顺序应用；4 变体；缺省 = 无变换 |
| `packages/core/src/ir/scope.ts` | 新建字段 | `ScopeSchema.children` | `z.array(ChildSchema)` | — | scope 子节点，可嵌套自己；递归由 `ChildSchema` 用 `z.lazy` 包裹整个 discriminatedUnion 实现（见 "选项 A" 章节代码） |
| `packages/core/src/ir/transform.ts` | 新建 schema | `TransformSchema` | `z.discriminatedUnion('kind', [TranslateSchema, PolarTranslateSchema, AtTranslateSchema, OffsetTranslateSchema, RotateSchema, ScaleSchema])` | — | IR 层 transform，6 变体；4 个 translate 完全镜像 Node.position union，compile 时全部展平为 Cartesian translate 再下沉 Scene（复用 resolvePosition） |
| `packages/core/src/ir/transform.ts` | 新建 schema | `TranslateSchema` | `z.object({ kind: literal('translate'), x: number, y: number })` | — | 笛卡尔平移；x / y user units（screen y-down）；对应 Position 字面量 |
| `packages/core/src/ir/transform.ts` | 新建 schema | `PolarTranslateSchema` | `z.object({ kind: literal('polar-translate'), origin?: string \| Position \| PolarPosition, angle, radius })` | origin: undefined（→ (0,0)）| 极坐标平移；origin union 镜像 PolarPosition.origin；对应 TikZ `[shift={(angle:radius)}]` 或 `[shift={($(A) + (angle:radius)$)}]` |
| `packages/core/src/ir/transform.ts` | 新建 schema | `AtTranslateSchema` | `z.object({ kind: literal('at-translate'), direction: AT_DIRECTIONS, of: string, distance? })` | distance: CompileOption.nodeDistance | 方向相对平移；direction 8 方向枚举（镜像 AtPosition）；对应 TikZ `[shift={(<direction> of=A)}]` |
| `packages/core/src/ir/transform.ts` | 新建 schema | `OffsetTranslateSchema` | `z.object({ kind: literal('offset-translate'), of: string \| Position \| PolarPosition, offset? })` | offset: [0, 0] | 偏移平移；of union 镜像 OffsetPosition.of；对应 TikZ `[shift={($(A) + (dx, dy)$)}]` calc 语法 |
| `packages/core/src/ir/transform.ts` | 新建 schema | `RotateSchema` | `z.object({ kind: literal('rotate'), degrees, cx?, cy? })` | cx/cy: 0 | 旋转；degrees 正向 = screen-down 视觉顺时针；cx/cy 缺省 = 绕局部原点 |
| `packages/core/src/ir/transform.ts` | 新建 schema | `ScaleSchema` | `z.object({ kind: literal('scale'), x, y? })` | y: x | 缩放；y 缺省 = x 等比 |
| `packages/core/src/ir/scene.ts` | 改 | `ChildSchema` | `z.ZodType<IRChild>` + `z.lazy(() => z.discriminatedUnion('type', [Node, Path, Coordinate, Scope]))` | — | 顶层 child union 扩第 4 类（Scope），整体 `z.lazy` 包裹支持 scope 递归嵌套；`IRChild` 类型手写不能用 `z.infer` |

### 文件 scope

- `packages/core/src/ir/scope.ts`（新建）
- `packages/core/src/ir/transform.ts`（新建——IR 层 transform schema；复刻 Scene Transform type 形）
- `packages/core/src/ir/scene.ts`（修改：ChildSchema 加 scope + z.lazy 递归）
- `packages/core/src/ir/index.ts`（barrel 加 export）
- `packages/core/src/index.ts`(公开 API 加 export)
- `packages/core/src/compile/compile.ts`（Pass 1 改递归 + scope 处理）
- `packages/core/src/compile/scope.ts`（新建：transform chain 累积 + scope 树遍历 helpers）
- `packages/core/src/primitive/group.ts`（**只读**——引用现有 Transform 类型，IR `TransformSchema` 与之同形）
- `packages/core/tests/ir/scope.schema.test.ts`（新建）
- `packages/core/tests/compile/scope.test.ts`（新建）
- `packages/react/src/kernel/Scope.tsx`（新建：kernel 一等组件，emit IRScope）
- `packages/react/src/kernel/index.ts`（修改：export Scope）
- `packages/react/src/kernel/_displayNames.ts`（修改：加 `TIKZ_SCOPE`）
- `packages/react/src/kernel/builder.ts`（修改：识别 `<Scope>` 翻译为 IRScope）
- `packages/react/src/kernel/unbuilder.ts`（修改：IRScope → `<Scope>` JSX 反推）
- `packages/react/tests/kernel/builder.test.tsx`（扩 case：scope 双向）
- `packages/react/tests/kernel/unbuilder.test.tsx`（扩 case：scope 反推）
- `apps/docs/src/contents/core/components/tikz/scope/index.{en,zh}.mdx`（新建：双语 + 6+ demo）
- `apps/docs/src/contents/core/components/tikz/scope/*.demo.tsx`（新建若干 demo 文件）
- `AGENTS.md` / `packages/core/AGENTS.md` / `packages/react/AGENTS.md`（修改：加 Scope 章节）

### 测试象限

#### Happy path（≥ 3）

- `scope_basic_translate`：单层 scope，translate(50, 30) → 子 node `position=[0,0]` 渲染在 (50, 30)
- `scope_basic_polar_translate`：单层 scope，polar-translate(angle=30, radius=50) → 等价 translate(≈43.3, 25)；子 node `position=[0,0]` 渲染在 (≈43.3, 25)
- `scope_polar_translate_with_origin_id`：scope polar-translate `{origin: 'A', angle: 0, radius: 30}`（A 全局 (50, 0)）→ 等价 translate(80, 0)
- `scope_polar_translate_with_origin_cartesian`：scope polar-translate `{origin: [10, 5], angle: 90, radius: 20}` → 等价 translate(10, 25)
- `scope_at_translate_basic`：scope at-translate `{direction: 'right', of: 'A', distance: 20}`（A 全局 (0,0)）→ 等价 translate(20, 0)
- `scope_at_translate_default_distance`：scope at-translate `{direction: 'above', of: 'A'}` 无 distance + CompileOption.nodeDistance=15 → 等价 translate(0, -15)（above 是 -y 方向）
- `scope_offset_translate_basic`：scope offset-translate `{of: 'A', offset: [10, 5]}`（A 全局 (0,0)）→ 等价 translate(10, 5)
- `scope_offset_translate_no_offset`：scope offset-translate `{of: 'A'}` 缺省 offset（A 全局 (100, 100)）→ 等价 translate(100, 100)
- `scope_offset_translate_of_scope_id`：scope offset-translate `{of: 'cluster', offset: [80, 0]}` 引用先定义的 scope.id → 等价 translate(cluster.bbox.center + (80, 0))
- `scope_local_namespace_isolates_child_ids`：`<Scope localNamespace>` 内 node id="A"；同 IR 外部另一 node id="A" → 两者不冲突，分别注册到各自 frame
- `scope_local_namespace_internal_path_lookup`：localNamespace scope 内 path `to="A"` 引用 scope 内 node "A" → 内部 frame lookup 命中
- `scope_local_namespace_external_cannot_see_inside`：外部 path `to="B"`（B 在 localNamespace scope 内）→ UNRESOLVED_NODE_REFERENCE warn（external frame 查不到）
- `scope_id_registers_in_parent_frame_with_local_namespace`：`<Scope id="cluster" localNamespace>` → cluster 注册到父 frame；外部 path `to="cluster.north"` ✓ 可解析
- `scope_nested_local_namespace_inner_sees_outer`：嵌套 localNamespace；内层 path lookup 向外层 frame shadowing 搜索 → 命中外层 id
- `scope_basic_rotate`：单层 scope，rotate(45) → 子 node position=[100,0] 渲染在 (≈70.7, ≈70.7)
- `scope_basic_scale`：单层 scope，scale(2) → 子 node 位置 / 大小按 2x 投影
- `scope_polar_translate_lowered_to_cartesian_in_scene`：scope 内 polar-translate → Scene `GroupPrim.transforms` 内是 Cartesian translate（验证下沉展平）
- `scope_nested_compose`：嵌套 scope，外 translate + 内 rotate → 子 node 坐标按数组顺序复合
- `scope_emits_group_prim`：Scene 输出含对应层数的 GroupPrim 嵌套，transforms 透传
- `scope_path_cross_reference`：跨 scope path `to="A"`（A 在内层）→ path 端点取 A 的**全局**坐标

#### 边界（≥ 2）

- `scope_empty_no_id_no_transform_pruned`：children 空 + transforms 缺省 + id 缺省 → Scene 不 emit GroupPrim
- `scope_empty_with_transform_kept`：children 空但 transforms 非空 → Scene emit 空 GroupPrim（保留语义）
- `scope_transforms_empty_array`：transforms 空数组 → 与 undefined 同行为（不 apply transform）
- `scope_deep_nesting`：5 层 scope 嵌套，每层独立 transform → 累积变换正确
- `scope_polar_translate_zero_radius`：polar-translate radius=0 → 等价 Cartesian translate(0, 0) → 无视觉位移
- `scope_polar_translate_360_degrees`：angle=360 与 angle=0 数值结果一致（不要求 angle ∈ [0, 360)）

#### 错误路径（≥ 2）

- `scope_invalid_transform_kind_rejected`：`transforms: [{ kind: 'unknown', ... }]` → zod 校验失败
- `scope_polar_translate_missing_angle_rejected`：`{ kind: 'polar-translate', radius: 50 }`（缺 angle） → zod 校验失败
- `scope_polar_translate_missing_radius_rejected`：`{ kind: 'polar-translate', angle: 30 }`（缺 radius） → zod 校验失败
- `scope_at_translate_missing_of_rejected`：`{ kind: 'at-translate', direction: 'right' }`（缺 of） → zod 校验失败
- `scope_at_translate_invalid_direction_rejected`：`{ kind: 'at-translate', direction: 'diagonal', of: 'A' }` 不在 AT_DIRECTIONS 枚举 → zod 校验失败
- `scope_offset_translate_missing_of_rejected`：`{ kind: 'offset-translate', offset: [10, 0] }`（缺 of） → zod 校验失败
- `scope_offset_translate_non_tuple_offset_rejected`：`{ kind: 'offset-translate', of: 'A', offset: [1, 2, 3] }` → zod 校验失败
- `scope_at_translate_forward_ref_rejected`：scope at-translate of='B'、B 在 scope 后定义 → 抛错 AT_TARGET_UNRESOLVED（前向引用规则）
- `scope_offset_translate_forward_ref_rejected`：scope offset-translate of='B'、B 在 scope 后定义 → 抛错 OFFSET_BASE_UNRESOLVED
- `scope_at_translate_self_id_rejected`：scope.id = 'X' + at-translate of='X' → 抛错（自引用，synthetic bbox 未注册）
- `scope_at_translate_inner_child_rejected`：scope at-translate of='innerChild'（innerChild 是本 scope 内 node）→ 抛错（前向引用，innerChild 未 layout）
- `scope_invalid_child_type_rejected`：`children: [{ type: 'invalid' }]` → zod 校验失败
- `scope_missing_children_rejected`：缺 children 字段 → zod 校验失败（children 必填，即便为空数组）
- `scope_empty_id_string_rejected`：`id: ''` 空串 → zod `.min(1)` 校验失败
- `scope_local_namespace_invalid_type_rejected`：`localNamespace: 'true'`（字符串而非 boolean） → zod 校验失败
- `scope_duplicate_id_same_frame_warns_last_wins`：同 frame 内两 node id="A" → compile 不抛错，发 warn DUPLICATE_NODE_ID + nodeIndex "A" 取后定义的（详 ADR-02 决策细节）

#### 交互（≥ 2）

- `scope_with_coordinate`：scope 内 `<Coordinate>` → 注册到全局 nodeIndex（坐标已 apply scope transform）
- `scope_with_polar_position`：scope 内 node 用 polar position（origin 引用 scope 内另一 node） → polar 解析后再 apply scope transform
- `scope_with_at_position`：scope 内 node 用 AtPosition（of 引用外层 node） → 跨 scope referent 投影正确
- `scope_with_offset_position`：scope 内 node 用 OffsetPosition（of 引用外层 node） → 同上
- `scope_path_with_anchor_reference`：跨 scope path `to="A.north"` → anchor 投影正确（详 ADR-02 anchor 章节）
- `scope_with_rotate_node_inside`：scope rotate + 内层 node 自身也 `rotate` → 两层旋转复合（不会双重计算）
- `scope_polar_translate_chained_with_cartesian`：transforms 数组 `[{ polar-translate, angle:0, radius:50 }, { translate, x:10, y:0 }]` → 展平后等价 `[{ translate, x:50, y:0 }, { translate, x:10, y:0 }]`，复合应用
- `scope_mixed_4_translate_variants_chained`：transforms 数组同时含 translate + polar-translate + at-translate + offset-translate（各引用合法 referent）→ 全部展平为 Cartesian translate、按数组顺序复合
- `scope_offset_translate_with_polar_origin`：offset-translate `{of: {origin: 'A', angle: 0, radius: 30}, offset: [5, 0]}`（of 用嵌套 PolarPosition）→ resolve 链：A 全局 (0,0) → polar (30, 0) → +offset → translate(35, 0)
- `scope_id_with_bbox_referenced_externally`：`<Scope id="cluster">` 内多 node、外层 path `to="cluster.north"` → bbox 注册 + anchor 解析正确（具体 bbox 计算 case 在 ADR-03）
- `scope_local_namespace_with_same_id_two_frames`：外层 node id="A" 在 (100, 0)、内层 `<Scope localNamespace>` 内 node id="A" 在 (0, 0) → 两条 nodeIndex entry 各自在各自 frame，外层 path 引用 "A" 命中 (100, 0)，内层 path 引用 "A" 命中 (0, 0)（shadowing 不算 duplicate）
- `scope_local_namespace_scope_id_visible_externally`：`<Scope id="X" localNamespace>` 内 node id="A" + 外层 path `to="X.north"` ✓ + 外层 path `to="A"` ❌ UNRESOLVED → 验证 scope.id 注册到父 frame、子 id 隔离

### 依赖现有元素

- `packages/core/src/ir/scene.ts` 的 `ChildSchema` —— **修改**：union 加 ScopeSchema + z.lazy 递归
- `packages/core/src/primitive/group.ts` 的 `Transform` / `GroupPrim` —— **引用**：IR `TransformSchema` **是 Scene `Transform` 的超集**（6 变体 vs 3 变体）；4 个 translate 变体均展平为 Scene Cartesian translate；schema 独立避免 IR ↔ Scene 循环依赖
- `packages/core/src/ir/position/position.ts` 的 `PositionSchema` —— **引用**：polar-translate.origin / offset-translate.of 复用此 schema 作为 union 成员之一
- `packages/core/src/ir/position/polar-position.ts` 的 `PolarPositionSchema` —— **引用**：同上，作为 union 成员；polar-translate 的 angle/radius/origin 三字段与 PolarPosition 完全镜像
- `packages/core/src/ir/position/at-position.ts` 的 `AtPositionSchema` / `AT_DIRECTIONS` —— **引用**：at-translate 的 direction/of/distance 三字段与 AtPosition 完全镜像；direction 枚举共享 `AT_DIRECTIONS` 常量
- `packages/core/src/ir/position/offset-position.ts` 的 `OffsetPositionSchema` —— **引用**：offset-translate 的 of/offset 两字段与 OffsetPosition 完全镜像
- `packages/core/src/compile/position.ts` 的 `resolvePosition` —— **复用 + 扩用法**：4 个 translate 变体的 lowering 各自构造对应 Position 字面量、调 resolvePosition 拿到 Cartesian (x, y) → 作为 translate vector；resolvePosition 自身签名 / 行为不变（ADR-04 才会扩 scope-aware 参数）
- `packages/core/src/compile/compile.ts` 的 `compileToScene` —— **修改**：Pass 1 改递归 + scope 处理；nodeIndex 仍 `Map<string, NodeLayout>` 不变
- `packages/core/src/compile/node.ts` 的 `layoutNode` / `emitNodePrimitives` —— **引用**：不变；scope 处理在调用方累积 transform
- `packages/react/src/kernel/builder.ts` —— **修改**：识别 Scope 子组件 → IRScope 翻译
- `packages/react/src/kernel/unbuilder.ts` —— **修改**：IRScope → Scope JSX 反推（用于 codec / hot reload 兼容）
