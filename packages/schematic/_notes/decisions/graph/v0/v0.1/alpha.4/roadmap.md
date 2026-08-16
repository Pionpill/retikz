# Graph v0.1 alpha.4 Roadmap

> 状态：Accepted；Graph 公共命名与源码 owner 目录迁移

## 目标

将首批 Graph 元素从带领域前缀的实现命名调整为更准确、可扩展的领域内部功能单元命名，并让 Source IR discriminator、React / Vanilla authoring、目录 owner、测试与 docs 形成单一公共契约

## ADR

| ADR | 主题 | 依赖 | 状态 |
| --- | --- | --- | --- |
| [01](./01-graph-element-naming.md) | Entity / Relation / Container 命名与 Graph 源码 owner 迁移 | Graph alpha.1–alpha.3、Schematic Graph 完备设计 | Accepted |

## 完成标准

- `@retikz/graph`、`@retikz/graph-react`、`@retikz/graph-vanilla` 的当前公共入口只使用 `Entity`、`Relation`、`Container` 与 `GraphType`
- Source IR discriminator 为 `entity`、`relation`、`container`，namespace 仍为 `graph`
- `packages/schematic/graph/src` 完成 entity / relation / container / shared owner 重组，没有旧目录或转发 shim
- direct IR、React、Vanilla、测试、README、schema registry、双语 docs 与 SourceLinks 完成同步
- lowering、layout artifact、Scene、SVG / Canvas 语义等价，旧名称没有 alias、fallback 或兼容路由

## 边界

- 不新增 Graph 数据模型、Diagram 自动布局、routing、Editor 或新的 Graph role
- 不改变现有字段、默认值、variant recipe、layout solver 或 renderer contract
- 历史 ADR / changelog 保留历史名称作为事实记录；当前源码、测试、registry 与公共 docs 不保留旧名称
