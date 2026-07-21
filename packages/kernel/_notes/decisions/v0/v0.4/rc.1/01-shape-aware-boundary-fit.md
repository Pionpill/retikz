# ADR-01：Shape-aware boundary fit

- 状态：Accepted（2026-07-19 人工签字；Architecture Gate PASS；随 v0.4.0-rc.1 发布）
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

## 不在本 ADR 范围

- 自由轮廓 boundary、path offset / inset 或 renderer 采样。
- stroke、shadow、filter、label 或动画时刻包络。
- 改变 `boundary: 'shape'`、shape fallback、registry 优先级、Scene、renderer 或 hit-test。
- 为旧的可能穿透 shape 的 circle / ellipse 拟合保留兼容 mode。

---

> **实现指针**：实现提交为 `c83dc09ce4b36d0583fd7c074aa7194a449b13d5`；核心回归位于 `packages/kernel/core/tests/compile/boundary-resolve.test.ts`、`packages/kernel/core/tests/compile/node/boundary.test.ts`、`packages/kernel/core/tests/providers/boundary/boundary-provider.test.ts` 与 `packages/kernel/core/tests/providers/shape/{contour,star-shape}.test.ts`。最终 schema / 行为以代码为准。
>
> 🔖 完整施工蓝图：`git show v0.4.0-rc.1:packages/kernel/_notes/decisions/v0/v0.4/rc.1/01-shape-aware-boundary-fit.md`。
