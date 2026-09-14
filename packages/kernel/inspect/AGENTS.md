# @retikz/inspect 包工作指南

本包拥有宿主无关的 Inspector Definition、registry、selection、辅助编译、diagnostics、plane 与内置 Path / Node / Scope / Coordinate / Clip 检查。输入是 Core 最终观测事实与运行时选择，输出是隔离、只读的辅助 Scene；不拥有几何求解、主图排版、renderer 语义或 Layout 专业检查，缺口分别归 Core / Math、Render 与 Layout。

根入口直接依赖 `@retikz/core`、`@retikz/foundation`、`@retikz/math` 和使用到的 `zod`；React、Vanilla 集成位于独立子入口，Render 适配仅供包内宿主接线使用，不公开子入口；宿主依赖只作为 optional peer。

Inspector selection 是 runtime-only 数据，不进入 Core IR 或 Scene。所有辅助输出必须经 Core 隔离片段编译，并在暴露前移除公共 identity、meta 与 animation 语义。内置与第三方 Inspector 复用同一 Definition、registry、selection 和 driver 路径。
