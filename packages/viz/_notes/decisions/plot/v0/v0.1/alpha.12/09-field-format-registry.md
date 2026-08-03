# ADR-09：FieldFormat registry

状态：Superseded
替代：[Data beta.1 ADR-01](../../../../data/v0/v0.1/beta.1/01-plot-data-migration.md)；FieldFormat schema、definition 与 registry 已迁入 `@retikz/data`
发布：`@retikz/plot` `0.1.0-alpha.12`

## 背景

data 层复审后，整体数据模型并不适合全面 registry 化：字段类型、字段解析、label resolver 等仍有横切语义或函数 hook。唯一稳定适合抽象成 definition 的，是具名字段解析格式 `DataFieldFormat`。

此前内置 format 由 `coerce.ts` 中的分支处理，自定义货币、地区日期等格式只能走动态 parse 逃生舱。为补齐 data 层扩展缝，本 ADR 把字段解析格式抽成 registry。

## 决策

新增 FieldFormat runtime definition：

- `defineFieldFormat`
- `resolveFormatRegistry`
- `options.formatDefinitions`

IR 侧保留 JSON-safe 形态：内置格式仍是既有枚举 / 字符串，自定义格式通过 custom field format schema 保存格式名与配置，不保存函数。

内置 6 个 format 从 `coerce.ts` 分支降为内置注册项；自定义 format 在运行时通过 options 注入。冲突、未知 format 和解析失败按现有 fail-loud / fallback 规则处理。

由于 format 的判别是裸字符串，本 ADR 没有引入 `extractXxxKind` 之类的通用抽象，也没有做泛型擦除型 `AnyFieldFormatDefinition`。`resolveField.parse` 逃生舱保留，用于动态 / 跨源解析场景；`fieldType`、`resolveField`、`resolveLabel` 不做 registry 化。

## 最终形态

该 ADR 已在 2026-06-19 落地。自定义 format 可通过 `data.model` + `formatDefinitions` 使用。

## 影响

字段解析格式从内置 switch 收敛为 definition registry。用户可以扩展具名解析格式，而不需要绕过 data model 或在数据进入 plot 前预处理所有字段。

这个扩展点补齐了 data 层最明确、最小的 registry 缝，同时避免把所有数据解析 hook 都过度抽象成 registry。

## 不在本 ADR 范围

- `fieldType` 语义模型 registry。
- `resolveField` / `resolveLabel` 函数 hook registry 化。
- 异步数据加载与外部 I/O。
