# Data 能力完备设计

> **状态：长期架构真源，不跟随单个版本维护功能清单。** 本文定义 `@retikz/data` 的能力完备目标和检测方法。总纲见 [`notes/architecture/capability-design.md`](../../../../notes/architecture/capability-design.md)，当前包职责与公开契约以就近 `AGENTS.md`、Accepted ADR 和代码为准。本文只讨论宿主无关的数据能力，不覆盖 plot encoding / scale / mark、业务数据源 SDK、数据库接入或 UI dataflow runtime。

---

## 1. 定位与问题边界

`@retikz/data` 是 viz 组的通用数据层，解决不同可视化宿主反复定义数据模型、字段解析、transform、statistics、输入格式解析和 lineage 的问题。

它的完备方向是 **Data Complete**：

> 在宿主无关的数据边界内，新增同类数据语义时，应能通过统一的 JSON-safe schema、definition / registry 和 data pipeline 扩展，并产出可被 plot、chart、table 或 geo 复用的数据视图与 lineage，不要求宿主复制算法或私造数据契约。

Data Complete 不代表内置所有 ETL、数据库连接器或高频流式计算。它保证的是可移植数据表达与扩展闭环。

## 2. 包角色

| 角色              | 包                       | 责任                                                                                                                                 |
| ----------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| 主责包            | `@retikz/data`           | 数据 schema、字段与值类型、通用 transform / statistics / field-format contract、内置 providers、apply pipeline、lineage / provenance |
| 宿主包            | `@retikz/plot` 等        | 组合 Data IR，注册宿主特有 definition，消费 data view；不复制通用算法                                                                |
| authoring adapter | React / Vanilla adapters | 暴露宿主数据入口和 runtime data 注入；不拥有 transform 语义                                                                          |

宿主特有 transform 可以由宿主包实现，但必须复用 `@retikz/data` 的 definition、registry 和 apply contract。只有依赖 Plot mark、scale、coordinate 等语义的操作才属于 plot-specific definition；通用 row / field 运算仍应回到 data。

## 3. 能力面

| 能力面                   | 目标                                                             | 不属于 data 的情况                        |
| ------------------------ | ---------------------------------------------------------------- | ----------------------------------------- |
| Data Model               | 定义 JSON-safe row、scalar、dataset reference 与外部数据注入边界 | 业务实体模型、数据库 schema、权限模型     |
| Field                    | 统一字段路径、字段解析、字段类型和缺失值边界                     | 视觉 channel、scale domain 选择           |
| Transform                | 用可扩展 operation 把输入 rows 变成带字段类型证据的数据视图      | core geometry transform、UI state update  |
| Statistics               | 提供宿主无关的聚合、统计计算与输出描述契约                       | 只服务某个 mark 几何的布局算法            |
| Field Format / Parsing   | 定义字段输入格式、值解析 / coercion 与自定义 parser 接入         | axis / legend 的展示 formatter 与视觉样式 |
| Lineage / Provenance     | 保留 source identity、transform steps 和派生关系                 | plot mark / series / scope locator        |
| Validation / Diagnostics | 校验数据与 operation，并提供可定位错误                           | 业务质量治理平台、远程观测系统            |

这些是检测维度，不要求一一对应目录；代码仍按 `schemas / contract / providers / pipeline / shared` 分层。

## 4. 准入原则

### 4.1 是否属于 data

属于 data 的能力通常满足：

- 能被多个数据宿主复用，不依赖 plot mark、scale、coordinate 或 renderer。
- 输入输出是 JSON-safe 数据或通过 options 注入的 runtime definition。
- 可以通过稳定 operation / definition 表达，并由 data pipeline 消费。
- operation discriminator复用Foundation开放字符串schema；内置key只提供常用提示，custom Definition与内置能力共用registry、config校验和pipeline。
- 不依赖 React、DOM、Canvas、SVG 或业务数据源 SDK。

依赖可视化语义的操作留在 plot；数据库连接、权限和远程缓存留在应用或数据源 adapter。

### 4.2 是否需要新数据底座

现有 Data IR、field helper、transform / statistics / format definition 可以组合时，优先组合。只有出现以下情况才增加底座：

- 多个宿主重复实现同一 row / field 算法或 operation schema。
- 自定义数据能力无法通过现有 definition / registry 接入。
- transform / reducer无法声明preserve或replace output model、scalar outputs、schedule field effect与闭合phase，导致宿主只能猜测派生字段。
- lineage 无法表达必要的 source 或 derived 关系。
- 缺口迫使宿主复制通用数据模型或 apply pipeline。

### 4.3 是否形成闭环

```text
schema 可表达
contract 可扩展
provider 可内置
registry 可合并
pipeline 可消费并逐步产出 `{ rows, fieldTypes, fieldTypeEvidence }`
output model 与实际 rows / lineage 一致
lineage / diagnostics 可追踪
宿主可复用
tests 可锁定
docs / notes 可解释
```

只在 plot 内写出一个 transform、只导出 schema、只返回rows却丢失派生字段证据，或只有内置operation而没有自定义入口，都不算 Data Complete。

## 5. 设计检查模板

```md
## Data 完备性检查

- 能力面：
- 解决的数据问题：
- 是否宿主无关：
- 是否可由现有能力组合：
- 是否需要新 schema / contract / definition：
- 内置与自定义是否同 registry / pipeline：
- lineage / diagnostics：
- plot / chart / table 等宿主如何消费：
- 不支持边界：
- 本轮结论：
```

## 6. 与现有设计的关系

- `packages/viz/data/AGENTS.md` 是包内硬约束。
- `standard-structure` 与适用的 `standard-*` skills 决定代码落层。
- data roadmap / ADR 记录具体版本决策。
- Plot Visualization Complete 把 Data Complete 作为上游依赖，不重新拥有通用数据语义。

本文只定义 `@retikz/data` 的长期能力边界；具体内置 transform 数量、发布节奏和宿主迁移顺序由 roadmap / ADR 决定。
