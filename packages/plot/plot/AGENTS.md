# @retikz/plot 工作指南

`@retikz/plot` 是 plot 分组的核心包：定义 Plot IR，处理 data / transform / scale / coordinate / mark / guide，并通过 composite lowering 接入 `@retikz/core`。

## 目录结构与模块依赖

可扩展的图形语法层（coordinate / scale / transform / mark）按「抽象 vs 实现」拆成两处顶层目录：

- `contract/<层>`：扩展契约（核心抽象）——`XxxDefinition` 类型、`defineXxx` 工厂、`AnyXxxDefinition` 宽类型、`extractXxxKey`、层共享接口类型。不依赖具体内置（运行时零依赖 providers）。
- `providers/<层>`：内置实现——各内置 definition、`BUILTIN_*` 清单、`resolveXxxRegistry`（先注册内置、再合并自定义）、dispatch / apply / resolve 编排与 impl builder。

内置与自定义 definition 经同一 `resolveXxxRegistry` 分派，杜绝「内置白名单 + 扩展补丁接口」分叉。依赖方向 **`contract` ← `providers` ← `pipeline`**（providers 依赖 contract，pipeline 编排 providers）。

- **`contract` 是最底层抽象，不得 import `providers` / `features`**：层共享接口类型（`PositionScale` / `TickSet` / channel resolver 函数类型 / `MarkChannels` / `IntervalContext` / `FieldCollector` / `ParsedFieldValue` 等）都定义在 `contract`，由 `providers` / `features` 反向 import；concrete 实现（如 `CartesianCoordinateFrame`）与按 type 收窄的 `isXxxCoordinateFrame` 守卫归 `providers`。`CoordinateFrame` 是抽象能力契约（基座），内置帧是它的结构子类型。
- **已知残留反向边（infra，待下沉评估）**：`CoordinateResolveContext`（`contract/coordinate/define.ts`）与 `MarkProvenance`（经 `contract/mark.ts` 引用）仍引用 pipeline 注入的基础设施 `Margins` / `LegendReserve` / `ProvenanceContext` / `DatumIdRegistrar` 及 guide 下沉的 `GuideContext` / `LoweredGuide`。这些是 pipeline/feature 注入给 definition 的上下文，不是语法层契约，暂保留为带注释的残留边，不强行搬进 contract。

```text
schemas         Zod schema / 类型真源（Plot IR 形状），所有模块可依赖
contract/*      coordinate / scale / transform / mark / format 的扩展契约
providers/*     上述五层的内置实现，依赖 contract（format 内置 def 复用 features/data 的 coerce 工具）
features/*      内置、不可扩展的特性子系统：data（字段对齐 / 解析 / 归一化）、guide（axis / legend 下沉）、interaction（locator / hit-test）
pipeline        Tier 2 → Kernel IR 下沉编排，调 providers + contract + features
```

- **`features/*`**：不属于 contract（抽象）/ providers（可扩展内置）/ schemas / pipeline 的核心特性逻辑各自成块——`data` / `guide` / `interaction`。它们是必须但**还没有 define 扩展机制**的内置子系统（见下）。
- `contract` / `providers` / `features` 各有顶层 `index.ts` barrel；**模块外 import 一律走 `../contract` / `../providers` / `../features`，不深入到子模块**（如 `../contract/scale`、`../features/guide/guide`）。`features` 内部子系统之间可直接相邻 import（如 `interaction/locate` 读 `../data`），不绕自身 barrel。例外：包**公共 API barrel**（`src/index.ts`）按需 deep-import 子路径做表面裁剪（如只暴露 `./features/data/resolve` / `./features/interaction/locate`，不整桶导出 features 内部），与它对 `pipeline` 的处理一致。
- `schemas` 是 Zod schema / 类型真源，所有模块都可以依赖 `schemas`。下游可依赖上游；上游不要反向读取下游实现。
- `pipeline` 是编排层（Tier 2 → Kernel IR 下沉），调用各层 `resolveXxxRegistry` + dispatch 函数；具体规则应放回拥有该概念的层。
- 新增共享逻辑先放到最小合理归属层；多个语法层都需要时优先抽到更底层或 `@retikz/math` / `@retikz/core`。

### features/* 暂无 define 机制；data 的可扩展缝 format 已抽走（ADR-09）

`features/data` / `features/guide` / `features/interaction` 是必须但**还没有 `defineXxx` / `resolveXxxRegistry` 扩展机制**的内置子系统——它们不是 contract/providers 那种「内置 ∪ 自定义同表分派」的可扩展语法层，早期设计未细化到这一层，先作为内部实现归在 `features/`。后续某层确认值得开放扩展时，再把它从 `features/` 抽成 contract/providers 对（补 `defineXxx` + registry + `lowerPlots` 选项 + React 透传四件套）。

已有先例：`features/data` 里唯一的具名解析枚举——字段解析格式 `format`——已按 ADR-09 抽成 `contract/format` + `providers/format`（与 coordinate / scale / transform / mark 对齐）；`data` 余下部分（`DataModel`/`FieldDef` 声明式配置、infer→coerce→normalize→validate 固定管线、`resolveField`/`resolveLabel` 函数逃生舱、`fieldType` 横切概念轴）都不是 registry 形状，**刻意留在 `features/data`**。

## 公共能力复用

- 几何坐标类型使用 `@retikz/math` 的 `Position`。
- core IR / Scene 类型从 `@retikz/core` 获取，不在 plot 内复制。
- 有限 / 无穷数值判断从 `@retikz/math` 的 `isFiniteNumber` / `isInfiniteNumber` 获取；字段解析、label 格式化、scale 解析等使用所属模块已有 helper。
- 函数保持纯计算和 plain data；不要把 d3 scale 函数、class 实例、ReactNode 等放入 IR。

## 公开 API

- `src/index.ts` 是包公开入口；新增公开能力必须明确评估文档同步。
- 子目录 `index.ts` 是模块边界；模块外 import 优先经过该 barrel。
- 破坏性命名 / schema 改动在 0.x 阶段允许，但必须保持代码、测试、docs 一致。

## 测试

- schema / 数据契约改动：补 `tests/ir` 或 data/model 相关测试。
- lowering 行为改动：补 `tests/lower`，优先覆盖 IR 输出形状和边界输入。
- 坐标 / cell 几何改动：补 coordinate / cell 相关测试，避免只靠视觉 demo。
