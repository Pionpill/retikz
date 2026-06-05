# ADR-02：circle/ellipse——circle 收为 ellipse 的 `equal` circumscribe preset 别名

- 状态：Proposed
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

## DSL 表面（react + vanilla）

```tsx
<Node shape="circle" />                                                  {/* ≡ ellipse equal，向后兼容 */}
<Node shape="ellipse" />                                                 {/* proportional（现状） */}
<Node shape={{ type: 'ellipse', params: { circumscribe: 'equal' } }} /> {/* 显式等轴 */}
```

```ts
node('c', { shape: 'circle' });                                              // 裸 string
node('e', { shape: { type: 'ellipse', params: { circumscribe: 'equal' } } }); // 显式
```

## 不在本 ADR 范围

- ShapeDefinition 接口（[ADR-01](./01-shape-params-generalization.md)）。
- 其他形状（03/04/05）。

---

## 实现契约（必填）🔻

### Level
`red`（动 `src/shapes/**` + `src/compile/node.ts` 的 circle 规范化）。

### Schema 改动
| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `src/shapes/ellipse.ts` | 加 paramsSchema | `params.circumscribe` | `z.enum(['proportional','equal']).optional()` | `'proportional'` | ellipse 外接策略：比例 / 等轴（circle） |

### 文件 scope
- `src/shapes/ellipse.ts`（修改：defineShape + paramsSchema + circumscribe 分支）
- `src/shapes/circle.ts`（删除：收为 ellipse preset）
- `src/shapes/index.ts`（修改：BUILTIN_SHAPES 去 circle 独立项）
- `src/compile/node.ts`（修改：`'circle'` → `{type:'ellipse', params:{circumscribe:'equal'}}` 规范化）
- `apps/docs/src/contents/core/components/shapes/circle-ellipse/`（文档 + demo 已存在，校对）
- `tests/geometry/ellipse.test.ts`（扩）+ `tests/compile/node-shape.test.ts`（circle 规范化）+ `tests/geometry/circle.test.ts`（改为「circle≡ellipse equal」回归）

### 测试象限

**Happy path（≥ 3）**：
- `ellipse_proportional_default`：无 params / `{circumscribe:'proportional'}` → 各轴 ×√2（现状）
- `ellipse_equal_isotropic`：`{circumscribe:'equal'}` → halfWidth=halfHeight=√(hw²+hh²)
- `circle_normalizes_to_ellipse_equal`：`shape:'circle'` → 编译等价 `{type:'ellipse', params:{circumscribe:'equal'}}`
- `circle_emit_equivalent`：circle 规范化后 emit / anchor 与迁移前旧 circle 逐字段一致（回归）

**边界（≥ 2）**：
- `square_inner_box_equal_equals_proportional_point`：正方内框（hw=hh）下 equal 与 proportional 数值关系记录（√2·hw vs √2·hw，重合）
- `flat_inner_box_equal_uses_diagonal`：极扁内框 equal → 半径取对角线半长（不退化为某轴）

**错误路径（≥ 2）**：
- `invalid_circumscribe_enum_rejected`：`{circumscribe:'foo'}` → paramsSchema reject
- `circle_with_extra_params_rejected`：`{type:'ellipse', params:{foo:1}}` → strictObject reject

**交互（≥ 2）**：
- `ellipse_equal_with_rotate`：equal × Node `rotate` → anchor/boundaryPoint 经 rotate Rect 正确
- `circle_with_scale`：circle（规范化后）× `scale` → 尺寸协同、仍正圆
- `circle_anchor_matches_legacy`：circle 各命名 anchor 与旧 circle 实现一致

### 依赖的现有元素
- [ADR-01](./01-shape-params-generalization.md) `defineShape` / nested params / 双护栏—— **依赖**。
- 现有 `ellipse` 几何（`src/shapes/ellipse.ts`）—— **复用**：boundaryPoint/anchor/edgePoint/emit。
- 现有 `circle`（`src/shapes/circle.ts`）—— **收敛**：降为 ellipse preset 别名、删独立几何。
