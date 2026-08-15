---
name: standard-pipeline-compile
description: Use when changing retikz pipeline or compile code, lowering, registry consumption, compile options, plot expand stages, core compileToScene behavior, CanonicalXxx or effective-context types, warnings, or IR-to-primitive/Kernel-IR orchestration.
---

# Standard Pipeline Compile

`pipeline/` 和 `compile/` 是编排与消费层。公开编译入口接收已类型化的 Source IR 后，创建并维护 registry、引用、host、data、theme、measurement 等 context，在依赖就绪点调度纵向领域 `resolveXxx`，再执行 lowering / layout / emit，输出 Kernel IR 或 Scene primitive。默认、优先级、lookup、领域值转换和 Canonical 数据结构属于 `resolve/`；不要散落到 pipeline / compile。

`compileToScene` 继续是 Core 唯一的公开编译入口，接收 `IRScene`；不新增同义的 `compileIRToScene`。`InputXxx -> IRXxx` 的 authoring normalize 属于 Vanilla，`unknown -> IRXxx` 的 parse 属于 parse / schema 边界。

## 分工

- `pipeline/`：Tier 2 到 Kernel IR 的 lowering 编排，例如 plot 的 data / scale / coordinate / transform / mark / guide 阶段。
- `compile/`：Kernel IR 到 Scene primitive 的确定性编译，例如 core 的 context 生命周期、坐标、路径、节点、命名空间和 warning 调度。

具体规则回到拥有概念的层：schema 形态回 `schemas`，能力协议回 `contract`，内置实现回 `providers`，通用纯函数回 `shared`，unknown、字符串或 DSL 到 IR 的 eager 解析回 `parse/`。

## 确定性

`compileToScene` 必须保持纯函数：相同 IR + 相同 options 得到相同 Scene。不要用 `Math.random()`、`Date.now()` 或 module-level mutable state 影响输出。

## Public options

- core compile options 用能力复数名：`shapes`、`boundaries`、`clips`、`arrows`、`patterns`、`pathGenerators`、`pathKinds`、`composites`。
- plot 新增 registry option 优先用 `xxxDefinitions`；既有 `coordinates` 是历史例外，除非保持同一能力兼容，否则不要复制。
- options 只传 definition 或编排策略，不传函数进 IR schema。

## Registry 消费

- pipeline / compile 在 context 初始化时调用 provider registry resolver，并把有效 registry 注入窄 `XxxResolveContext`。
- 领域 `resolveXxx` 执行具体 provider lookup、fallback 与未注册名诊断；不复制内置白名单，不分叉“内置 vs 自定义”。
- schema 层只保证 provider name 的 JSON 形态；未注册名、lookup 失败和用户 definition 参与的优先级模型属于 resolve。
- lower / layout / emit 只消费 resolver 已确定的 definition、Canonical 或 Resolution，不重新查表或选择 fallback。

## 命名

目录、文件和符号名以 `standard-name` 为唯一真源。`CanonicalXxx`、`XxxResolveContext` 与必要的 `XxxResolution` 定义在纵向领域 `resolve/<domain>/types.ts`，由 `resolveXxx` 产出。pipeline / compile 只创建 context、维护动态状态并决定调用时机。若 context 产生独立概念，使用 `EffectiveXxx`、`XxxResolution` 或准确领域名，不使用泛化 `ResolvedXxx`。warning code 仍用 const object enum + `XxxValue` 派生，message 写当前契约。

### Compile 函数动词

- `createXxx` 创建 context、cache、资源表或 synthetic 结构；不查 provider，不注册。
- `resolveXxx` 属于纵向领域 `resolve/`，消费 Source IR 与窄 `XxxResolveContext`，统一处理 shorthand、默认、优先级、lookup、semantic validation 与领域值转换；不 parse、不产出 primitive。
- `resolveXxxRegistry` 只用于 provider registry 合并。
- `lowerXxx` 把高层语义降成低层 IR、命令或 transform；不产出 primitive / resource。
- `layoutXxx` 度量或计算 layout 数据；可调用 `resolveXxx`；不写 namespace，不产出 primitive。
- `emitXxx` 把 layout / lowered result / provider output 转成 Scene primitive 或 resource。
- `collectXxx` 只收集派生数据；最多追加到显式传入的 collection。
- `registerXxx` 写 namespace、registry 或 cache；有写入副作用才用。
- `lookupXxx` 只读查表；可 fail loud，不写入。
- `normalizeXxx` 只在 Vanilla API 包把 `InputXxx` 组装为 `IRXxx`；纵向领域与 pipeline / compile 不定义阶段级 `normalizeXxx` 或 `NormalizeContext`。
- `filterXxx` 过滤非法项；可 warn，不改写合法项。
- `computeXxx` 纯计算；不 lookup、不 warn、不 mutation。
- `formatXxx` 只格式化字符串。
- 避免 `processXxx` / `handleXxx` / `doXxx`；`compileXxx` 只用于跨 register / resolve / layout / emit 多阶段的 orchestration 入口。

## Pipeline / Compile 文件结构

- `compile.ts` 只放 `CompileOptions`、`compileToScene` 和顶层编排；domain 细节下沉到对应目录。
- 目录级 `index.ts` 只做稳定入口导出，不承载业务逻辑；默认 `export *`，需要保兼容面或避免冲突时才精选导出。
- 大型 compile domain 按 `types.ts` / `lower.ts` / `layout.ts` / `emit.ts` / `decorations.ts` / `output.ts` 拆分；领域 `resolve.ts` 位于顶层 `resolve/<domain>/`。缺哪个阶段就省略对应文件，不为了模板机械建空文件。
- `compile/<domain>/types.ts` 只放 compile / pipeline 私有消费态类型；`CanonicalXxx`、`XxxResolveContext` 与必要的 `XxxResolution` 定义在 `resolve/<domain>/types.ts`。orchestration 创建并维护 broad context，在调用点投影为窄 resolve context；`lower.ts` 输出低层 IR / command / geometry input；`layout.ts` 度量或计算中间模型；`emit.ts` 输出 primitive / resource；`decorations.ts` 输出附属 primitive；`output.ts` 做 group wrapping、bounds result、transform 等输出包装。
- `orchestration/` 放跨 domain 编排：context、composite lowering、traversal、primitive sink、diagnostics、bounds、运行时 types；不要放 node/path/text 的具体 emit 细节。
- `node/` 根保留 `types.ts`、`layout.ts`、`emit.ts`、`anchors.ts`、`boundary.ts`、`box.ts`、`shape.ts`、`synthetic.ts`；正文文本下沉到 `node/content/`，node label 下沉到 `node/label/`。
- `path/` 根保留 `types.ts` 和 `index.ts`；不要保留仅转发的 `emit.ts` shim。共享宿主语义放 `path/host/`，普通 stroke path 放 `path/stroke/`，ribbon 放 `path/ribbon/`。
- `path/host/` 承担 target / anchor / boundary clip、host label 等 compile 消费与几何协作；relative target 与 host style 的数据结构解析归领域 `resolve/path/`，不得在 host 阶段补 Canonical 默认，也不得输出 path 主 primitive。
- `path/stroke/` 承担 stroke emit、step lowering、marks、decorations、rounded corners、shrink、split、path transform 和 output wrapping。
- `path/ribbon/` 承担 ribbon emit、centerline / boundary mode、outline、width、caps 和 ribbon label 调用。
- `text/`、`style/`、`resource/`、`scene/`、`reference/` 已按小文件 owner 模式组织；新增能力优先沿现有 owner 放置，不新建泛化 `utils.ts`。
- `pipeline/` 是 Tier 2 到 Kernel IR 的阶段编排；阶段文件优先用业务阶段名（如 `expand.ts`、`layout.ts`、`decoration-layout.ts`、`provenance.ts`），复杂阶段再拆为子目录（如 `guide/`、`locator/`）。阶段内部按实际职责使用 `types` / `lower` / `layout` / `emit`；Source IR 与 context 的结构确定化始终导入顶层 `resolve/<domain>/`，不在 pipeline 内建立平行 `resolve.ts`。

## 迁移判断

- 跨能力复用纯函数 → `shared`。
- 内置项如何工作 → `providers`。
- 用户如何定义能力 → `contract`。
- provider registry 合并 → `providers`；具体 lookup、fallback 与上下文诊断 → `resolve`。
- IR 字段是否合法 → `schemas`；补全后不变量、lookup 失败和运行时上下文优先级 → `resolve`。
- `unknown`、字符串或序列化 DSL 解析成 Source IR → `parse`；框架 authoring Input 由 Vanilla API `normalizeXxx` 构建。纵向领域 resolver 负责 Source IR + context → Canonical / Resolution；pipeline / compile 不重复 parse 或复制 resolver，只保留 context 生命周期、阶段顺序与 Scene 编译核心逻辑。

## 改代码前检查

1. 这段代码是在编排/消费，还是在定义 schema / contract / provider？
2. registry 是否只通过 resolver 消费？
3. 是否保持确定性和无全局可变输出状态？
4. 新 option 名是否符合 core 复数名或 plot `xxxDefinitions` 规则？
5. `CanonicalXxx` 是否定义在领域 `resolve/<domain>/types.ts`、由 `resolveXxx` 唯一产生，且 pipeline / compile 只准备 context 并调度它？
