# ADR-03：ternary2D 坐标系 + a/b/c 位置角色通道 + 三角轴 guide

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot-design §3.5 CoordinateSystem / §3.6 Encoding](../../../../../architecture/plot-design.md) · 依赖：[ADR-01 frame 角色泛化](./01-coordinate-frame-roles.md)（projectRoles + 位置 encoding 角色化 + 维度校验）

## 背景

[ADR-01](./01-coordinate-frame-roles.md) 把 frame 泛化成 N 通道、位置 encoding x/y 转可选后，**ternary2D**（三元图）成为第一个 3 通道消费者，也是 alpha.9 最能体现「坐标系层」价值的一例——**Vega-Lite 的扁平模型基本表达不了三元图**，而 retikz 的坐标系可替换层能把它和 cartesian/polar 统一表达。

三元图把满足 **a + b + c = 常量** 的三元组（成分占比、配比、得票分布）投影到等边三角形内：三个顶点各代表一个分量为 100%，重心坐标（barycentric）定位。典型场景：土壤砂/粉/黏配比、合金三元成分、三方得票。

同类库：ggplot2 无内置（`ggtern` 扩展包）、python-ternary、plotly `scatterternary`。共性是**三个位置通道 + 归一化 + 三角形几何**。

**`proportion` 已于 alpha.6 并入 `continuous`**（父 roadmap「消费 proportion」措辞过时）——ternary 取**三个 continuous 字段**、coordinate 内自行归一化，不依赖独立 proportion 类型。

## 决策：`PlotCoordinate` 加 `ternary2D`，位置 encoding 加 a/b/c 角色通道，重心投影 + 自动归一化，配三角轴 guide；mark 以 point 为主

新增 `ternary2D` 坐标系（roles=[a,b,c]）；[ADR-01](./01-coordinate-frame-roles.md) 已把 x/y 转可选，本 ADR 给 `PositionEncodingSchema` 加 **a/b/c** 三个可选角色通道（ternary 专属）。投影：每行 (a,b,c) 先**自动归一化** `s=a+b+c`、`(a/s, b/s, c/s)`，再重心坐标 → 等边三角内屏幕点。`s ≤ 0`、含负值、或**各分量有限但相加上溢 `Infinity`**（分量数量级过大、归一化系数塌成 0 会静默落原点）→ fail-loud（决策 ③：容忍任意正三元组、自动归一，非法 fail-loud；非有限单分量仍按缺失值跳过）。

```ts
// ir/coordinate.ts —— PlotCoordinate.Ternary2D = 'ternary2D'
// Ternary2DSchema: 仅 type（本轮无几何配置；分量绑定走 mark 的 a/b/c 通道、coordinate 内归一化）
// CoordinateSchema union 追加；合法 guide dimension 集（ADR-01 契约）：ternary2D = { a, b, c }

// ir/encoding.ts —— PositionEncodingSchema 加（承 ADR-01 x/y 已可选）
//   a?: ChannelSchema.optional()  b?: ...  c?: ...（ternary 必填、由 coordinate 校验）

// ir/guide.ts —— GuideDimension 加 A='a' / B='b' / C='c'
```

**mark 支持矩阵**（决策 ⑥）：本轮 **point** 为主——ternary + point = 三角内散点。`line`（连三角内点）/ `area`（三角内区域）**顺延需求驱动**；`interval` / `sector` 在 ternary **fail-loud**（无对应几何）。三角轴 guide：三条边各一刻度轴（0→100%）+ 三向网格线（平行各边的等值线）。

理由：

1. **坐标系层的标志性兑现**：3 通道 → 2D 是 ADR-01「N 通道」最强验收；ternary 证明 retikz 能做 Vega 扁平模型做不了的坐标系。
2. **自动归一化更 AI 友好**：容忍任意正三元组（不强求用户预归一），归一是 coordinate 投影内职责（几何，非 transform 数据聚合）；非法（和≤0/负）fail-loud。
3. **a/b/c 角色通道是必需**：3 个字段 x/y 装不下，承 ADR-01 的角色化加三通道，per-coordinate 校验必填。

## 待决策点 🔻

- **三角朝向**：哪个顶点对应 a/b/c、顶点朝上（▲）还是朝下（▽）？倾向**顶点朝上、a=顶点 / b=右下 / c=左下**（python-ternary / 多数惯例），写进 frame 几何常量。
- **归一化越界措辞**：`s≤0` / 含负 / 和上溢 `Infinity` → fail-loud 错误文案。落地：含负 → `ternary coordinate requires non-negative components (got …)`；`s≤0` → `requires a+b+c > 0 (got …)`；上溢 → `components overflow when summed (got …); use proportions or smaller magnitudes`。
- **三角轴刻度方向 / 标签**：每条边刻度 0→100 朝哪、标签贴边还是贴顶点？倾向**沿边等距 + 顶点旁标注分量名**（取绑定字段名）。
- **line/area 是否本轮**：ternary + line（三角内折线，如演化轨迹）做不做？倾向**顺延**（point 覆盖散点主用例）。
- **a/b/c scale 语义**：三角色 scale 是否需独立 scale（各 [0,1]）还是共用归一化？落地：**coordinate 内归一、不消费独立 scale**（domain 固定 [0,1] 占比）。`Ternary2DSchema` **本轮不暴露** `a/b/c` scale 名字段——评审指出「字段进 IR/LLM 契约却无运行效果、接受未知 scale 名静默无效」有害，故移除（多余 key 被 zod 剥离，同 polar2D 剥 x/y）；待真做 per-component scale 时再加。**注意**：位置分量绑定走 mark 的 `a/b/c` encoding 通道（保留），并入 ADR-01 数据契约（model strict / 归一化 coerce，修评审 P1）。

## DSL 表面

```tsx
// React：土壤配比三元散点（三个 continuous 字段，自动归一化）
<Plot data={soils} coordinate="ternary2D">
  <PointMark a="sand" b="silt" c="clay" color="region" />
</Plot>
```

```ts
// vanilla / 原生 IR
{ coordinate: { type: 'ternary2D' },
  marks: [{ type: 'point', encoding: { a: { field: 'sand' }, b: { field: 'silt' }, c: { field: 'clay' } } }],
  guides: [{ type: 'axis', dimension: 'a' }, { type: 'axis', dimension: 'b' }, { type: 'axis', dimension: 'c' }] }
```

## 测试设计

`packages/plot/plot/tests/ir/{coordinate,encoding,guide}.schema.test.ts`（扩）+ `tests/lower/ternary2d.test.ts`（新建）：重心投影点、自动归一化（任意正三元组 → 同一三角点）、和≤0/负 fail-loud、三角轴 guide、a/b/c 必填校验、point 散点、interval/sector fail-loud。见「测试象限」。

## 影响

- **Plot IR**：`PlotCoordinate` 加 `Ternary2D` + `Ternary2DSchema`；`PositionEncodingSchema` 加 a/b/c 可选通道；`GuideDimension` 加 A/B/C；`CoordinateSchema` union 扩；纯增量。
- **lowering**：`lower/project.ts` ternary frame（roles=[a,b,c]、重心投影 + 归一化）；`lower/layout.ts` 三角占位（正三角内接画布 + 三边留白）；`lower/guide.ts` 三角轴 + 三向网格；`lower/{expand,mark}.ts` ternary 接入 + a/b/c 必填校验 + mark 矩阵。
- **core**：无新依赖（三角点 / 三角边 / 网格下沉 core Node/Path）。
- **文档站**：坐标系页加 ternary + 三元散点 demo（ADR-04）。
- **对外 API**：`coordinate="ternary2D"` + a/b/c props（react/vanilla，ADR-04）；纯新增。

## 不在本 ADR 范围

- **ternary + line / area / interval / sector** → point 为主；line/area 顺延需求驱动，interval/sector fail-loud。
- **ternary 等值线 / 密度** → 顺延。
- **四元及以上（quaternary）** → 不做（三角是 2D 投影上限）。
- **React/vanilla 表面 + docs** → [ADR-04](./04-dsl-docs.md)。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/{coordinate,encoding,guide}.ts`（IR 契约）+ `lower/**`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/coordinate.ts` | 加 | `PlotCoordinate.Ternary2D` | `'ternary2D'` | — | 三元坐标系判别串 |
| `ir/coordinate.ts` | 加 | `Ternary2DSchema` | `z.object` | — | 仅 type（本轮无几何配置字段；多余 a/b/c key 被 zod 剥离，同 polar2D 剥 x/y） |
| `ir/coordinate.ts` | 改 | `CoordinateSchema` | `z.discriminatedUnion` | — | union 追加 Ternary2D |
| `ir/coordinate.ts` | 加 | `Ternary2DCoordinate` | `z.infer` | — | 派生类型 |
| `ir/encoding.ts` | 加 | `PositionEncodingSchema.a` | `ChannelSchema.optional()` | — | ternary a 角色通道 |
| `ir/encoding.ts` | 加 | `PositionEncodingSchema.b` | `ChannelSchema.optional()` | — | ternary b 角色通道 |
| `ir/encoding.ts` | 加 | `PositionEncodingSchema.c` | `ChannelSchema.optional()` | — | ternary c 角色通道 |
| `ir/guide.ts` | 加 | `GuideDimension.A/B/C` | `'a'/'b'/'c'` | — | 三角轴维度判别串 |

> 归一化（s=a+b+c、各除以 s）+ 越界 fail-loud（s≤0 或含负）在 lowering，不写 schema refine。

### 文件 scope

- `packages/plot/plot/src/ir/{coordinate,encoding,guide}.ts`（改）
- `packages/plot/plot/src/lower/project.ts`（改：ternary frame + 重心投影 + 归一化）
- `packages/plot/plot/src/lower/layout.ts`（改：三角占位）
- `packages/plot/plot/src/lower/guide.ts`（改：三角轴 + 三向网格）
- `packages/plot/plot/src/lower/{expand,mark}.ts`（改：ternary 接入 + a/b/c 必填 + mark 矩阵）
- `packages/plot/plot/tests/ir/{coordinate,encoding,guide}.schema.test.ts`（改）
- `packages/plot/plot/tests/lower/ternary2d.test.ts`（新建）

### 测试象限

**Happy path**：
- `ternary 重心投影`：(a,b,c) 各 1/3 → 三角中心；纯 a → a 顶点
- `自动归一化`：(1,1,1) 与 (10,10,10) → 同一三角点（中心）
- `point 散点`：多行 a/b/c → 三角内多点

**边界**：
- `单分量为 0`：(1,0,0) → a 顶点；(0,1,1) → bc 边中点
- `非归一三元组`：(50,30,20) → 归一化 (0.5,0.3,0.2) 投影

**错误路径**：
- `和为 0 fail-loud`：(0,0,0) → 抛（a+b+c>0）
- `含负 fail-loud`：(-1,1,1) → 抛
- `缺角色 fail-loud`：ternary + 只给 a/b（缺 c）→ 抛（ADR-01 必填校验）
- `interval fail-loud`：ternary + bar → 抛

**交互**：
- `ternary × projectRoles`：消费 ADR-01 roles=[a,b,c] 投影（跨 ADR 锚点）
- `ternary × color`：三元散点 + categorical color → 各点按类着色
- `三角轴 guide × 维度校验`：`dimension: 'a'/'b'/'c'` 合法、`'x'` 在 ternary fail-loud

### 依赖的现有元素

- `PlotCoordinate` / `CoordinateSchema`（`ir/coordinate.ts`）—— 扩展
- `PositionEncodingSchema`（`ir/encoding.ts`，[ADR-01](./01-coordinate-frame-roles.md) 已转 x/y 可选）—— 扩展（加 a/b/c）
- `GuideDimension`（`ir/guide.ts`）—— 扩展（加 A/B/C）
- frame `roles` / `projectRoles` + 必填角色 / 维度集校验（[ADR-01](./01-coordinate-frame-roles.md)）—— 消费（roles=[a,b,c]、合法维度 {a,b,c}）
- `computePlotArea`（`lower/layout.ts`）—— 扩展（三角占位）
- point mark 下沉（`lower/mark.ts`）—— 复用（三角内点 = 重投影 point）
