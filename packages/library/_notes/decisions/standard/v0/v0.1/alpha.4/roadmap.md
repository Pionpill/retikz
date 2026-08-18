# Standard v0.1 alpha.4 Roadmap

> 状态：规划中。关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Graph v0.1 roadmap](../../../../../../../schematic/_notes/decisions/graph/v0/v0.1/roadmap.md)

## 版本目标

alpha.4 在 alpha.3 已迁入 Standard 的 Shape / Arrow provider 子入口上补齐通用图式形态，使直接作者与 Graph、Diagram 等 Tier 2 消费方无需重复手写 contour 或 marker 几何：

1. 增加可容纳内容并具有正确 boundary / connection envelope 的参数化梯形、平行四边形、流程图六边形与圆柱 Shape
2. 增加可复用的 bar 与 crow-foot 端点 Marker，同时沿用已有 diamond / openDiamond
3. 明确流程图六边形拥有独立的可变宽高轮廓，Core polygon 继续表达正六边形；胶囊、圆与菱形继续复用 Core 既有参数化 preset
4. 保持 `@retikz/standard/shape` 与 `@retikz/standard/arrow` 的按需导入、静态 provider contribution、Core registry / compile 与诊断主链
5. 以直接作者和 Graph 等独立消费者验证同一通用几何，不把 role、kind、predicate、direction 或领域 preset 下沉到 Standard

## 候选 ADR

| ADR                                                   | 主题                           | 状态     | 退出条件                                   |
| ----------------------------------------------------- | ------------------------------ | -------- | ------------------------------------------ |
| [ADR-01](./01-diagram-shapes-and-endpoint-markers.md) | 参数化图式 Shape 与端点 Marker | Proposed | Architecture Gate 与人工确认后进入实现准备 |

## 依赖与顺序

- Core 继续拥有 Shape / Arrow Definition、params 解析、provider dependency graph、Node / Path resolve、boundary、marker host、Scene 与 renderer
- Standard 只实现公开 Core contract 的通用 Definition 与静态 provider；Shape 与 Arrow 可以在 ADR-01 内分别实现和验证，但必须共同通过子入口、集合、provider graph 与下游消费闭环
- Graph 的 role → kind → predicate 和 Theme 设计独立演进；它只引用并贡献已注册 provider，不成为 Standard 的反向依赖

## 退出条件

- ADR-01 冻结公开名称、参数、默认值、几何不变量、失败语义与 Core / Standard / Graph 边界，并通过 Architecture Gate
- 四个 Shape 在内容外接、外轮廓、boundary、connection envelope、rotate / scale 与 Scene bounds 上一致
- 两个 Marker 在 start / end、route reverse、双端、长度 / 宽度、颜色 / opacity 与 Path shrink 上复用 Core 主链
- 单项 Definition、静态 provider、owner-local 集合、package subpath exports 与 provider dependency graph 完整闭环，无根入口聚合或全局注册
- direct IR、React、Vanilla、SSR 与至少一个 Tier 2 消费路径具备等价证据，并同步中英文文档、schema reference 与 changelog

## 非目标

- 不在 Standard 定义 Graph Entity / Relation role、kind、predicate、direction、cardinality 或 Theme selector
- 不增加 capsule、circle、diamond 等可由 Core 现有 Shape 参数化表达的重复 provider；不把 Standard hexagon 作为 Core polygon 的别名
- 不增加 Square、Bracket、Parenthesis、Hook、Rays 或组合 marker；真实消费者出现后另行评估
- 不新增 Core IR、Arrow params、Scene primitive、renderer 特判、全局 registry、自动 package discovery 或 adapter 私有几何
