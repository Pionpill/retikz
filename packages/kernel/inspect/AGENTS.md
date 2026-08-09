# @retikz/inspect 包工作指南

本包拥有宿主无关的 Inspector Definition、registry、selection、辅助编译、diagnostics、plane 与内置 Path Inspector。根入口直接依赖 `@retikz/core`、`@retikz/foundation` 和使用到的 `zod`；Render、React、Vanilla 集成必须位于独立子入口，且只作为 optional peer。

Inspector selection 是 runtime-only 数据，不进入 Core IR 或 Scene。所有辅助输出必须经 Core 隔离片段编译，并在暴露前移除公共 identity、meta 与 animation 语义。内置与第三方 Inspector 复用同一 Definition、registry、selection 和 driver 路径。
