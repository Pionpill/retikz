---
name: standard-pipeline-compile
description: Use when changing retikz pipeline or compile code, lowering, registry consumption, compile options, plot expand stages, core compileToScene behavior, ResolvedXxx types, warnings, or IR-to-primitive/Kernel-IR orchestration.
---

# Standard Pipeline Compile

`pipeline/` 和 `compile/` 是编排与消费层。它们接收 IR 和 options，解析 registry，执行 lowering / emit，输出 Kernel IR 或 Scene primitive；不要在这里发明 schema 或 provider 的平行规则。

## pipeline

`pipeline/` 偏 Tier 2 到 Kernel IR 的 lowering 编排，例如 plot：

- 读取 plot schema 类型。
- 调用各层 `resolveXxxRegistry()`。
- 组织 data / scale / coordinate / transform / mark / guide 的阶段顺序。
- 输出 core Kernel IR。

具体规则应回到拥有概念的层：schema 形态回 `schemas`，能力协议回 `contract`，内置实现回 `providers`，通用纯函数回 `shared`。

## compile

`compile/` 偏 Kernel IR 到 Scene primitive 的确定性编译，例如 core：

- 解析 registry options。
- 解析坐标、路径、节点、样式继承和命名空间。
- 收集 warning。
- 输出 renderer-agnostic Scene primitive。

`compileToScene` 必须保持纯函数：相同 IR + 相同 options 得到相同 Scene。不要使用 `Math.random()`、`Date.now()` 或 module-level mutable state 影响输出。

## Public options

- core compile options 用能力复数名：`shapes`、`boundaries`、`clips`、`arrows`、`patterns`、`pathGenerators`、`pathKinds`、`composites`。
- plot 新增 registry option 优先用 `xxxDefinitions`；既有 `coordinates` 是历史例外，除非保持同一能力兼容，否则不要复制。
- options 只传 definition 或编排策略，不传函数进 IR schema。

## Registry 消费

- pipeline / compile 调用 provider resolver 后消费解析结果。
- 不复制内置白名单，不在消费侧重新分叉“内置 vs 自定义”。
- 未注册 provider 名通常在 pipeline / compile 阶段 fail-loud 或 warning，schema 层只保证 JSON 形态。
- fallback 策略写成明确的 lookup 规则，并允许用户 definition 参与同一优先级模型。

## 命名

- `ResolvedXxx` 表示已经经过归一化、查表、默认值处理、资源引用或扩展展开后的消费形态。
- 如果类型仍对应用户 IR / schema 输入，命名为 `IRXxx`。
- warning code 用 const object enum + `XxxValue` 派生，message 写当前契约，不写内部调试故事。
- lowering stage helper 用动词短语命名，例如 `resolveXxx`、`lowerXxx`、`emitXxx`、`collectXxx`。

## 迁移判断

- 如果 pipeline / compile 里出现跨能力复用纯函数，优先抽到 `shared`。
- 如果出现“内置项如何工作”的逻辑，优先放回 `providers`。
- 如果出现“用户如何定义能力”的逻辑，优先放回 `contract`。
- 如果出现“IR 字段是否合法”的逻辑，优先放回 `schemas`；只有跨字段运行时上下文规则留在 pipeline / compile。

## 改代码前检查

1. 这段代码是在编排/消费，还是在定义 schema / contract / provider？
2. registry 是否只通过 resolver 消费？
3. 是否保持确定性和无全局可变输出状态？
4. 新 option 名是否符合 core 复数名或 plot `xxxDefinitions` 规则？
5. `ResolvedXxx` 是否真的不是原始 IR 输入？
