# chart v0.1-alpha.1 Roadmap：Scatter & Points

> alpha.1 以 ADR-09 规定的 family、recipe、mark、Theme、provider 与 Plot 出口作为当前基础设施总决策，先闭环 Point family 的可发布能力，再按 capability gate 处理后续 chartType。当前只确认 `scatter` 已实现；其它 Point chartType 与 `regression`、`ranged-dot`、`strip` 仍 planned / gated，milestone 尚未完成
>
> 关联：[`chart v0.1 roadmap`](../roadmap.md) · [`Chart 总设计`](../../../../../architecture/chart-design.md) · [`Chart 封装完备设计`](../../../../../architecture/chart-encapsulation-complete.md) · [`Plot 可视化完备设计`](../../../../../architecture/plot-visualization-complete.md)

## 1. Milestone 目标与当前状态

alpha.1 要证明 Point family 可以在精确 Source、recipe、Plot lowering、Standard presentation、三入口 adapter 与 compile-bound provider contributions 之间形成同一条长期主链：

1. root `type` 选择 `point` family，`recipe.chartType` 选择当前精确 recipe
2. `recipe.encodings` 只保存字段名，`recipe.properties` 只保存常量，`recipe.marks` 只使用当前 recipe 允许的 `scatter` kind
3. Scatter recipe 生成 Point semantic mark
4. authored `recipe.marks` 按数组顺序追加，`plotExtension.marks` 最后追加且不继承 Chart slots
5. Theme 使用 Chart、Plot、recipe 三个 owner slice，并按 Core mode / style、named/base chain、inline tokens 的固定顺序级联
6. provider graph、Standard Surface 与 Plot 出口组成 renderer-neutral 的唯一结果；React、Vanilla、JSON 与 SSR 复用同一精确 Source、active provider 与 resolver 主链

当前状态是进行中：Point family 的 Scatter recipe 已形成实现闭环；ADR-05 及其它未实现 chartType 仍为 deferred / gated；ADR-06、ADR-07、ADR-08 的依赖 gate 继续保留。不能因为基础设施或单个 recipe 已可消费就宣称整个 alpha.1 完成

## 2. ADR-01～03 与 ADR-09 的关系

ADR-09 是当前 family / recipe Chart 基础设施的总决策。早期 ADR-01～03 中与 Source shell、recipe 分发、Theme owner、公开入口和 presentation 组合有关的部分，以 ADR-09 的长期契约为准；仍与当前实现一致的 Plot lower、Vanilla normalize、React 复用 Vanilla、Standard presentation 边界继续保留

| ADR | 当前长期边界                                                                                                                                          | 状态             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 01  | 保留 Chart → Plot 正式主链、精确 schema parse、resolve 与 provider 责任；family / chartType 选择由应用层承担，active provider 只服务当前 compile 边界 | Superseded       |
| 02  | 采用 `tokens.chart`、`tokens.plot`、`tokens.recipe` 三个 owner slice 与 Core mode / style cascade                                                     | Superseded       |
| 03  | 保留 Source、Vanilla Input、React adapter 与 Standard presentation 的边界；presentation 固定 title → subtitle → plot → note → source                  | Superseded       |
| 04  | Point family 的 Scatter recipe、Point semantic mark 与 Chart mark contract                                                                            | Proposed         |
| 05  | Point family 的 Connected Scatter Path → Point recipe 与 `order` 失败语义                                                                             | deferred / gated |
| 06  | Regression 的 transform output reservation 依赖                                                                                                       | planned / gated  |
| 07  | Ranged Dot 的 row atomicity 依赖                                                                                                                      | planned / gated  |
| 08  | Strip 的 position-offset 依赖                                                                                                                         | planned / gated  |
| 09  | family、recipe、mark Source IR、Theme、registry 与 provider 的当前基础设施总决策                                                                      | Accepted         |

## 3. 当前 Source 与解析主链

alpha.1 的 Source root 固定为：

```text
namespace, type, id?, presentation?, theme?, data, layout?, recipe, plotExtension?
```

其中 `type` 是 family，Point family 使用 `point`；`recipe` 固定包含：

```text
chartType, encodings, properties?, marks?
```

`recipe.chartType` 是全局唯一 recipe key。`encodings` 的每个值都是字段名，`properties` 的每个值都是常量；当前 Scatter 要求 `x` / `y` 字段。`layout.width` / `layout.height` 是整张 Chart 的 border-box allocation，不复制进 Plot

`plotExtension` 只保存用户显式声明的 Plot fragment。它不承载 recipe 展开结果，显式 Plot mark 也不继承 Chart encodings 或 properties。解析顺序固定为：

```text
application-owned family / chartType route
  -> exact Source parse
  -> Theme cascade
  -> recipe scaffold + semantic mark
  -> authored Chart marks
  -> explicit Plot fragment
  -> complete Plot + fixed presentation / Surface composition
```

Scatter 的包内 Definition 与 concrete provider contribution 共同描述当前 recipe；provider 在当前 Core compile 边界汇合 active contribution，建立临时 recipe registry 与精确 schema union，再沿同一 parse / resolve path 消费。应用层负责动态 family / chartType catalog、模块加载与 JSON 路由；Chart 不提供全局 catalog、全局 parse/router 或第三方 recipe / chartType 注册入口

## 4. Point family 当前契约

| chartType | Source 要求                                        | semantic mark | 当前状态 |
| --------- | -------------------------------------------------- | ------------- | -------- |
| `scatter` | `x`、`y`；可选 Point field roles 与常量 properties | 一个 Point    | 已实现   |

当前唯一已实现的 Scatter recipe 允许有序 `recipe.marks`，其中只有 `scatter` mark，用于表达额外 Point authored mark。mark 省略的 slot 只从当前 binding 声明的 Chart context 继承，显式 mark payload 覆盖继承值。React `ScatterMark` 是该 Chart mark 的 marker，Vanilla 使用同形 plain input；它不改变 semantic recipe，也不写入 Plot mark authoring surface。作者需要 Path 等非 Scatter 图元时通过 `plotExtension.marks` 显式添加

component props 与 `recipe.properties` 都只调整内建 semantic recipe 的常量表现；React、Vanilla 与手写 JSON 最终必须得到同一 Source。Plot 的直接 `marks` 始终是最后追加的独立内容

## 5. Theme、presentation 与空间边界

Theme 接受命名主题，或 `{ base?, tokens?: { chart?, plot?, recipe? } }`。Chart shell 从 Core mode 的完整 fallback 开始，依次应用 Core style chain、authored named/base chain 与 inline slices；Chart slice 负责 canvas、padding、presentation，Plot slice 交给 Plot owner，recipe slice 由当前 recipe 的 overrides / resolution schema 负责。省略 recipe slice 时使用该 recipe 的显式 fallback

presentation 只生成唯一的 title、subtitle、note、source，并固定按 `title → subtitle → plot → note → source` 排列。Standard Surface 包含完整 Chart border-box 与 Plot；Chart 不预估文字尺寸、不复制 Plot intrinsic size，也不把 host viewport 尺寸写回 Source

Chart、Plot 与 Standard 的 identity / provenance / lineage / locator 沿同一结果传递。Chart 只拥有外层 identity 与 delegation，不复制 Plot 的 registry、scale、guide、composition 或 spatial locator

## 6. Provider 与 adapter gates

provider graph 与 Standard Surface gate 已闭环，Scatter 的 concrete provider contribution 可以在当前 Core compile 边界声明并解析 family、recipe、mark、Theme 与 Plot / Surface 依赖。公开入口只编排这条 provider pipeline：

- Scatter 的包内 Definition 声明精确 schema、recipe Theme、scaffold、semantic mark 与允许的 Chart mark binding
- concrete provider contribution 安装该 Definition；当前 Core compile 边界拒绝重复 chartType、family mismatch、未知 base 与依赖缺失
- 应用层负责动态 family / chartType catalog、模块加载与 JSON 路由；Chart 不提供第三方 recipe / chartType 注册入口

React 只收集 props、marker 与 children 并映射到 Vanilla Input；Vanilla 只把 typed Input normalize 为 Source；JSON、Vanilla、React 与 SSR 不各自实现 dispatch、默认或 Theme resolve，动态 JSON 路由由应用层负责

## 7. 仍保留的 capability gates

### 7.1 ADR-06：Regression transform output reservation

Regression 只有在 Data / Plot 为所需 transform 提供统一的 output reservation、冲突 preflight 与 fail-loud 语义后，才能进入可执行 recipe。Chart 不维护私有 transform 名单或预扫描数据

### 7.2 ADR-07：Ranged Dot row atomicity

Ranged Dot 只有在 Plot 提供共享 row 的复合 mark 原子角色校验后，才能进入可执行 recipe。缺值跳过与 field / coordinate 诊断继续由 Plot 正式数据与坐标契约负责，Chart 不 reshape rows

### 7.3 ADR-08：Strip position-offset

Strip 需要 Plot 在分类 band 内消费独立数据驱动 offset，并在坐标投影与 Point lowering 之间保持坐标系无关的 channel contract。该 capability 未闭环前，不实现 `strip` 的公开 recipe，不以 renderer 特判或 Chart 私有位移替代

## 8. alpha.1 退出条件

alpha.1 结束前必须同时满足：

1. 当前 alpha.1 的 Scatter 有稳定的 Source schema、recipe、semantic mark、mark contract、concrete provider contribution 与三入口等价性；Regression、Ranged Dot 与 Strip 在各自 capability gate 解除前不计入 active chartType
2. 应用层 family → chartType discovery 与 JSON 路由、active provider 的精确 Source parse、Theme cascade、slot consumer、mark inheritance 与 Plot composition 形成清晰边界；Chart runtime 不维护全局 catalog
3. semantic mark → authored Chart marks → explicit Plot marks 的顺序、继承、覆盖、identity、provenance、lineage 与 locator 语义稳定
4. Core mode / style、Chart / Plot / recipe Theme slices、固定 presentation 顺序与 Chart border-box layout 形成完整 renderer-neutral 结果
5. React、Vanilla、JSON、SSR 与 Scatter 的 concrete provider contribution 复用同一 provider / adapter 主链；未知 family、未安装 chartType、mark、Theme、字段绑定错误与依赖缺失都在对应 owner 边界 fail-loud
6. docs、schema discovery 与示例只展示已实现 recipe，planned / gated 类型明确标识未完成边界

当前 alpha.1 仍处于进行中；Regression、Ranged Dot 或 Strip 的 gate 未解除前，不更新为完成状态
