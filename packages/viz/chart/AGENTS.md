# @retikz/chart 工作指南

全仓通用规则见根 [`AGENTS.md`](../../../AGENTS.md)，viz 分组规则见 [`../AGENTS.md`](../AGENTS.md)，长期模型见 [`Chart 总设计`](../_notes/architecture/chart-design.md)。

## 包职责契约

- **解决的问题**：用稳定 family 帮助人类、文档和 LLM 分类，再把具体 chartType 的精确高层意图解析为完整 `IRPlot`
- **拥有的契约**：Chart Source shell、逐 chartType 精确 schema、recipe / mark / Theme Definition、shared scaffold、built-in semantic mark、recipe-local Chart mark binding、Chart shell / recipe Theme、presentation 与内部 Chart 汇合结果，以及当前 compile 边界的 active provider registry
- **不拥有的能力**：Plot mark / scale / coordinate / composition / guide schema 与 registry、Plot lowering / identity / provenance / lineage / locator / diagnostics、Data 算法、Standard / Layout lowering、Vanilla Input / normalize、React authoring、Core compile、renderer
- **输入与输出**：接收精确 Chart Source IR，按 `namespace + type + recipe.chartType` 查找 Definition 并 parse 一次，输出完整 `IRPlot` 与 Chart presentation 所需的内部结果
- **缺口流向**：数据能力下沉 `@retikz/data`；GoG operation 与 lowering 进入 `@retikz/plot`；通用布局进入 Layout owner；跨领域 presentation composite 进入 `@retikz/standard`；React / Vanilla authoring 进入对应 adapter

## Source IR

- 根字段固定为必需 `namespace`、`type`、`data`、`recipe`，以及可选 `id`、`presentation`、`theme`、`layout`、`plotExtension`
- `namespace` 精确为 `chart`；`type` 是 family，`recipe.chartType` 是全局唯一 recipe key
- 每个 chartType 必须唯一属于一个 family；family mismatch 定位到 `type` / `recipe.chartType` 并 fail-loud
- `layout` 只拥有 Chart 外部 `width` / `height`，不得承载 Plot facet、track、coordinate、guide 或内部尺寸
- `recipe` 必填并包含精确 `encodings`、可选 `properties` 与有序 `marks`
- `plotExtension` 可省略且只保存用户显式声明的 Plot-owned fragment；不得承载 data、layout、Chart encodings / properties 或 recipe 生成内容
- normalizer 不创建用户未声明的 `plotExtension`，也不得把 recipe 展开的 `IRPlot` 作为 Source IR
- 完全底层 authoring 直接使用 Plot，不保留公开 `type: 'base'`、旧 `config`、`chartThemeTokens` 别名、fallback、migration 或新旧双轨
- inspection、文档预览与序列化展示精简 Chart Source IR，不以内部 Base / resolved Plot IR 代替

## 精确 schema 与扩展

- 稳定泛型结构只用于表达共同字段布局，不得成为接受所有 chartType 字段的开放宽 `ChartSchema`
- 每个 chartType 独立拥有 strict `XxxChartSchema`、`XxxChartEncodingsSchema`、`XxxChartPropertiesSchema` 与精确 recipe theme schema
- encodings 只接受 field-bound 数据角色，不接受常量；properties 只接受当前 recipe 的常量表现或行为，不接受字段绑定
- 原子 schema 按稳定语义、不变量与真实复用边界提取，不建立包含所有可选字段的 `SharedChartEncodingsSchema` / `SharedChartPropertiesSchema`
- 与 Plot 语义和值域完全一致的字段直接复用 Plot 权威原子；Chart 只拥有领域收窄、recipe 默认和 Chart-specific 组合
- `OpenString` 只开放 family、chartType、mark 等注册 key；未知 key、未知 payload、Definition 缺失、重复注册与未消费字段必须 fail-loud
- 内置 chartType 使用同一 package-internal Definition、active provider registry、精确 schema、resolve 与诊断路径；Chart 不提供第三方 recipe Definition 注册入口。应用层负责动态 family / chartType catalog、模块加载与 JSON 路由，复杂自定义图形直接使用 Plot
- unknown JSON 只在 Source schema / registry 边界 parse 一次；进入 resolver 后使用明确类型，不重新探测对象结构

## 源码组织

- `point`、`bar`、`line`、`relation` 等 family 直接作为 `src` 一级 owner；当前只创建已经实现的 family，不预建空目录
- 每个 family 闭合自己的 key、真实共享 schema / scaffold / mark 与测试；具体 chartType 子目录再闭合 recipe schema、recipe Theme、semantic mark 与 provider
- `_chart` 承载 Chart vocabulary、精确 Source schema、recipe / mark / Theme contract、已选 recipe 的 Chart resolve、presentation、完整 `IRPlot` 生成与 active provider aggregation
- `_chart/providers` 只合并当前 Core compile 边界显式贡献的 recipe / Theme Definition，并创建临时精确 schema union、Chart composite Definition 与 provider；recipe / mark Definition 仅为包内实现契约，concrete provider contribution 才是公开 authoring/runtime contract；不维护全局 builtins、family catalog 或动态应用层路由
- `point`、`bar`、`line`、`relation` 等一级 family 只负责分类词汇与真实共享部分；具体 chartType 子目录各自拥有 `XxxChartSchema`、recipe、Theme、semantic mark 与 provider contribution
- family 只依赖 `_chart` 的 contract 与 schema factory；family 之间不得 deep import；新增 family 不修改通用 Source resolve，只增加自己的具体 chartType provider 与入口

## Recipe、Mark 与 Plot

- 每个 recipe 同时生成 shared scaffold 与 built-in semantic mark
- built-in semantic mark 可以按稳定顺序 lower 为一个或多个 Plot mark，不得被约束为单个 Plot mark
- 所有生成的 Point / Path / Interval 等继续进入 Plot 正式 schema、resolve、lowering、identity、provenance、lineage、locator 与 diagnostics 主链
- `recipe.marks` 是 Chart authoring mark；mark Definition 只拥有唯一 kind、精确 payload schema 与到 Plot target 的解析能力
- 每个 recipe 通过有序 binding 单向声明允许的 mark 及可继承的 encoding / property slot；不得在 mark Definition 维护按 chartType 展开的反向继承表
- mark 自身显式内容只覆盖该 mark 的继承结果，不改写 built-in semantic mark 或其它 mark
- recipe 内建 mark 按 recipe 顺序生成，`recipe.marks` 按数组顺序追加
- PointMark 等 Plot target 只有通过 Chart mark 入口时继承 Chart context；`plotExtension.marks` 始终保持纯 Plot 语义
- facet / track 由 composition owner 消费，不向普通 mark 广播
- Chart 不通过同名字段 spread 传递 encodings / properties；每个 slot 必须有明确 owner、consumer、目标和失败行为
- recipe `consumes` 必须贴近实际 resolver 显式维护，不从 schema 全字段推导；mark binding 只在对应 authored mark 出现时成为 active consumer
- `plotExtension` 的单值结构、具名集合、mark 数组与 identity 冲突分别沿 Plot 正式 replace、merge、append 与 fail-loud 语义处理

## 默认与优先级

- built-in slot 按 recipe fallback → Core style theme chain → authored named/base chain → inline theme → properties → encodings 解析
- authored Chart mark 按 mark schema default → resolved recipe theme → inherited properties → inherited encodings → mark 显式内容解析
- properties 与 encodings 映射到同一目标 slot 时 encoding 胜出；不相关字段不得通过全局 last-wins 相互覆盖
- `plotExtension.marks` 与 built-in / Chart marks 相加，不参与逐 slot 覆盖
- `false`、`0`、空数组与 schema 允许的空字符串必须按字段存在性保留，不使用 truthy fallback
- schema 接受但整张 Chart 没有合法 consumer 的字段必须诊断，不得静默丢弃

## Presentation 与 Theme

- presentation 只接受唯一 title、subtitle、note、source，并固定按 title → subtitle → plot → note → source 生成
- JSON 属性顺序、Vanilla 对象构造顺序与 React marker 顺序不改变 presentation
- 当前不接受 authored order、position、任意 child 或多 Plot placeholder；自由顺序必须另建显式有序契约
- `theme` 接受注册主题名，或带可选 base 的 authored `chart` / `plot` / `recipe` token slice
- Chart shell token 只拥有 canvas、padding、presentation；Plot token 交给 Plot owner；recipe token 由当前 chartType Definition 提供精确 schema
- 注册 Theme Definition 可以保存多个 chartType recipe slice；单个 Source IR 只解析当前 chartType 的 inline recipe slice
- 不同 owner 只复用 Core paint、opacity、font、spacing 等 value atom，不合并 token key、definition、preset 或 resolver
- 完整 resolved token map、Theme Definition 与 resolver 状态不得写回 Source IR

## Adapter 边界

- Vanilla 拥有 TypeScript-only Chart Input 与 Input-to-Source-IR normalize；normalize 不读取 registry、Theme、data、host 或 DOM
- React 只把 props、marker 与 children 映射为同一 Vanilla Input，不直接查找 recipe、解析 Theme 或生成 Plot IR
- 具体组件 / factory 可以从入口身份推断 family 与 chartType，但 JSON、Vanilla 与 React 最终必须生成同一精确 Source IR
- React Chart mark children 按 authored order 写入 `recipe.marks`；presentation marker 仍按固定语义顺序解析
- adapter 不因 chartType、theme 名或 mark type 复制默认、registry、lowering、identity 或 renderer 逻辑

## 不支持边界

- 当前不设计多 Chart composition、concat、repeat 或自由 presentation 顺序
- 不把函数、ReactNode、Definition 实例、provider 实例或宿主运行时状态写入 IR
- 具体 chartType subpath 公开可组合的 Core provider contribution；不公开 provider 实例、active registry 或内部 Base identity
- 下层 capability 不足时先补正确 owner 或登记缺口，不在 Chart、adapter 或 renderer 中建立平行能力
