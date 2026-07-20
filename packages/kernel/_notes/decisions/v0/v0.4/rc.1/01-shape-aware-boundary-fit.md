# ADR-01：Shape-aware boundary fit

- 状态：Implemented（2026-07-19 人工签字；Architecture Gate PASS）
- 决策日期：2026-07-19
- 关联：[rc.1 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md) · [alpha.7 ADR-05](../alpha.7/05-boundary-provider-contract.md)

## 背景

`boundary` 允许视觉 shape 与连接面解耦，例如星形节点继续按 `star` 绘制，却用规则圆或椭圆解析路径端点和方向 anchor。

现有规则连接面只看到 shape 的外接 `Rect`。按较长边构造圆或直接使用 AABB 椭圆可能穿过 shape；改成 AABB 外接圆或四角外接椭圆虽然安全，却会在星形、扇形等稀疏轮廓周围留下明显空隙。compile 只凭 AABB 无法同时做到安全与贴合，采样 renderer 输出又会引入后端差异和精度阈值。

根问题是 Shape runtime contract 没有表达“视觉几何能安全放进多大的规则连接面”。rc.1 已经修改过一次 boundary 拟合行为；用户明确允许突破本次 RC freeze，在发布前一次完成正确 contract，不把同一行为继续拆到 v0.5。

## 决策：Shape 提供安全 envelope，内置 Boundary 统一使用 fit 与 gap

三个 builtin boundary provider 使用同一参数：

```ts
export const BoundaryFit = {
  Tight: 'tight',
  Bounds: 'bounds',
} as const;

export type BuiltinBoundaryParams = {
  fit?: BoundaryFitValue;
  gap?: number;
};
```

默认 `{ fit: 'tight', gap: 0 }`；字符串 `boundary="circle"`、`"ellipse"`、`"rectangle"` 等价于对应 provider 的默认参数。

`bounds` 只依赖视觉 AABB：circle 半径为 `hypot(width / 2, height / 2)`；ellipse 半轴为 `[width / 2 * sqrt(2), height / 2 * sqrt(2)]`；rectangle 直接使用 AABB。

`tight` 保持规则圆、椭圆或矩形，只从 Shape definition 取得 shape-aware 尺寸。它表示“安全包含且不比 bounds 更松”，允许在没有更紧解析解时与 bounds 相同，不承诺数学意义上的全局最小面积椭圆。内置 shape 必须返回精确结果或可证明安全的保守结果，禁止离散采样 `emit` / renderer 输出。

```ts
export type ConnectionEnvelopeKind = 'circle' | 'ellipse' | 'rectangle';

export type ShapeDefinitionInput<TParams extends IRJsonObject> = {
  // existing fields
  connectionEnvelope?: (
    rect: Rect,
    kind: ConnectionEnvelopeKind,
    params: TParams,
  ) => { halfWidth: number; halfHeight: number } | undefined;
};
```

返回结果与视觉 `rect` 同心、同旋转；circle 必须等轴；半轴必须有限且大于 `0`，并安全包含 shape 几何轮廓。轮廓不含 stroke、shadow、filter、label；额外视觉距离由 `gap` 或既有 node `margin` 表达。

rc.1 固定以下 builtin tight 算法，implementation 与 tests 不得自行换目标函数：

| 视觉 shape                     | circle envelope                            | ellipse envelope                                                                         |
| ------------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `ellipse` / circle preset      | `max(halfWidth, halfHeight)`               | 视觉半轴 `[halfWidth, halfHeight]`                                                       |
| `star` / `polygon` / contour   | 局部顶点到 AABB 中心的最大距离             | 取 `a₀=maxAbsX`、`b₀=maxAbsY`，以 `s=max(1, max √((x/a₀)²+(y/b₀)²))` 得到 `[s·a₀, s·b₀]` |
| `rectangle` / `arc` / `sector` | bounds 外接圆；允许与 `fit: 'bounds'` 相同 | bounds 四角外接椭圆；允许与 `fit: 'bounds'` 相同                                         |

顶点型 shape 的椭圆包含全部顶点，因此也包含其直线段与倒角后的轮廓。若 contour 只有一个 AABB 半轴为 `0`，ellipse envelope 改用“最大顶点距离”为两个半轴的等轴包络，避免除零；若两个半轴都为 `0`，则 fail-loud。`arc` / `sector` 在本 RC 不引入连续曲线极值优化，先使用确定且安全的 bounds 基线。rectangle boundary 自身的 `tight` / `bounds` 始终直接使用视觉 AABB，不调用 Shape envelope。

为了保持 builtin / custom boundary 同 registry、compile 不按 provider name 写白名单，Boundary definition 增加可选的通用 rect 解析阶段：

```ts
export type BoundaryFitContext = {
  visualRect: Rect;
  connectionEnvelope: (kind: ConnectionEnvelopeKind) => Rect;
};

export type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  // existing fields
  resolveRect?: (context: BoundaryFitContext, params: TParams) => Rect;
};
```

Core 对所有 boundary 统一执行“解析 params → 可选 `resolveRect` → `boundaryPoint` / `anchor`”。builtin provider 通过 `resolveRect` 选择 fit 并应用 gap；custom boundary 不实现时保持直接使用 visual rect 的现状。compile 提供的 `connectionEnvelope(kind)` 统一处理 Shape hook、fallback、warning 与 cache，boundary provider 不直接依赖 visual Shape definition。

custom shape 没有 `connectionEnvelope` 时，tight 回退 bounds，并发出 `BOUNDARY_TIGHT_FALLBACK` warning。同一 node layout / kind 的结果和 warning 缓存一次，endpoint、数字角度 anchor 与标准 anchor 复用它。Shape hook 返回非有限、非正或 circle 非等轴时 fail-loud。

`gap` 在基础 fit 后作用：circle 使用 `radius + gap`，ellipse / rectangle 使用 `[halfWidth + gap, halfHeight + gap]`。它接受任意有限数；负值允许连接面进入或穿过 shape，但文档标记为不推荐。任一有效半轴不大于 `0` 时 compile fail-loud。既有 endpoint margin 在 fit / gap 后继续作用于 resolved boundary rect。

理由：

1. Shape definition 是 params 与解析视觉几何的 owner，能避免 compile / renderer 复制 shape 算法。
2. `tight`、`bounds`、`gap` 分别表达真实几何、安全 AABB 基线和用户间距，职责单一。
3. `resolveRect` 保持 provider 通用调用链，不在 compile 重新引入 builtin 白名单。
4. 负 gap 提供逃生口，非正半轴 fail-loud 避免无效几何进入 math / renderer。

## 待决策点 🔻

无。API、默认值、fallback、warning、负 gap、失效条件和 RC 例外均已由用户定稿。

## DSL 表面

```tsx
<Node
  id="a"
  shape={{ type: 'star', params: { points: 5 } }}
  boundary={{ type: 'circle', params: { fit: 'tight', gap: 6 } }}
>
  a
</Node>

<Path
  from={{ node: 'a', boundary: { type: 'ellipse', params: { fit: 'bounds', gap: -2 } } }}
  to="b"
/>
```

## 测试设计

Core contract、provider 与 compile tests 覆盖统一 params、内置 shape envelope、fallback warning、非法结果，以及 endpoint / anchor / rotation / margin / target override 组合。具体 case 见实现契约。

## 影响

- `ShapeDefinitionInput` 增加可选 `connectionEnvelope`；`BoundaryDefinitionInput` 增加可选 `resolveRect`。二者是 runtime definition，不进入 IR / Scene。
- 三个 builtin boundary params 从严格空对象变为统一 `{ fit?, gap? }`；既有无参写法仍合法。
- ⚠️ RC 人工例外：circle / ellipse 默认改为 shape-aware tight。需要确定 AABB 安全包围时使用 `fit: 'bounds'`；不保留 v0.4 较长边圆或直接 AABB 椭圆这种可能穿过 shape 的旧模式。
- React / Vanilla 不新增专属 API，继续透传同一 IR 和 Core provider。
- Node / custom Shape 双语文档与 rc.1 changelog 同步。

## 绘图完备性检查

- 能力面与解决的问题：规则连接面安全包含 shape，同时可贴近轮廓并显式调节间距。
- 是否属于 Drawing Complete：属于 Node connection surface / anchor 几何补齐。
- 主责包与协作包：Core 主责 contract / provider / compile；adapter 只透传；docs 公开语义。
- 是否可由现有能力组合：不能；AABB 与 boundaryPoint 没有视觉轮廓 envelope。
- math / core / render / adapter：math 只提供纯几何 helper；Core 计算；renderer / adapter 不计算拟合。
- 是否需要新 IR / contract / registry：不新增 IR / registry；扩展 runtime contract 与 builtin params。
- Scene / manifest：无变化；compile 输出最终连接点。
- renderer 降级：无变化；fallback 与诊断发生在 Core。
- React / Vanilla：使用相同 IR / provider 注入链路。
- Interaction Readiness：不适用。
- 本轮结论：扩展现有 Shape / Boundary contract；轮廓 offset 延期。

## 不在本 ADR 范围

- 自由轮廓 boundary、path offset / inset 或 renderer 采样。
- stroke、shadow、filter、label 或动画时刻包络。
- 改变 `boundary: 'shape'`、shape fallback、registry 优先级、Scene、renderer 或 hit-test。
- 为旧的可能穿透 shape 的 circle / ellipse 拟合保留兼容 mode。

---

## 实现契约（必填）🔻

### Level

`red`：修改 Core public runtime contract 与 compile 核心。此处是用户明确批准的 rc.1 人工例外。

### Schema 改动

持久化 `BoundarySchema` / `IRBoundary` 形态不变；provider payload 变更：

| 文件                                                         | 操作 | 字段名             | 类型                                                      | 默认值  | describe 中文摘要                  |
| ------------------------------------------------------------ | ---- | ------------------ | --------------------------------------------------------- | ------- | ---------------------------------- |
| `packages/kernel/core/src/schemas/boundary/constants.ts`     | 加   | `BoundaryFit`      | const object enum：`tight \| bounds`                      | —       | 内置规则连接面的拟合策略           |
| `packages/kernel/core/src/schemas/boundary/types.ts`         | 加   | `BoundaryFitValue` | `ValueOf<typeof BoundaryFit>`                             | —       | 内置规则连接面的拟合策略联合       |
| `packages/kernel/core/src/providers/boundary/definitions.ts` | 改   | `fit`              | `z.enum(['tight', 'bounds']).optional().default('tight')` | `tight` | 按 shape envelope 或 AABB 拟合     |
| `packages/kernel/core/src/providers/boundary/definitions.ts` | 改   | `gap`              | `z.number().optional().default(0)`                        | `0`     | 拟合后增加到半径或半轴的有符号间距 |

### 文件 scope

- `packages/kernel/core/src/schemas/boundary/{constants,types,index}.ts`
- `packages/kernel/core/src/contract/{shape,boundary}/types.ts`
- `packages/kernel/core/src/providers/boundary/definitions.ts`
- `packages/kernel/core/src/providers/shape/*.ts` 与对应 geometry helper
- `packages/kernel/core/src/shared/geometry/{connection-envelope,index}.ts`（Shape provider 与 compile 共用的零依赖纯几何 helper）
- `packages/kernel/core/src/compile/constants.ts`
- `packages/kernel/core/src/compile/node/{boundary,anchors,layout,types}.ts`
- `packages/kernel/core/src/compile/orchestration/traversal.ts`
- `packages/kernel/core/tests/{contract,providers,compile}/**/*boundary*.test.ts` 与 `providers/shape/*.test.ts`
- `packages/kernel/react/tests/**/*.test.tsx`、`packages/kernel/vanilla/tests/**/*.test.ts`
- `apps/docs/src/modules/docs/contents/kernel/components/node/**`
- `apps/docs/src/modules/docs/contents/kernel/components/shapes/{custom-shape,circle-ellipse,rectangle,star,polygon,arc-sector,contour}/**`
- `apps/docs/src/modules/docs/data/changelog/kernel-0-4.ts`

偏离白名单需先修改本 ADR 并重新评审。

### 测试象限

**Happy path（≥ 3）**：

- `tight circle × star`：默认与显式 tight 相同；安全包含顶点且小于 bounds 圆。
- `tight ellipse × sector`：安全包含端点与角度 extrema，旋转后同心、同旋转。
- `bounds × builtin shape`：三种 boundary 命中 ADR 固定的 AABB 公式。
- `positive gap`：三种 boundary 的半径 / 半轴统一增加，endpoint / anchor 同步外移。

**边界（≥ 2）**：

- `rectangle fit parity`：tight / bounds 完全一致。
- `negative gap`：有效半轴仍为正时不 clamp、不 warning。
- `rotated + margin`：fit / gap 后应用 endpoint margin，局部与世界方向稳定。
- `custom shape without hook`：warning + bounds fallback，同 node / kind 只 warning 一次。

**错误路径（≥ 2）**：

- `non-finite gap`：payload parse 拒绝并包含 provider / IR path。
- `non-positive effective axis`：抛错包含 provider、基础半轴、gap、IR path。
- `invalid shape envelope`：非有限、非正或 circle 非等轴时 fail-loud。

**交互（≥ 2）**：

- endpoint、数字角度 anchor、标准 anchor 复用同一 fitted rect。
- node boundary 与 target override 独立解析，不污染 cache。
- React / Vanilla 相同输入得到相同连接点和 warning。
- `boundary: 'shape'`、shape fallback 与 builtin registry 优先级保持不变。

### 依赖的现有元素

- `IRBoundary` / `BoundarySchema`—— 保持 `{ type, params }` provider reference。
- `ShapeDefinitionInput`—— 扩展 shape-aware envelope。
- `BoundaryDefinitionInput`—— 扩展 provider-generic rect 解析阶段。
- `parseProviderPayload`—— 解析 builtin params 与 IR path 诊断。
- `resolveBoundary` / `boundaryPointOf` / `anchorOf` / `angleBoundaryOf`—— 统一消费 fitted rect。
- `CompileWarningCode` / `CompileWarning`—— 承载 tight fallback warning。
- Shape `circumscribe` / `circumscribeOffset` 与 geometry helper—— 复用解析几何。
- Boundary registry 与 shape fallback—— 保持 alpha.7 ADR-05 的 lookup 规则。
