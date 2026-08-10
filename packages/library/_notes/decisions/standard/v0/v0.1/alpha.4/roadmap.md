# Standard v0.1 alpha.4 Roadmap

> 状态：已完成。关联：[Standard v0.1 roadmap](../roadmap.md) · [Standard 拓展库设计](../../../../../architecture/standard-library-design.md) · [Layout alpha.1 ADR-01](../../../../layout/v0/v0.1/alpha.1/01-layout-package-family.md)

## 目标

让 Standard 回归横向绘图拓展边界：配合 Layout v0.1 alpha.1 移除 FlexLayout、GridLayout、OverlayLayout、LayoutItem、Layout artifact、Layout Inspector 与对应 adapter / docs owner，并让仍需排版的 Legend 只组合 Layout 公共 capability。

本 milestone 不复制 Layout 的 schema、solver 或迁移契约。现行布局 owner、canonical namespace、公共入口和兼容性统一由 Layout alpha.1 ADR-01 冻结。

## 迁移边界

- Standard 三包不保留 Layout re-export、alias、Definition、adapter 或 `standard.*Layout` namespace
- `@retikz/standard/layout` 与 Standard `/inspect` 中的 Layout 能力移除
- Legend、Axes、Grid、Frame 等 Standard presentation 继续属于 Standard；其中只有 Legend 按需依赖 `@retikz/layout/compose`
- Standard alpha.2 ADR-01～07 原地标记 Superseded；ADR-08 保持既有历史状态；ADR-09～10 继续 Accepted
- Standard alpha.3 ADR-06 的直接 Definition loading 原则继续生效
- 文档站进入 Library 顶级模块的 `Standard · 拓展` 分组，并与 `Layout · 布局` 分别维护 changelog

## 完成标准

- Standard 三包源码、exports、schema registry、tests、metadata 与 docs 中不存在 Layout owner 或旧 namespace
- Standard 对 Layout 的依赖只经过公开根入口或 `/compose`，无 deep import、复制 solver 或隐式注册
- Legend 的输入、Definition loading、Scene、artifact 与失败语义除 owner dependency 外保持不变
- 下游直接使用 Layout 的包改为声明 `@retikz/layout` 依赖，不通过 Standard 转手
- Standard 与 Layout release group、package export 和文档 changelog 切片彼此独立
