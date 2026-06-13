# v0.3-alpha.4 实施待办：shape 参数化泛化（架构 + 内置形状）

> milestone 执行路线。长期决策放同目录 `NN-*.md` ADR；本文件可更新。
> 关联：[`v0.3 roadmap`](../roadmap.md) · [`v0 roadmap`](../../roadmap.md) · [`core-design.md §7 AI 友好`](../../../../architecture/core-design.md) · 范式参照：[`v0.3-alpha.2 ADR-01 Tier 2 支撑`](../alpha.2/01-tier2-support.md)（passthrough + 注册表）· 下游动机：[`plot v0.1-alpha.4`](../../../../plot/v0/v0.1/roadmap.md)（polar 扇形需可连接 sector）

> **2026-06-07 封板**：ADR-01~08 全部 Accepted；绿灯关全过（core 1870 / react 341 / render 87 / vanilla 56 测试，4 包 `tsc --noEmit` + `pnpm lint` 全绿），changelog 入库，随 `v0.3.0-alpha.4` 发布。后续含 ADR-06 连接面、ADR-07 统一圆角 `cornerRadius`（rename `roundedCorners`）、ADR-08 `meta` provenance（原计划 01~05 之外的收尾增补）。

## 目标

把 `Node.shape` 从**只认「name + 经 Rect 派生尺寸」**升级为**可注册的「type + 自定义参数」模型**，让任意形状（含数据驱动的扇形）携带自己的几何参数、并成为**一等可连接图元**（`boundaryPoint` / `anchor` 拿得到 shape 专属参数）。在新机制上参数化全部内置形状，并补齐 arc/sector、regular polygon、star。

**动机**：现状 `ShapeDefinition` 所有函数只收一个 `Rect`（中心+宽高+旋转，形状自由度仅 `width`/`height`/`rotate` 三个）；shape 专属参数散落 `Node` 顶层（`roundedCorners` 注释「only effective on rectangle」即不可扩展信号）。扇形需圆心+内外半径+起止角（≥4 形状自由度），装不进 `Rect`；用工厂闭包又会让参数留在编译期、不进 IR（违反 IR 100% 自描述铁律）。core 已有现成范式可复用——Tier 2 composite 的 `.passthrough()` + 编译期注册 schema 校验。

## ADR 清单

| ADR | 主题 | 内容 | 依赖 | 状态 |
|---|---|---|---|---|
| [01](./01-shape-params-generalization.md) | 架构扩展：shape 参数化机制 | `Node.shape: string \| {type, ...params}`（passthrough）；泛型 `ShapeDefinition<TParams>`（`paramsSchema` + 计算函数收 `params`）；编译期 `paramsSchema.parse` 桥接；顶层参数迁移规则；现有 4 形状迁到新接口、行为等价回归 | 前置无 | Accepted |
| [02](./02-circle-ellipse.md) | circle/ellipse | ellipse 参数化（`circumscribe: 'proportional' \| 'equal'`）；`circle` 收为 `{type:'ellipse', circumscribe:'equal'}` preset 别名，几何单一实现 | ADR-01 | Accepted |
| [03](./03-arc-sector.md) | arc/sector（新增） | arc（弧）+ sector（环楔）shape；参数 `innerRadius` / `outerRadius` / `startAngle` / `endAngle`；`boundaryPoint`（质心向外求交）/ `anchor`（内外弧中点·径向边）；plot polar 扇形的下沉目标 | ADR-01 | Accepted |
| [04](./04-rectangle-polygon.md) | rectangle/polygon | rectangle 参数化（`roundedCorners` 从顶层迁入 params）；regular polygon（`sides` / `rotate`）；`diamond` 收为 `{type:'polygon', sides:4, rotate:45}` preset 别名 | ADR-01 | Accepted |
| [05](./05-star.md) | star（新增） | star shape；参数 `points` / `innerRadius` / `outerRadius` / `rotate`；`boundaryPoint` / `anchor` 据星形几何 | ADR-01 | Accepted |
| [06](./06-connection-surface.md) | 连接面解耦（新增） | 连接面独立于视觉 `shape`：`Node.boundary`（默认）+ edge 端点 `boundary`（覆盖）；取值 = 保留字 `'shape'` / `'circle'` ∪ 借用已注册 shape（含 `{type,params}`）；core 借内置 `rectangle` / `ellipse` def 喂 AABB、layout-neutral；默认 `'shape'` 逐字段等价现状 | ADR-01（借 ADR-02 rect/ellipse） | Accepted |
| [07](./07-corner-rounding.md) | 统一圆角（新增） | `cornerRadius` 统一命名（rename `roundedCorners`）；新建 rounded-contour 模块（轮廓=line/arc 段 → fillet → emit + ray∩轮廓 boundary）；rectangle/polygon/star/sector 全覆盖，连接感知倒角；rectangle emit 保 RectPrim；r=0 等价现状 | ADR-01/03/04/05（各形状几何就绪）+ ADR-06（boundaryPoint=连接面） | Accepted |
| [08](./08-meta-provenance.md) | IR `meta` provenance 透传（新增） | Node / Scope / Path 加可选 `meta`（复用 `JsonObjectSchema`）；compile 沿 alpha.3 `id`-stamp 同款通路把 `meta` 原样 stamp 进 emit 图元（`ScenePrimitive` 加 `meta?`）；renderer 忽略、layout-neutral；不进 every-X 默认 / 不跨 scope 继承；Coordinate 不加（产 0 图元）。plot lowering 据此把 datum/series/layer 来源带进 Scene 供交互命中 | [alpha.3 水合 ADR-01](../alpha.3/01-hydration.md)（`id`-stamp 机制先例）；正交于 01-07 | Accepted |

## 实现顺序

```
01 架构（必做先行）
   ├─ 02 circle/ellipse  ┐
   ├─ 03 arc/sector      ├─ 并发（各形状互不依赖，均只依赖 01 的接口）
   ├─ 04 rectangle/polygon
   └─ 05 star            ┘
06 连接面解耦（依赖 01 接口 + 借 02 的 rect/ellipse def，可与 02-05 并发起草、实现待 02 就绪）
07 统一圆角（依赖 03/04/05 各形状几何 + 06 的 boundaryPoint=连接面语义；收尾期接入）
08 meta provenance 透传（完全正交于 shape 线，依赖 alpha.3 id-stamp 机制；plot 驱动的收尾增补，可独立实现）
```

- **01 是唯一前置**：它定 `ShapeDefinition<TParams>` 接口、`Node.shape` schema、编译期 parse 桥接。02-05 都按这套接口实现各自形状的 `paramsSchema` + 几何，彼此无依赖、可并发。
- 01 自身闭环靠「现有 4 形状迁到新接口、行为等价回归」验证，不依赖任何后续形状 ADR。
- **06 正交于 02-05**：连接面是独立轴（`Node.boundary` + edge `boundary`），机制只依赖 01 的擦除注册表 + `circumscribe` AABB 契约；其 `rectangle` / `ellipse` 借用依赖 02 的 def 就绪。默认 `'shape'` 逐字段等价现状，不阻塞其它形状 ADR。
- **07 收尾接入**：统一圆角依赖 03/04/05 各形状几何就绪 + 06 把 `boundaryPoint` 定为连接面（圆角要让它感知）；新建 rounded-contour 模块统管 fillet + emit + ray∩轮廓 boundary，四形状委托。`cornerRadius=0` 逐字段等价现状，纯增量。
- **08 完全正交于 shape 线**：`meta` provenance 透传与形状几何无关，纯沿 [alpha.3 水合](../alpha.3/01-hydration.md)的 `id`-stamp 通路加一个兄弟字段（Node/Scope/Path 加 `meta` → compile 同点 stamp 进 Scene 图元 → renderer 忽略）。plot 把 datum/series/layer 来源带进 Scene 供交互命中的 core 侧能力；不依赖 01-07，可独立实现 / 排期。

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
