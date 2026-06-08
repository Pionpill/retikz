# ADR-01：coordinate frame N 通道泛化 + 位置 encoding 角色化 + 每坐标系维度契约 + guide 维度校验

- 状态：Accepted
- 决策日期：2026-06-08
- 关联：[plot v0.1-alpha.9 roadmap](./roadmap.md) · [plot v0 roadmap 阶段二](../../roadmap.md) · [plot-design §3.5 CoordinateSystem / §8.3 投影分层 / §3.6 Encoding](../../../../../architecture/plot-design.md) · 前身：[alpha.4 ADR-01 coordinate 抽象](../v0.1-alpha.4/01-coordinate-polar.md)（polar 逼出 frame）· 下游：[ADR-02 cartesian1D](./02-cartesian1d.md) / [ADR-03 ternary2D](./03-ternary2d.md)

## 背景

alpha.4 用 polar 逼出 coordinate frame 抽象（`CoordinateFrame` = scale 归一化 → 投影 → mark 几何的可替换中间层，[plot-design §8.3](../../../../../architecture/plot-design.md) (i) 投影整形）。但该抽象有两处「2 通道」写死，挡住 cartesian1D（1 通道）/ ternary2D（3 通道）：

1. **frame 投影写死 2 入参**：`CoordinateFrame.project: (primaryValue, secondaryValue) => [x, y] | null`（`lower/project.ts`）恰好两个位置值。cartesian1D 只投 1 个、ternary 要投 3 个（a/b/c → 重心 → 2D），签名装不下。
2. **位置 encoding 双必填 x/y、无角色通道**：`PositionEncodingSchema` 仅 `x` / `y` 且**都必填**（`ir/encoding.ts`）。polar 靠 coordinate 把 x→angle / y→radius 角色映射（未往 encoding 加 angle/radius 通道），两通道够用。但 **ternary 要绑 3 个字段、x/y 装不下**，cartesian1D 要 y 可省——**光改 `PlotCoordinate` / `GuideDimension`，数据进不了 frame**（评审 P1）。

外加一个 alpha.4 遗留的 cross-review P2 缺陷：**guide 维度不按坐标系校验**——`lowerCartesianGuide` 凡非 `x` 一律当 y 轴，`<Axis dimension="angle" />` 在 cartesian 下不被拒、渲出空刻度杂散轴线。

本 ADR 是 alpha.9 的**唯一真叶子**（同 alpha.4 ADR-01）：把 frame 从「2 通道」泛化成「N 通道角色」、把位置 encoding 从「固定 x/y」泛化成「按坐标系校验的角色绑定」、给每个坐标系一份「合法 dimension 集」契约并据此校验 guide——**不新增坐标系**（cartesian1D / ternary 各由 ADR-02 / 03 接入），只把缝切干净，cartesian / polar 零回归。

## 决策：frame 加 `roles` + `projectRoles`，位置 encoding x/y 转可选 + 按 coordinate 校验必填角色集，每坐标系声明合法 dimension 集、guide 据此 fail-loud

**(1) frame N 通道泛化**：`CoordinateFrame` 加 `roles: ReadonlyArray<DimensionRole>`（该坐标系的位置角色序）+ `projectRoles(values: ReadonlyArray<unknown>): [number, number] | null`（按 `roles` 序传值、投影成屏幕点）。cartesian/polar 的 `projectRoles` 内部解构 `[primary, secondary]` 调既有逻辑；现有 2 入参 `project` 保留为便捷别名（mark/guide 渐迁 projectRoles），**投影数值零变化**。

**(2) 位置 encoding 角色化**（评审 P1）：`PositionEncodingSchema` 的 `x` / `y` 从必填改 **可选**；新增角色通道由各坐标系 ADR 落（ternary 的 a/b/c 在 [ADR-03](./03-ternary2d.md)）。**必填性下放到 coordinate 级校验**：lowering 按坐标系要求的角色集校验 encoding，缺角色 fail-loud。本 ADR 落 cartesian2D（需 x+y）/ polar2D（需 x+y，映射 angle/radius）的必填校验——**x/y 可选是 schema 层放宽，cartesian/polar 仍强制要求**（靠 coordinate 校验，不破存量 spec）。

**(3) 每坐标系合法 dimension 集 + guide 校验**（修 cross-review P2）：每个坐标系声明 `validGuideDimensions`——cartesian2D: `{x, y}`；polar2D: `{angle, radius, x, y}`（**含 alpha.4 x/y 别名，勿删**）。`lowerGuide` 前按坐标系校验 `guide.dimension ∈ 合法集`，否则 fail-loud（清晰错误：该坐标系不支持此 dimension），消灭杂散轴线。

```ts
// lower/project.ts —— frame 泛化（概念）
export type DimensionRole = 'x' | 'y' | 'angle' | 'radius' | 'a' | 'b' | 'c';  // 随坐标系扩
export type CoordinateFrame = {
  type: CoordinateType;
  roles: ReadonlyArray<DimensionRole>;                                   // cartesian=[x,y] polar=[angle,radius] cartesian1D=[x] ternary=[a,b,c]
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  // …各坐标系自有字段（center/radius range/clip 等）
};

// ir/encoding.ts —— x/y 转可选（a/b/c 由 ADR-03 加）
// PositionEncodingSchema: { x: ChannelSchema.optional(), y: ChannelSchema.optional() }
// 必填性：lower/expand.ts 按 coordinate 校验（cartesian2D/polar2D 缺 x 或 y → fail-loud）
```

理由：

1. **N 通道角色是 1D/ternary 的前提**：不泛化 frame + encoding，cartesian1D/ternary 的数据根本进不来；这是本轮全部下游的地基（同 alpha.4 ADR-01 之于 polar）。
2. **零回归**：x/y 可选是 schema 放宽，cartesian/polar 的必填靠 coordinate 校验补回；projectRoles 包装既有投影、数值不变。存量 spec / 测试不动。
3. **fail-loud 修 P2**：维度校验消灭「cartesian 下 angle 轴渲杂散线」，且为新坐标系的维度集校验铺好框架。

## 待决策点 🔻

- **projectRoles 签名**：`ReadonlyArray<unknown>` 按 roles 序 vs `Record<DimensionRole, unknown>`。倾向**数组按序**（简单、与 roles 元信息配套；mark 按 frame.roles 取对应 encoding 通道值传入）。
- **2 入参 `project` 是否保留**：保留为便捷别名（cartesian/polar 内部 + 现有 mark 代码零改）还是全迁 projectRoles？倾向**保留别名**减小本 ADR 改动面，mark 侧逐步迁。
- **必填角色校验落点**：`lower/expand.ts` 解析 coordinate 处（建 frame 前），还是 validate 阶段？倾向 **expand 建 frame 前**，与现有 scale 绑定校验同处。
- **DimensionRole 与 GuideDimension 关系**：位置角色（投影用）与 guide dimension（轴用）是否同一套枚举？倾向**复用同名字面量**（x/y/angle/radius/a/b/c），但位置角色是 frame 内部类型、guide dimension 是 IR `GuideDimension`——值对齐、类型各自管。

## DSL 表面

> 本 ADR 不出用户表面（内部泛化）。现有 spec 零变化验证：

```ts
// cartesian / polar 现有 spec 逐字不变、行为不变（回归基准）
{ coordinate: { type: 'cartesian2D', x: 'sx', y: 'sy' }, marks: [{ type: 'point', encoding: { x: { field: 'a' }, y: { field: 'b' } } }] }
// 新行为：cartesian 下非法 guide dimension fail-loud
{ coordinate: { type: 'cartesian2D' }, guides: [{ type: 'axis', dimension: 'angle' }] }  // → 抛：cartesian2D 不支持 dimension 'angle'
// 新行为：cartesian 缺位置通道 fail-loud
{ coordinate: { type: 'cartesian2D' }, marks: [{ type: 'point', encoding: { x: { field: 'a' } } }] }  // → 抛：cartesian2D 需要 y
```

## 测试设计

`packages/plot/plot/tests/ir/encoding.schema.test.ts`（扩：x/y 可选 accept）+ `tests/lower/coordinate-frame.test.ts`（新建：projectRoles 投影、必填角色校验、guide 维度校验、cartesian/polar 回归）。具体见「测试象限」。

## 影响

- **Plot IR**：`PositionEncodingSchema` x/y 转 `.optional()`（**放宽，非 breaking**——既有带 x/y 的 spec 仍合法）；`GuideDimension` 不变（本 ADR 不加成员，ternary a/b/c 由 ADR-03）。
- **lowering**：`lower/project.ts` frame 加 `roles` + `projectRoles`；`lower/expand.ts` 加按坐标系必填角色校验 + guide 维度集校验；`lower/guide.ts` 维度校验接入。
- **core**：无影响（纯 plot 内）。
- **文档站**：本 ADR 无用户表面，不单独出 docs（维度校验的错误行为在 ADR-04 坐标系文档顺带提）。
- **对外 API**：x/y 可选（放宽）；cartesian/polar 缺位置通道 / 非法 guide 维度从「静默出怪图」变 **fail-loud**——⚠️ 行为收紧，但此前是 bug（杂散轴线 / 缺通道乱投影），修正方向，不破合法 spec。

## 不在本 ADR 范围

- **cartesian1D / ternary2D 坐标系本身** → [ADR-02](./02-cartesian1d.md) / [ADR-03](./03-ternary2d.md)。
- **a/b/c encoding 角色通道** → [ADR-03](./03-ternary2d.md)（ternary 专属）。
- **React / vanilla mark props 角色化（x/y 转可选 + a/b/c）** → [ADR-04](./04-dsl-docs.md)（schema 契约在此定、表面在 04 落）。
- **mark × 新坐标系支持矩阵** → 各坐标系 ADR + ADR-04。

---

## 实现契约（必填）🔻

### Level

`red`——动 `ir/encoding.ts`（IR 契约）+ `lower/**`。

### Schema 改动

| 文件 | 操作 | 字段名 | 类型 | 默认值 | describe 中文摘要 |
|---|---|---|---|---|---|
| `ir/encoding.ts` | 改 | `PositionEncodingSchema.x` | `ChannelSchema.optional()` | — | x 位置通道改可选（必填性下放 coordinate 校验） |
| `ir/encoding.ts` | 改 | `PositionEncodingSchema.y` | `ChannelSchema.optional()` | — | y 位置通道改可选 |

> 顶层 `.describe` 同步：从「x/y 都必填」改为「位置角色通道，必填性由坐标系决定」。无新增字段（a/b/c 在 ADR-03）。`GuideDimension` 本 ADR 不改。

### 文件 scope

- `packages/plot/plot/src/ir/encoding.ts`（改：x/y 可选 + describe）
- `packages/plot/plot/src/lower/project.ts`（改：frame 加 roles + projectRoles，cartesian/polar 实现）
- `packages/plot/plot/src/lower/expand.ts`（改：按坐标系必填角色校验 + guide 维度集校验接入）
- `packages/plot/plot/src/lower/guide.ts`（改：维度校验 / 消费坐标系合法集）
- `packages/plot/plot/tests/ir/encoding.schema.test.ts`（改）
- `packages/plot/plot/tests/lower/coordinate-frame.test.ts`（新建）

### 测试象限

**Happy path**：
- `projectRoles cartesian`：roles=[x,y]、传 [vx,vy] → 等于既有 project(vx,vy)
- `projectRoles polar`：roles=[angle,radius]、传 [va,vr] → 等于既有极坐标投影
- `cartesian/polar 现有 spec 回归`：alpha.4 既有 spec 投影点逐字不变

**边界**：
- `x/y 可选 schema accept`：encoding 只给 x（无 y）schema parse 通过（lowering 才按坐标系校验）
- `polar x/y 别名 guide`：polar 下 `dimension: 'x'` / `'angle'` 都合法（别名保留）

**错误路径**：
- `cartesian 缺 y fail-loud`：cartesian2D + encoding 只 x → 抛「需要 y」
- `cartesian 非法维度 fail-loud`：cartesian2D + `<Axis dimension="angle">` → 抛「不支持 angle」（修 P2）
- `polar 非法维度 fail-loud`：polar2D + `dimension: 'b'` → 抛

**交互**：
- `维度校验 × grid`：cartesian 非法维度轴不再渲杂散网格线（修 P2 杂散线）
- `projectRoles 供下游`：cartesian1D（[ADR-02](./02-cartesian1d.md)）/ ternary（[ADR-03](./03-ternary2d.md)）按 roles 投影的锚点（跨 ADR）

### 依赖的现有元素

- `CoordinateFrame` / `CartesianFrame` / `PolarFrame` / `createCartesianFrame` / `createPolarFrame`（`lower/project.ts`）—— 扩展（加 roles + projectRoles）
- `PositionEncodingSchema`（`ir/encoding.ts`）—— 修改（x/y 可选）
- `GuideDimension` / `lowerGuide` / guide 维度处理（`ir/guide.ts` / `lower/guide.ts`）—— 引用 + 修改（维度校验）
- coordinate 解析 / scale 绑定（`lower/expand.ts`）—— 修改（必填角色 + 维度集校验）
- alpha.4 `ResolvedCoordinateFrame` 契约（[alpha.4 ADR-01](../v0.1-alpha.4/01-coordinate-polar.md)）—— 扩展（N 通道泛化、1D/ternary 共用）
