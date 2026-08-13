---
name: standard-pipeline-compile
description: Use when changing retikz pipeline or compile code, lowering, registry consumption, compile options, plot expand stages, core compileToScene behavior, CanonicalXxx or effective-context types, warnings, or IR-to-primitive/Kernel-IR orchestration.
---

# Standard Pipeline Compile

`pipeline/` 和 `compile/` 是编排与消费层。公开编译入口接收已类型化的 Source IR 后，`resolveXxx` 先准备 registry、引用、host、data 等 context 并调度 Core / Plot `normalizeXxx` 转为 Canonical，再执行 lowering / emit，输出 Kernel IR 或 Scene primitive；不要在这里发明 schema 或 provider 的平行规则。

`compileToScene` 继续是 Core 唯一的公开编译入口，接收 `IRScene`；不新增同义的 `compileIRToScene`。`InputXxx -> IRXxx` 的 authoring normalize 属于 Vanilla，`unknown -> IRXxx` 的 parse 属于 parse / schema 边界。

## 分工

- `pipeline/`：Tier 2 到 Kernel IR 的 lowering 编排，例如 plot 的 data / scale / coordinate / transform / mark / guide 阶段。
- `compile/`：Kernel IR 到 Scene primitive 的确定性编译，例如 core 的 registry options、坐标、路径、节点、样式继承、命名空间和 warning。

具体规则回到拥有概念的层：schema 形态回 `schemas`，能力协议回 `contract`，内置实现回 `providers`，通用纯函数回 `shared`，unknown、字符串或 DSL 到 IR 的 eager 解析回 `parse/`。

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

目录、文件和符号名以 `standard-name` 为唯一真源。`CanonicalXxx` 定义在 Core / Plot `normalize/<domain>/types.ts`，由 domain `normalizeXxx` 产出；`resolveXxx` 准备 context 并调度它。若 context 产生独立概念，使用其领域语义名而不是泛用 `ResolvedXxx`。warning code 仍用 const object enum + `XxxValue` 派生，message 写当前契约。

### Compile 函数动词

- `createXxx` 创建 context、cache、资源表或 synthetic 结构；不查 provider，不注册。
- `resolveXxx` 解析 registry、引用、host、data 等编译 context，并调度 domain `normalizeXxx`；不复制 IR shorthand 展开、领域默认、semantic validation 或领域值转换，不 parse、不产出 primitive。
- `resolveXxxRegistry` 只用于 provider registry 合并。
- `lowerXxx` 把高层语义降成低层 IR、命令或 transform；不产出 primitive / resource。
- `layoutXxx` 度量或计算 layout 数据；可调用 `resolveXxx`；不写 namespace，不产出 primitive。
- `emitXxx` 把 layout / lowered result / provider output 转成 Scene primitive 或 resource。
- `collectXxx` 只收集派生数据；最多追加到显式传入的 collection。
- `registerXxx` 写 namespace、registry 或 cache；有写入副作用才用。
- `lookupXxx` 只读查表；可 fail loud，不写入。
- `normalizeXxx` 在 Vanilla / Plot Vanilla 把 `InputXxx` 组装为 `IRXxx`，在 Core / Plot domain `normalize/` 把 `IRXxx` 加 `NormalizeContext` 规范化为 `CanonicalXxx`；compile 只调度，不定义同义实现。
- `filterXxx` 过滤非法项；可 warn，不改写合法项。
- `computeXxx` 纯计算；不 lookup、不 warn、不 mutation。
- `formatXxx` 只格式化字符串。
- 避免 `processXxx` / `handleXxx` / `doXxx`；`compileXxx` 只用于跨 register / resolve / layout / emit 多阶段的 orchestration 入口。

## Pipeline / Compile 文件结构

- `compile.ts` 只放 `CompileOptions`、`compileToScene` 和顶层编排；domain 细节下沉到对应目录。
- 目录级 `index.ts` 只做稳定入口导出，不承载业务逻辑；默认 `export *`，需要保兼容面或避免冲突时才精选导出。
- 大型 domain 按 `types.ts` / `resolve.ts` / `lower.ts` / `layout.ts` / `emit.ts` / `decorations.ts` / `output.ts` 拆分；缺哪个阶段就省略对应文件，不为了模板机械建空文件。
- `compile/<domain>/types.ts` 只放 compile / pipeline 私有消费态类型；`CanonicalXxx` 与 `NormalizeContext` 属于领域规范化结果，定义在 `normalize/<domain>/types.ts`，由 `resolve.ts` 构造 context 并调度 normalizer。`resolve.ts` 可查 registry、解析 context、warn/throw；`lower.ts` 输出低层 IR / command / geometry input；`layout.ts` 度量或计算中间模型；`emit.ts` 输出 primitive / resource；`decorations.ts` 输出附属 primitive；`output.ts` 做 group wrapping、bounds result、transform 等输出包装。
- `orchestration/` 放跨 domain 编排：context、composite lowering、traversal、primitive sink、diagnostics、bounds、运行时 types；不要放 node/path/text 的具体 emit 细节。
- `node/` 根保留 `types.ts`、`layout.ts`、`emit.ts`、`anchors.ts`、`boundary.ts`、`box.ts`、`shape.ts`、`synthetic.ts`；正文文本下沉到 `node/content/`，node label 下沉到 `node/label/`。
- `path/` 根保留 `types.ts` 和 `index.ts`；不要保留仅转发的 `emit.ts` shim。共享宿主语义放 `path/host/`，普通 stroke path 放 `path/stroke/`，ribbon 放 `path/ribbon/`。
- `path/host/` 承担 target / anchor / boundary clip、host label、relative target normalization、host style resolve；不得输出 path 主 primitive。
- `path/stroke/` 承担 stroke emit、step lowering、marks、decorations、rounded corners、shrink、split、path transform 和 output wrapping。
- `path/ribbon/` 承担 ribbon emit、centerline / boundary mode、outline、width、caps 和 ribbon label 调用。
- `text/`、`style/`、`resource/`、`scene/`、`reference/` 已按小文件 owner 模式组织；新增能力优先沿现有 owner 放置，不新建泛化 `utils.ts`。
- `pipeline/` 是 Tier 2 到 Kernel IR 的阶段编排；阶段文件优先用业务阶段名（如 `expand.ts`、`layout.ts`、`decoration-layout.ts`、`provenance.ts`），复杂阶段再拆为子目录（如 `guide/`、`locator/`）。阶段内部仍遵守 `types` / `resolve` / `lower` / `layout` / `emit` 的动词边界。

## 迁移判断

- 跨能力复用纯函数 → `shared`。
- 内置项如何工作 → `providers`。
- 用户如何定义能力 → `contract`。
- IR 字段是否合法 → `schemas`；只有跨字段运行时上下文规则留在 pipeline / compile。
- `unknown`、字符串或序列化 DSL 解析成 Source IR → `parse`；框架 authoring Input 由 Vanilla `normalizeXxx` 构建。Core / Plot domain normalizer 负责 Source IR → Canonical；compile 不重复 parse 或复制 normalizer，只保留 context 解析与 Scene 编译期间必须消费的内部解析。

## 改代码前检查

1. 这段代码是在编排/消费，还是在定义 schema / contract / provider？
2. registry 是否只通过 resolver 消费？
3. 是否保持确定性和无全局可变输出状态？
4. 新 option 名是否符合 core 复数名或 plot `xxxDefinitions` 规则？
5. `CanonicalXxx` 是否定义在领域 `normalize/<domain>/types.ts`、由 domain `normalizeXxx` 唯一产生，且 `resolveXxx` 只准备 context 并调度它？
