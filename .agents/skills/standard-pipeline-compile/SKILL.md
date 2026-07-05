---
name: standard-pipeline-compile
description: Use when changing retikz pipeline or compile code, lowering, registry consumption, compile options, plot expand stages, core compileToScene behavior, ResolvedXxx types, warnings, or IR-to-primitive/Kernel-IR orchestration.
---

# Standard Pipeline Compile

`pipeline/` 和 `compile/` 是编排与消费层。它们接收 IR 和 options，解析 registry，执行 lowering / emit，输出 Kernel IR 或 Scene primitive；不要在这里发明 schema 或 provider 的平行规则。

## 分工

- `pipeline/`：Tier 2 到 Kernel IR 的 lowering 编排，例如 plot 的 data / scale / coordinate / transform / mark / guide 阶段。
- `compile/`：Kernel IR 到 Scene primitive 的确定性编译，例如 core 的 registry options、坐标、路径、节点、样式继承、命名空间和 warning。

具体规则回到拥有概念的层：schema 形态回 `schemas`，能力协议回 `contract`，内置实现回 `providers`，通用纯函数回 `shared`，字符串 / DSL / Sugar shorthand 到 IR 的 eager 解析回 `parsers`。

## 确定性

`compileToScene` 必须保持纯函数：相同 IR + 相同 options 得到相同 Scene。不要用 `Math.random()`、`Date.now()` 或 module-level mutable state 影响输出。

## Public options

- core compile options 用能力复数名：`shapes`、`boundaries`、`clips`、`arrows`、`patterns`、`pathGenerators`、`pathKinds`、`composites`。
- plot 新增 registry option 优先用 `xxxDefinitions`；既有 `coordinates` 是历史例外，除非保持同一能力兼容，否则不要复制。
- options 只传 definition 或编排策略，不传函数进 IR schema。

## Registry 消费

- pipeline / compile 调 provider resolver 后消费解析结果。
- 不复制内置白名单，不在消费侧重新分叉“内置 vs 自定义”。
- 未注册 provider 名通常在 pipeline / compile 阶段 fail-loud 或 warning；schema 层只保证 JSON 形态。
- fallback 策略写成明确 lookup 规则，并允许用户 definition 参与同一优先级模型。

## 命名

- `ResolvedXxx` 表示已归一化、查表、默认值处理、资源引用或扩展展开后的消费形态；原始 schema 输入仍叫 `IRXxx`。
- warning code 用 const object enum + `XxxValue` 派生；message 写当前契约，不写内部调试故事。
- lowering stage helper 用动词短语命名：`resolveXxx`、`lowerXxx`、`emitXxx`、`collectXxx`。

### Compile 函数动词

- `createXxx` 创建 context、cache、资源表或 synthetic 结构；不查 provider，不注册。
- `resolveXxx` 把 IR / options 解析成编译期消费值；可查 registry、套默认值、parse、warn / throw；不产出 primitive。
- `resolveXxxRegistry` 只用于 provider registry 合并。
- `lowerXxx` 把高层语义降成低层 IR、命令或 transform；不产出 primitive / resource。
- `layoutXxx` 度量或计算 layout 数据；可调用 `resolveXxx`；不写 namespace，不产出 primitive。
- `emitXxx` 把 layout / lowered result / provider output 转成 Scene primitive 或 resource。
- `collectXxx` 只收集派生数据；最多追加到显式传入的 collection。
- `registerXxx` 写 namespace、registry 或 cache；有写入副作用才用。
- `lookupXxx` 只读查表；可 fail loud，不写入。
- `normalizeXxx` 纯规范化输入；不查 registry / namespace，不 warn。
- `filterXxx` 过滤非法项；可 warn，不改写合法项。
- `computeXxx` 纯计算；不 lookup、不 warn、不 mutation。
- `formatXxx` 只格式化字符串。
- 避免 `processXxx` / `handleXxx` / `doXxx`；`compileXxx` 只用于跨 register / resolve / layout / emit 多阶段的 orchestration 入口。

## Core compile 文件结构

- `compile.ts` 只放 `CompileOptions`、`compileToScene` 和顶层编排；node/path/ribbon/scope 细节下沉到对应模块。
- 目录级 `index.ts` 只做稳定入口导出，不承载大型实现。
- 大型 emitter 按 `types.ts` / `emit.ts` / 能力 helper 拆分；普通 path emitter 不继续堆到 `path/index.ts`。
- node 编译按 `node/types.ts`、`node/layout.ts`、`node/emit.ts`、`node/anchors.ts`、`node/labels.ts`、`node/text.ts` 分边界。
- ribbon 编译是 path 子能力，放在 `compile/path/ribbon/`；普通 path emitter 只调用它的入口。

## 迁移判断

- 跨能力复用纯函数 → `shared`。
- 内置项如何工作 → `providers`。
- 用户如何定义能力 → `contract`。
- IR 字段是否合法 → `schemas`；只有跨字段运行时上下文规则留在 pipeline / compile。
- 字符串 / DSL / Sugar shorthand 解析成 IR 节点或片段 → `parsers`；compile 只保留 Scene 编译期间必须消费的内部解析。

## 改代码前检查

1. 这段代码是在编排/消费，还是在定义 schema / contract / provider？
2. registry 是否只通过 resolver 消费？
3. 是否保持确定性和无全局可变输出状态？
4. 新 option 名是否符合 core 复数名或 plot `xxxDefinitions` 规则？
5. `ResolvedXxx` 是否真的不是原始 IR 输入？
