# @retikz/plot 工作指南

`@retikz/plot` 是 plot 分组的核心包：定义 Plot IR，处理 data / transform / scale / coordinate / mark / guide，并通过 composite lowering 接入 `@retikz/core`。

## 目录结构与模块依赖

可扩展的图形语法层（coordinate / scale / transform / mark）按「抽象 vs 实现」拆成两处顶层目录：

- `contract/<层>`：扩展契约（核心抽象）——`XxxDefinition` 类型、`defineXxx` 工厂、`AnyXxxDefinition` 宽类型、`extractXxxKey`、层共享接口类型。不依赖具体内置（运行时零依赖 providers）。
- `providers/<层>`：内置实现——各内置 definition、`BUILTIN_*` 清单、`resolveXxxRegistry`（先注册内置、再合并自定义）、dispatch / apply / resolve 编排与 impl builder。

内置与自定义 definition 经同一 `resolveXxxRegistry` 分派，杜绝「内置白名单 + 扩展补丁接口」分叉。依赖方向 **`contract` ← `providers` ← `pipeline`**（providers 依赖 contract，pipeline 编排 providers）。

```text
schemas       Zod schema / 类型真源（Plot IR 形状），所有模块可依赖
data          字段对齐 / 解析 / 归一化
contract/*    coordinate / scale / transform / mark 的扩展契约
providers/*   上述四层的内置实现，依赖 contract
guide         axis / legend 下沉
pipeline      Tier 2 → Kernel IR 下沉编排，调 providers + contract
interaction   locator / hit-test，复用 pipeline
```

- `contract` / `providers` 各有顶层 `index.ts` barrel；**模块外 import 一律走 `../contract` / `../providers`，不深入到子模块**（如 `../contract/scale`）。
- `schemas` 是 Zod schema / 类型真源，所有模块都可以依赖 `schemas`。下游可依赖上游；上游不要反向读取下游实现。
- `pipeline` 是编排层（Tier 2 → Kernel IR 下沉），调用各层 `resolveXxxRegistry` + dispatch 函数；具体规则应放回拥有该概念的层。
- 新增共享逻辑先放到最小合理归属层；多个语法层都需要时优先抽到更底层或 `@retikz/math` / `@retikz/core`。

### data / guide / interaction 暂无 define 机制

`data` / `guide` / `interaction` 目前**还没有 `defineXxx` / `resolveXxxRegistry` 扩展机制**——早期设计未细化到这一层，按当前需要先保留为内部实现，不进 `contract` / `providers`。后续按需逐步把它们抽象成 contract/providers 对的可扩展层（与 coordinate / scale / transform / mark 对齐）。新增这类抽象前先评估是否值得开放给用户扩展，再补 `defineXxx` + registry + `lowerPlots` 选项 + React 透传四件套。

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
