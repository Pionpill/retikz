# library 内部文档

这里放 Library 分组的内部协作文档。`@retikz/standard`、`@retikz/standard-react` 与 `@retikz/standard-vanilla` 计划作为独立 `standard` release group 维护；在 npm package 初始化前，它们不是当前发布配置的一部分。

## 目录

- [`architecture/`](./architecture)：Standard Drawing Library 的长期边界与准入标准

## 当前入口

- [`architecture/standard-library-design.md`](./architecture/standard-library-design.md)：Standard 包家族、Core 扩展机制与领域包的边界

具体能力、package manifest、版本、release group 与公开 API 由对应能力 ADR 决定；分组初始化本身不建立 milestone 或 ADR。

跨包能力边界以根 [`notes/architecture/capability-design.md`](../../../notes/architecture/capability-design.md) 为准。
