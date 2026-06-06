# v0.3-alpha.4 实施待办：shape 参数化泛化（架构 + 内置形状）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`v0.3 roadmap`](../roadmap.md) · [`v0 roadmap`](../../roadmap.md) · [`core-design.md §7 AI 友好`](../../../../architecture/core-design.md) · 范式参照：[`v0.3-alpha.2 ADR-01 Tier 2 支撑`](../v0.3-alpha.2/01-tier2-support.md)（passthrough + 注册表）· 下游动机：[`plot v0.1-alpha.4`](../../../../plot/v0/v0.1/roadmap.md)（polar 扇形需可连接 sector）

## 目标

把 `Node.shape` 从**只认「name + 经 Rect 派生尺寸」**升级为**可注册的「type + 自定义参数」模型**，让任意形状（含数据驱动的扇形）携带自己的几何参数、并成为**一等可连接图元**（`boundaryPoint` / `anchor` 拿得到 shape 专属参数）。在新机制上参数化全部内置形状，并补齐 arc/sector、regular polygon、star。

**动机**：现状 `ShapeDefinition` 所有函数只收一个 `Rect`（中心+宽高+旋转，形状自由度仅 `width`/`height`/`rotate` 三个）；shape 专属参数散落 `Node` 顶层（`roundedCorners` 注释「only effective on rectangle」即不可扩展信号）。扇形需圆心+内外半径+起止角（≥4 形状自由度），装不进 `Rect`；用工厂闭包又会让参数留在编译期、不进 IR（违反 IR 100% 自描述铁律）。core 已有现成范式可复用——Tier 2 composite 的 `.passthrough()` + 编译期注册 schema 校验。

## ADR 清单

| ADR | 主题 | 内容 | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-shape-params-generalization.md) | 架构扩展：shape 参数化机制 | `Node.shape: string \| {type, ...params}`（passthrough）；泛型 `ShapeDefinition<TParams>`（`paramsSchema` + 计算函数收 `params`）；编译期 `paramsSchema.parse` 桥接；顶层参数迁移规则；现有 4 形状迁到新接口、行为等价回归 | 前置无 | Proposed |
| [02](./02-circle-ellipse.md) | circle/ellipse | ellipse 参数化（`circumscribe: 'proportional' \| 'equal'`）；`circle` 收为 `{type:'ellipse', circumscribe:'equal'}` preset 别名，几何单一实现 | ADR-01 | Proposed |
| [03](./03-arc-sector.md) | arc/sector（新增） | arc（弧）+ sector（环楔）shape；参数 `innerRadius` / `outerRadius` / `startAngle` / `endAngle`；`boundaryPoint`（质心向外求交）/ `anchor`（内外弧中点·径向边）；plot polar 扇形的下沉目标 | ADR-01 | Proposed |
| [04](./04-rectangle-polygon.md) | rectangle/polygon | rectangle 参数化（`roundedCorners` 从顶层迁入 params）；regular polygon（`sides` / `rotate`）；`diamond` 收为 `{type:'polygon', sides:4, rotate:45}` preset 别名 | ADR-01 | Proposed |
| [05](./05-star.md) | star（新增） | star shape；参数 `points` / `innerRadius` / `outerRadius` / `rotate`；`boundaryPoint` / `anchor` 据星形几何 | ADR-01 | Proposed |

## 实现顺序

```
01 架构（必做先行）
   ├─ 02 circle/ellipse  ┐
   ├─ 03 arc/sector      ├─ 并发（各形状互不依赖，均只依赖 01 的接口）
   ├─ 04 rectangle/polygon
   └─ 05 star            ┘
```

- **01 是唯一前置**：它定 `ShapeDefinition<TParams>` 接口、`Node.shape` schema、编译期 parse 桥接。02-05 都按这套接口实现各自形状的 `paramsSchema` + 几何，彼此无依赖、可并发。
- 01 自身闭环靠「现有 4 形状迁到新接口、行为等价回归」验证，不依赖任何后续形状 ADR。

## 执行模式

**01 单条串行**：架构 ADR 走完 5 阶段（设计 → 实现 → 自测 → 文档 → 收尾）、人工 review 后再开 02-05。

**02-05 并发**：01 定稿（接口冻结）后，4 个形状 ADR 可并行起草 / 实现 / 自测；各自配文档站对应页（docs `core/components/shapes/` 下 `circle-ellipse` / `arc-sector` / `rectangle-polygon` / `star` 已建目录与部分 demo）。

## 前置 setup

无新包。改动集中在 `packages/core/core/src/shapes/**`（ShapeDefinition 接口 + 各形状）、`src/ir/node.ts`（shape 字段）、`src/ir/shape.ts`（新建 ShapeRefSchema）、`src/compile/node.ts`（params 桥接）；renderer 侧按 emit 出的 primitive 消费（弧 / 多边形若需新 ScenePrimitive，在对应形状 ADR 标注）。

## 贯穿原则

- **向后兼容**：裸 `shape: 'rectangle'`（string 形式）始终合法 = 无参 shape；现有 IR / React DSL / vanilla builder 不破。
- **preset 别名**：`circle`（→ ellipse equal）、`diamond`（→ polygon 4/45）作 preset 别名保留，单一几何实现 + 旧写法兼容，与「circle 收 ellipse」同思路。
- **IR 自描述铁律**：shape params 进 IR、JSON 可序列化、编译期强校验（passthrough ≠ z.any）；不引入函数 / 闭包参数。
- **AI 友好**（core-design §7）：params 字段全 `.describe(...)`（英文）；裸字面量 `{type:'sector'}` 仍是第一形态，手写 TS 可选常量补全。

## 不在本 milestone

- **时间轴动画** → 顺延 v0.3-alpha.5（原 alpha.4，见 [v0.3 roadmap §动画 A](../roadmap.md)）。
- **grid** → 网格线 path/composite，非 Node shape，另案。
- **`@retikz/plot` polar 本体** → plot v0.1-alpha.4（本 milestone 只提供 core 侧可连接 sector 能力，plot 据此下沉）。
- **非中心对称布局的完整泛化**（圆心偏移 shape 的相对定位 / scope bbox 深度适配）→ 按需在形状 ADR 标注，超出则另开。

## ADR 约定

每个 milestone 独立编号，从 `01` 起。`roadmap.md` 可更新；`NN-*.md` ADR Accepted 后只增补状态 / supersede，不改历史决策。模板见 [`../../../_template.md`](../../../_template.md)。
