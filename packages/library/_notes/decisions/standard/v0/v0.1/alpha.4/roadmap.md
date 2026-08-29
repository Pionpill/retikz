# Standard v0.1 alpha.4 Roadmap

> 状态：已完成。参数化 Shape 与端点 Marker 已形成公开 Definition、provider 与领域消费闭环。关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md)

## 目标

在 `@retikz/standard/shape` 与 `@retikz/standard/arrow` 提供可跨领域复用的图式几何，使直接作者与 Graph、Diagram 等 Tier 2 消费方无需重复手写 contour 或 marker：

- 增加梯形、平行四边形、长六边形、圆柱与椭圆端胶囊
- 增加 bar、crow-foot、kite、square 及其 open 变体，并把 diamond 修订为 TikZ 扁菱形
- 统一内容外接、boundary、connection envelope、Scene bounds 与 Core marker host
- 保持按需子入口、静态 provider contribution 和 Core registry / compile 主链

## ADR

| ADR                                                   | 长期决策                       | 状态     |
| ----------------------------------------------------- | ------------------------------ | -------- |
| [ADR-01](./01-diagram-shapes-and-endpoint-markers.md) | 参数化图式 Shape 与端点 Marker | Accepted |

## 已交付边界

- Shape 的名称、参数、默认、几何不变量与失败语义由 Standard 拥有
- Core 继续拥有 Shape / Arrow Definition contract、provider registry、Node / Path resolve、boundary、marker host、Scene 与 renderer
- 长六边形表达固定肩深的可变宽高轮廓，不是 Core polygon 别名
- `ellipticCapsule` 表达独立 capDepth 的半椭圆端外轮廓，不是 rounded rectangle 别名
- Marker 复用 Core 的 start / end 放置、route reverse、Path shrink、颜色与 opacity
- Graph 等领域包只引用和贡献 provider，不把 role、kind、predicate、direction、cardinality 或 Theme selector 下沉到 Standard
- 不新增 Core IR、renderer 分支、全局 registry、自动 package discovery 或 adapter 私有几何
- 未纳入的 Shape / Marker 在出现真实消费者后另行评估
