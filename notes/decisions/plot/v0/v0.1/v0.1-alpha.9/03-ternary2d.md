# ADR-03：ternary2D 坐标系 + a/b/c 位置角色通道 + 三角轴 guide

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 CoordinateSystem / §3.6 Encoding](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 frame 角色泛化](./01-coordinate-frame-roles.md)（projectRoles + 位置 encoding 角色化 + 维度校验）

## 背景

ADR-01 把 frame 泛化成 N 通道、x/y 转可选后，ternary2D（三元图）是第一个 3 通道消费者，也是 alpha.9 最能体现「坐标系层」价值的一例——Vega-Lite 扁平模型基本表达不了三元图，而 retikz 的可替换坐标系层能把它与 cartesian/polar 统一表达。

三元图把满足 **a + b + c = 常量** 的三元组（成分占比、配比、得票分布）投影到等边三角形内，三顶点各代表一分量 100%，重心坐标定位。典型场景：土壤砂/粉/黏配比、合金三元成分、三方得票。同类库 ggtern / python-ternary / plotly `scatterternary`。

**`proportion` 已于 alpha.6 并入 `continuous`**——ternary 取三个 continuous 字段、coordinate 内自归一化，不依赖独立 proportion 类型。

## 决策

新增 `ternary2D`（roles=[a,b,c]）；ADR-01 已把 x/y 转可选，本 ADR 给 `PositionEncodingSchema` 加 a/b/c 三个可选角色通道（ternary 专属，必填由 coordinate 校验）、`GuideDimension` 加 A/B/C。

投影：每行 (a,b,c) 先**自动归一化** `s=a+b+c`、`(a/s, b/s, c/s)`，再重心坐标 → 等边三角内屏幕点。`s≤0`、含负、或各分量有限但相加上溢 `Infinity`（数量级过大、归一系数塌成 0 会静默落原点）→ fail-loud（容忍任意正三元组、自动归一，非法 fail-loud；非有限单分量按缺失值跳过）。归一化在 lowering，不写 schema refine。

`Ternary2DSchema` 仅 `type`，本轮无几何配置——**不暴露 a/b/c scale 名字段**（评审指出「字段进 IR/LLM 契约却无运行效果、接受未知 scale 名静默无效」有害；多余 key 被 zod 剥离，同 polar2D 剥 x/y）；coordinate 内归一、domain 固定 [0,1] 占比，待真做 per-component scale 再加。

**mark 支持矩阵**（决策 ⑥）：本轮 **point** 为主——ternary + point = 三角内散点。`line` / `area` 顺延需求驱动；`interval` / `sector` **fail-loud**。三角轴 guide：三条边各一刻度轴（0→100%）+ 三向网格（平行各边的等值线）。

> 起草期决策点已定：三角**顶点朝上、a=顶点 / b=右下 / c=左下**（python-ternary 惯例）；越界 fail-loud 文案 `requires a+b+c > 0` / `requires non-negative components` / `components overflow when summed; use proportions or smaller magnitudes`；三角轴沿边等距刻度 + 顶点旁标注分量名；a/b/c 不消费独立 scale（coordinate 内归一、domain 固定 [0,1]）；line/area 顺延。

## 影响

- **Plot IR**：`PlotCoordinate` 加 `Ternary2D` + `Ternary2DSchema`；`PositionEncodingSchema` 加 a/b/c 可选通道；`GuideDimension` 加 A/B/C；纯增量。
- **core**：无新依赖（三角点 / 三角边 / 网格下沉 core Node/Path）。
- **对外 API**：`coordinate="ternary2D"` + a/b/c props（ADR-04）；纯新增。

## 不在本 ADR 范围

- ternary + line / area（顺延需求驱动）/ interval / sector（fail-loud）。
- ternary 等值线 / 密度 → 顺延。
- 四元及以上（quaternary）→ 不做（三角是 2D 投影上限）。
- React/vanilla 表面 + docs → [ADR-04](./04-dsl-docs.md)。

## 实现指针

最终形态见 `packages/plot/plot/src/ir/{coordinate,encoding,guide}.ts`（`Ternary2DSchema` / a/b/c 通道 / `GuideDimension` A/B/C）、`src/lower/project.ts`（ternary frame + 重心投影 + 归一化 + 上溢 fail-loud）、`src/lower/layout.ts`（三角占位）、`src/lower/guide.ts`（三角轴 + 三向网格）；测试 `tests/lower/ternary2d.test.ts` + `tests/ir/{coordinate,encoding,guide}.schema.test.ts`，「和上溢 Infinity」回归见 `tests/lower/` adversarial 用例。

> 🔖 本文件压缩前完整施工蓝图 = `git show 329fb8b7:notes/decisions/plot/v0/v0.1/v0.1-alpha.9/03-ternary2d.md`（封板全文）。
