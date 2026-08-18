# ADR-06：transform registry

状态：Accepted
决策日期：2026-06-18
关联：[plot v0.1-alpha.12 roadmap](./roadmap.md) · [ADR-01 bin / aggregate](./01-bin-aggregate.md) · [ADR-02 derive / normalize / jitter](./02-derive-normalize-jitter.md) · [ADR-05 coordinate registry](./05-coordinate-registry.md) · [ADR-07 scale registry](./07-scale-registry.md)

## 背景

旧 transform 层把内置 transform 写进两处并行 switch：`applyTransforms` 执行数据变换，`collectTransformFields` 声明输入 / 输出字段。新增统计能力时必须同步修改两处，而且用户无法注册 regression、kde、boxplot 等长尾统计变换。

transform 是 grammar-of-graphics 的 Statistics 层，长尾需求明确，因此与 ADR-03 mark registry 不同，本 ADR 在内部 registry 收敛的同时开放公开扩展点。

## 决策

区分两层概念：

- **transform operation**：`spec.transform[i]` 的纯 JSON `{ kind, ...config }`，进入 IR，可由 `<Transform>` 或 `dataTransforms` 写入。
- **transform definition**：运行时 `{ schema, inputFields?, outputFields?, apply }` 对象，经 `options.transformDefinitions` 注入，不进入 IR。

内置 transform 降为内置 `TransformDefinition`，自定义 transform 通过 `defineTransform` 注册。registry 以 schema 中的 `kind` literal 提取注册键，内置为底，自定义合并；重复 kind 或未注册 kind 均 fail-loud。

`inputFields` 与 `outputFields` 拆开声明，字段契约成为 strict model 的一部分：读取的源字段必须存在；产出且会被下游消费的字段必须登记为 output，否则 strict model 应提前报错。

`apply(rows, operation, context)` 必须纯且确定。`TransformContext` 提供 provenance helper：保行数 transform 自动保留 source index；改行数 transform 用 `groupProvenance` 挂组级来源；生成行 transform 可自然降级为仅有 transformed index。

IR schema 继续静态化：内置 transform 是闭合 union；未知非内置 kind 由 passthrough custom operation 接纳，并在 lowering 期按 definition schema 校验。custom passthrough 必须排除内置 kind，避免内置错误配置绕过静态校验。

## 最终形态

- transform 执行与字段收集都从 registry 查表，不再维护并行 switch。
- root lowering 与 locator 共用同一 transform registry 和 canonical rows。
- React `<Transform kind="...">` 与 `dataTransforms` 接受内置和自定义 operation；definition 单独从 `<Plot transformDefinitions>` 透传。
- `transformDefinitions` 不与 core `Scope.transforms` 或 plot `dataTransforms` 混名。

## 影响

- `@retikz/data` 公开共享 `defineTransform`、definition / registry 与 pipeline；`@retikz/plot` 组合 Data 内置、Plot 内置和用户 definitions。
- 自定义统计 transform 可通过 runtime options 注入，IR 仍 100% JSON-safe。
- locator 与渲染使用同一 transform registry，避免交互与画面不一致。
- 后续 ADR-15/16 的 mark-local transform 与统计代数复用本 registry。

## 长期边界

- 不新增具体 regression / kde / boxplot 等统计 transform。
- 不允许自定义覆盖内置 kind；冲突直接抛错。
- 不引入全局 `registerTransform()` 单例。
- 不公开跨运行时 definition schema 注册中心。

最终 owner 边界由 [beta.1 ADR-02](../beta.1/02-plot-transform-registration.md) 固定：通用 transform 属于 Data，`stack` / `bin` / `normalize` / `derive-interval` / `relate` / `jitter` / `density` / `smooth` 属于 Plot。
