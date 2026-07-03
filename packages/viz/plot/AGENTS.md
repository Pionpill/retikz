# @retikz/plot 工作指南

`@retikz/plot` 是 viz 组核心包：定义 Plot IR，处理 data / transform / scale / coordinate / mark / guide，并通过 composite lowering 接入 `@retikz/core`。

## 分层

```text
shared/       无依赖共享词汇、纯函数、映射和工具类型
schemas/      Zod schema 与 Plot IR 类型真源
contract/     coordinate / scale / transform / mark / channel / format / guide / locator 的扩展契约与公开类型
providers/    内置 definition、BUILTIN_*、registry resolver、dispatch / apply / resolve，以及 theme token 解析
pipeline/     Tier 2 -> Kernel IR 下沉编排，消费 providers / contract；guide / locator 等运行时编排也归这里
```

- `shared` 不依赖其他 plot 层；跨层复用的纯函数和稳定词汇优先放这里。
- `contract` 不依赖 `providers` / `pipeline`；providers 依赖 contract；pipeline 负责编排。providers 里的既有 provenance helper 依赖是历史例外，新增代码不要扩大例外。
- `schemas` 可被所有层依赖，但 schema 不读取实现层。
- `pipeline/guide` 负责 axis / legend 下沉为 Kernel IR；`contract/guide` 只放 coordinate provider 与 pipeline 共用的 guide context 类型。
- `pipeline/locator` 负责通过 lowering 流程解析 datum / series 锚点；`contract/locator` 只放公开 locator 类型。
- 模块外 import 优先走对应顶层 barrel（`../shared` / `../contract` / `../providers` / `../pipeline`）；公共 API barrel 可 deep import 做表面裁剪。
- 新共享逻辑放到最小合理归属层；多个语法层都需要时优先下沉到更底层，或上移到 `@retikz/math` / `@retikz/core`。

改上述分层、依赖方向或 define-registry 能力前，先按根 AGENTS 读取 `standard-structure` 及对应层级 skill。

## 公共能力复用

- 几何坐标类型使用 `@retikz/math` 的 `Position`。
- core IR / Scene 类型从 `@retikz/core` 获取，不在 plot 内复制。
- 有限 / 无穷数值判断、字段解析、label 格式化、scale 解析等优先使用所属模块已有 helper。
- 函数保持纯计算和 plain data；不要把 d3 scale 函数、class 实例、ReactNode 等放入 IR。

## Registry 规则

- 内置与自定义 definition 经同一 `resolveXxxRegistry` 分派，不写内置白名单分支。
- `contract/<层>` 放 `XxxDefinition`、`defineXxx`、`AnyXxxDefinition`、key extractor 和共享接口。
- `providers/<层>` 放内置 definition、注册清单和 resolve / dispatch / apply 实现。
- channel 按 `ChannelDefinitionKind` 组织内置实现；scale 只负责 scale family，不把通道消费逻辑塞进 scale。

## 公开 API

- `src/index.ts` 是包公开入口；新增公开能力必须评估 docs 同步。
- 子目录 `index.ts` 是模块边界；模块外 import 优先经过 barrel。
- 0.x 阶段可做破坏性命名 / schema 调整，但代码、测试、docs 必须一致。

## 测试

- schema / 数据契约改动：补 `tests/ir` 或 data/model 相关测试。
- lowering 行为改动：补 `tests/lower`，覆盖 IR 输出形状和边界输入。
- 坐标 / cell / mark 几何改动：补对应单测，避免只靠视觉 demo。
