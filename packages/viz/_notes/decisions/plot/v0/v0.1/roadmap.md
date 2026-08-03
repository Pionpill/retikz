# plot v0.1 Roadmap

> 状态：Done
> 关联：[`plot v0 roadmap`](../roadmap.md) · [`plot-design.md`](../../../../architecture/plot-design.md)

## 定位

v0.1 建立 `@retikz/plot` 的完整静态图形语法，以 renderer-agnostic 的 `IRPlotSpec` 表达 Data、Aesthetics、Geometry、Statistics、Scales、Coordinates、Coordinate composition 与 Theme，并统一降低为 Kernel IR。`@retikz/plot-react` 与 `@retikz/plot-vanilla` 从首个 alpha 起与 plot lockstep，分别提供 React composition DSL 与 framework-free authoring / embed / SSR 表面。

交互、增量更新、依赖失效、按需物化与 renderer diff 不属于 v0.1，进入后续版本线。

## Alpha milestones

| Milestone | 长期能力                                                                           | ADR                                                                           |
| --------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| alpha.1   | `IRPlotSpec`、数据引用、scale / coordinate / mark 骨架、lowering 与 adapter 入口   | [`alpha.1`](./alpha.1/roadmap.md)（8）                                        |
| alpha.2   | axis / grid guide、plot area 与 guide lowering                                     | [`alpha.2`](./alpha.2/roadmap.md)（5）                                        |
| alpha.3   | band / time / color scale、interval、relation 与 transform                         | [`alpha.3`](./alpha.3/roadmap.md)（7）                                        |
| alpha.4   | polar coordinate、sector / continuous geometry 与 polar guide                      | [`alpha.4`](./alpha.4/roadmap.md)（5）                                        |
| alpha.5   | scope identity、datum locator 与可引用几何                                         | [`alpha.5`](./alpha.5/roadmap.md)（2）                                        |
| alpha.6   | 字段语义类型、scale 选型、field / format / robustness                              | [`alpha.6`](./alpha.6/roadmap.md)（9）                                        |
| alpha.7   | continuous scale family 与 size / color / opacity / shape channel                  | [`alpha.7`](./alpha.7/roadmap.md)（5）                                        |
| alpha.8   | continuous / discretization color scale 与 legend                                  | [`alpha.8`](./alpha.8/roadmap.md)（3）                                        |
| alpha.9   | 1D / ternary coordinate、frame role 与 coordinate DSL                              | [`alpha.9`](./alpha.9/roadmap.md)（5；ternary2D 后由 beta.2 移除）            |
| alpha.10  | 薄 Plot container 与 composable authoring                                          | [`alpha.10`](./alpha.10/roadmap.md)（2）                                      |
| alpha.11  | 坐标无关 cell geometry，以及 rect / rule / text / ribbon 早期表面                  | [`alpha.11`](./alpha.11/roadmap.md)（5）                                      |
| alpha.12  | transform / scale / coordinate / mark / channel registry，抽象 mark 表面与统计代数 | [`alpha.12`](./alpha.12/roadmap.md)（16）                                     |
| alpha.13  | relation ribbon、quantile / density / smooth、stat-geom、label 与 sector pull      | [`alpha.13`](./alpha.13/roadmap.md)（7）                                      |
| alpha.14  | coordinate composition、facet / overlay / scaffold / track 与 guide 路由           | [`alpha.14`](./alpha.14/roadmap.md)（9；ADR-01～08 被 ADR-09 的统一结构替代） |
| alpha.15  | guide / theme、axis layout、palette / legend、decoration 与 layer zIndex           | [`alpha.15`](./alpha.15/roadmap.md)（12）                                     |

## Beta 与 stable 收口

- **beta.1**：把通用数据模型、字段解析、format、statistics 与 transform registry 迁入独立 `@retikz/data`；Plot 只保留图形语法拥有的 transform 与 lowering 语义
- **beta.2**：统一 `IRPlotXxx` 公共类型命名，补齐 runtime-only lineage，统一 React / Vanilla authoring normalization，收敛 Vanilla plain API，并从内置坐标集合移除未达到 stable 质量的 ternary2D
- **RC / Stable**：冻结三包公共面后继续修复自有键读取、声明类型依赖、自定义坐标开放路径、size scale 消歧与字段尺寸校验等兼容性问题；最终 `0.1.0` 以 npm `latest` 发布，annotated tag 为 `plot-v0.1.0`

## Stable 契约

- `@retikz/plot` 拥有 `IRPlotSpec`、Plot-only definitions / registries、lowering、locator 与 Plot lineage
- 通用数据 IR、外部数据集、字段 / format、共享 transform 与 Data lineage 从 `@retikz/data` 导入
- React 与 Vanilla 只装配或消费同一份 canonical `IRPlotSpec`，不建立平行 IR、builder 或 renderer 语义
- 内置坐标为 cartesian2D、polar2D、cartesian1D 与 polar1D；其它坐标通过公开 registry 扩展
- 交互与增量运行时能力继续复用 Kernel runtime，并在后续版本中另行设计

## 验证策略

- Plot schema、definition / registry、transform、lowering、lineage、locator 与 adapter 等价性测试
- React / Vanilla 公共表面、SSR、embed 与真实 renderer 输出验证
- Data / Plot 边界、公开导出、声明产物与 clean-consumer 安装验证
- 双语文档、changelog 与公开 API 契约对账
