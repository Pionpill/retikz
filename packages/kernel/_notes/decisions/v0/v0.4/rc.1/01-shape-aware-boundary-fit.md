# ADR-01：Shape-aware boundary fit

- 状态：Accepted
- 决策日期：2026-07-19
- 关联：[alpha.7 ADR-05](../alpha.7/05-boundary-provider-contract.md)

## 背景

`boundary` 允许视觉 shape 与连接面解耦，但仅凭视觉 AABB 构造 circle / ellipse 要么穿过稀疏 shape，要么留下过大空隙。Compile 需要由 Shape runtime contract 提供安全且可复现的连接面尺寸，不能依赖 renderer 采样

## 决策

Builtin boundary provider 统一支持：

```ts
const BoundaryFit = { Tight: 'tight', Bounds: 'bounds' } as const;

type BuiltinBoundaryParams = {
  fit?: 'tight' | 'bounds';
  gap?: number;
};
```

默认 `{ fit: 'tight', gap: 0 }`；字符串 `boundary="circle"`、`"ellipse"`、`"rectangle"` 使用对应默认值

`bounds` 只使用视觉 AABB：circle 半径为 `hypot(width / 2, height / 2)`；ellipse 半轴为 `[width / 2 * sqrt(2), height / 2 * sqrt(2)]`；rectangle 直接使用 AABB

`tight` 仍返回规则圆、椭圆或矩形，但由 Shape definition 的 `connectionEnvelope` 提供 shape-aware 尺寸：

```ts
type ConnectionEnvelopeKind = 'circle' | 'ellipse' | 'rectangle';

type ShapeDefinitionInput<TParams extends IRJsonObject> = {
  connectionEnvelope?: (
    rect: Rect,
    kind: ConnectionEnvelopeKind,
    params: TParams,
  ) => { halfWidth: number; halfHeight: number } | undefined;
};
```

结果与视觉 rect 同心、同旋转；circle 必须等轴，半轴有限且大于 0，并安全包含不含 stroke、shadow、filter、label 的 shape 几何。没有更紧解析解时 tight 可与 bounds 相同，不承诺数学意义上的最小包络；禁止用离散 emit / renderer 采样

Builtin tight 算法固定：ellipse / circle preset 使用视觉半轴；star / polygon / contour 的 circle 使用顶点到 AABB 中心最大距离，ellipse 以 `a₀=maxAbsX`、`b₀=maxAbsY` 和 `s=max(1, max sqrt((x/a₀)^2+(y/b₀)^2))` 得到 `[s·a₀,s·b₀]`；rectangle / arc / sector 使用 bounds 基线。退化 contour 使用最大顶点距离的等轴包络，双零半轴 fail-loud；arc / sector 不做连续曲线极值优化

Boundary definition 增加通用可选 rect 阶段：

```ts
type BoundaryFitContext = {
  visualRect: Rect;
  connectionEnvelope: (kind: ConnectionEnvelopeKind) => Rect;
};

type BoundaryDefinitionInput<TParams extends IRJsonObject> = {
  resolveRect?: (context: BoundaryFitContext, params: TParams) => Rect;
};
```

Core 对 builtin 与 custom 统一执行 params 解析、可选 `resolveRect`、`boundaryPoint` / `anchor`。Custom shape 没有 `connectionEnvelope` 时 tight 回退 bounds 并 warning；Shape hook 返回非有限、非正或 circle 非等轴时 fail-loud。结果和 warning 在同一 node layout / kind 内复用

`gap` 在 fit 后作用：circle 为 `radius + gap`，ellipse / rectangle 为各半轴加 gap；允许任意有限正负值，负值可让连接面进入 shape 但不推荐。有效半轴不大于 0 时 compile fail-loud；既有 endpoint margin 继续作用于 resolved boundary rect

## 行为、失败语义与兼容性

`boundary: 'shape'`、shape fallback、registry 优先级、Scene、renderer 和 hit-test 语义不变。旧的可能穿透 shape 的拟合不保留兼容 mode；boundary provider 不获得自由轮廓、path offset 或 renderer sampling 能力

## 最终结果与遗留边界

Builtin 与 custom boundary 已通过统一 provider contract 使用 tight / bounds / gap，并保持跨 renderer 确定性。自由轮廓、stroke/shadow/filter/label 包络、动画时刻包络与更精确曲线极值仍属后续能力
