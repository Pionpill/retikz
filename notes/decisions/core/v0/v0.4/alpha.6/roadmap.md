# v0.4.0-alpha.6 路线：Ribbon 可变宽度路径

## 目标

alpha.6 聚焦 `ribbon`：为 plot 桑基图提供 core 级可变宽度路径能力。`Ribbon` 在 IR 中是一类 path-like 图元，但编译后 lower 为闭合的 `PathPrim`，由现有 SVG / Canvas renderer 按普通填充路径渲染。

## 决策列表

| ADR | 状态 | 主题 | 说明 |
| --- | --- | --- | --- |
| [ADR-01](./01-ribbon.md) | Proposed | Ribbon 可变宽度路径 | 新增 `type: "ribbon"`，支持线性 / 分段 / profile 宽度规则，编译为填充 path |
| [ADR-02](./02-ribbon-boundary-and-alignment.md) | Proposed | Ribbon 边界与对齐增强 | 补充单侧对齐、端面、显式 upper/lower 边界模式、采样策略与几何诊断 |

## 验收清单

- [ ] `@retikz/core` schema 支持 `Ribbon` IR，并保持 JSON 可序列化。
- [ ] `Ribbon` 编译输出普通闭合 `PathPrim`，renderer 不新增 primitive。
- [ ] 宽度规则支持固定宽度、起止线性变化、分段 stops 与 registry profile。
- [ ] React / Vanilla 暴露与 core IR 对齐的入口。
- [ ] 文档落在 `apps/docs/src/contents/core/components/draw/ribbon`，中英文同步，并包含 Sankey-like demo。
- [ ] 测试覆盖 schema、lowering、错误诊断、profile registry、paint 交互和文档 demo 入口。
- [ ] `Ribbon` 支持单侧对齐和端面控制，仍 lower 为普通 `PathPrim`。
- [ ] `Ribbon` 支持显式 upper/lower 边界模式，用于中心线 + width 无法表达的非对称流带。
- [ ] `Ribbon` 采样与几何诊断具备可扩展入口，避免急弯 / 宽带异常静默产生难以排查的几何。
