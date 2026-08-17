# Layout v0.1 alpha.1 Roadmap

> 状态：已完成；ADR-01 为 Accepted。关联：[Layout v0.1 roadmap](../roadmap.md) · [Layout 布局库设计](../../../../../architecture/layout-library-design.md) · [Standard alpha.2 roadmap](../../../../standard/v0/v0.1/alpha.2/roadmap.md) · [Standard alpha.3 roadmap](../../../../standard/v0/v0.1/alpha.3/roadmap.md)

## 目标

建立可发布的 Layout foundation，并把当前由 Standard 拥有的排版布局能力迁入独立 owner。迁移保持组件名称、布局输入、默认值、求解结果、artifact 几何与失败语义；canonical package、Definition 与 adapter namespace 从 Standard 改为 Layout。

## ADR

| ADR                                 | 主题                                     | 依赖                                                                   | 状态     |
| ----------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------- | -------- |
| [01](./01-layout-package-family.md) | Package family、owner 迁移与 composition | Core layout-aware contract；Standard alpha.2；Graph public composition | Accepted |

## 完成标准

- `@retikz/layout`、`@retikz/layout-react`、`@retikz/layout-vanilla` 形成独立 lockstep release group
- FlexLayout、GridLayout、OverlayLayout、LayoutItem、artifact 与 inspector 只从 Layout family 导出
- canonical composite / adapter identity 切换为 `layout.*Layout`，Standard 不保留旧 namespace
- 根入口、`/compose`、`/inspect` 形成职责分离的公开面，且不暴露整个内部实现
- Standard Legend、Graph 与其它真实消费方只依赖 Layout 公共 composition，不 deep import 或复制 solver
- 直接 IR、React 与 Vanilla 保持 canonical IR、Definition、Scene、artifact 与诊断等价
- Standard 与 Layout 的 exports、schema registry、tests、docs 和 package metadata 无双真源
- 文档站以 Library 为顶级模块，按 `Standard · 拓展`、`Layout · 布局` 顺序提供独立页面和 changelog
- Standard alpha.2 ADR-01～07 标记由 Layout ADR Superseded；ADR-08 保留既有历史状态，ADR-09～10 继续 Accepted
