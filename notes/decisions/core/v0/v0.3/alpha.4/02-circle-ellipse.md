# ADR-02：circle/ellipse——circle 收为 ellipse 的 `equal` circumscribe preset 别名

- 状态：Accepted
- 决策日期：2026-06-06
- 关联：[v0.3-alpha.4 roadmap](./roadmap.md) · 依赖：[ADR-01 shape 参数化机制](./01-shape-params-generalization.md)（nested params + defineShape + 双护栏） · 文档页：`apps/docs/src/contents/core/components/shapes/circle-ellipse/`

> **依赖 ADR-01**：按 01 冻结的 `defineShape<TParams>` + nested `{type, params}` + 双护栏实现 ellipse 的 `paramsSchema` + 几何；与 03/04/05 并发、互不依赖。

## 背景

`circle` 与 `ellipse` 现为两个独立内置 shape，但 `boundaryPoint` / `anchor` / `edgePoint` / `emit` 几何，circle 就是 ellipse 的 `rx=ry` 退化。唯一实质差异在 `circumscribe`（`node.ts:10` 注释）：

- circle：`r = √(innerHalfW² + innerHalfH²)`——等轴（正圆，半径=内框对角线半长）
- ellipse：`rx = innerHalfW×√2, ry = innerHalfH×√2`——各轴独立（比例）

两套几何冗余。

## 决策：ellipse 参数化 `circumscribe`，circle 降为 preset 别名

ellipse 的 `paramsSchema` 加外接策略参数；circle 不再有独立几何，编译期规范化为 ellipse 的 `equal` preset。

```ts
// packages/core/core/src/shapes/ellipse.ts —— 经 defineShape，nested params
export const ellipse = defineShape({
  paramsSchema: z.strictObject({
    circumscribe: z
      .enum(['proportional', 'equal'])
      .optional()
      .describe('Circumscription policy from the inner content box: "proportional" (per-axis ×√2, ellipse) or "equal" (isotropic, circle: r = diagonal half-length). Default "proportional".'),
  }),
  circumscribe: (hw, hh, params) =>
    params.circumscribe === 'equal'
      ? { halfWidth: Math.hypot(hw, hh), halfHeight: Math.hypot(hw, hh) }   // 等轴
      : { halfWidth: hw * Math.SQRT2, halfHeight: hh * Math.SQRT2 },        // 比例（现状）
  // boundaryPoint / anchor / edgePoint / emit 复用现有 ellipse 几何（不分支）
  // ...
});
// circle ≡ { type: 'ellipse', params: { circumscribe: 'equal' } }
// shape: 'circle'（裸 string）在 compile/node.ts 规范化为上式
```

- 几何 `boundaryPoint` / `anchor` / `edgePoint` / `emit` 只留 ellipse 一套（现有实现复用，不读 `params`）。
- `shape:'circle'` 与 `shape:'ellipse'` 两种裸 string 写法都保留；`circle` 规范化为 `{type:'ellipse', params:{circumscribe:'equal'}}`。

理由：单一几何实现 + 旧写法兼容；与 [ADR-04](./04-rectangle-polygon.md) diamond→polygon、[ADR-01](./01-shape-params-generalization.md) preset 别名思路一致。

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- 其他形状（03/04/05）。

> 实现指针：最终 schema / 类型 / 行为以代码为准；完整施工契约（Level / Schema 改动 / 文件 scope / 测试象限 / 依赖现有元素）+ DSL 示例 + 影响清单见本文件封板前全文。
> 🔖 本文件压缩前完整施工蓝图 = `git show 62562f1d:notes/decisions/core/v0/v0.3/alpha.4/02-circle-ellipse.md`（封板全文）。
