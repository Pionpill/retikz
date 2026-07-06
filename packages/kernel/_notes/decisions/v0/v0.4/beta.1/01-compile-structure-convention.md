# ADR-01: Compile Structure Convention

- 状态：Accepted
- 决策日期：2026-07-06
- 关联：[beta.1 roadmap](./roadmap.md) / [v0.4 roadmap](../roadmap.md) / [alpha.6 ADR-07](../alpha.6/07-path-kind-registry.md) / [alpha.8 ADR-06](../alpha.8/06-builtin-path-generator-ribbon-profile.md)

## 背景

`packages/kernel/core/src/compile` 是 Kernel IR 到 renderer-agnostic Scene 的确定性消费层。它必须合并 compile options、解析 provider registry、展开 composite、维护 namespace / scope、解析位置引用、消费样式继承、生成 Scene primitive、注册资源并计算自动 layout。

这比 `schemas`、`contract`、`providers` 都更复杂，但复杂度不应该直接表现为“文件职责没有统一范式”。当前 `schemas` 基本遵循 `constants / schema / types / index`，`contract` 基本遵循 `types / define / index`，`providers` 基本遵循 `definitions / registry / index`。相比之下，`compile` 目前同时按 domain、pipeline phase、算法细节和历史演进分目录，读者需要进入实现后才能判断某个文件是在做 sugar 归一化、引用解析、layout、lowering、emit 还是输出包装。

这种不清晰在 path 领域最明显。`Path.kind` 已经把 stroke / ribbon 抽象为同一个 relation host 下的几何 lowering 策略，但 `compile/path` 内部仍混有 host 解析、stroke emit、ribbon geometry、label、mark、arrow、bounds 和 output 包装。后续继续扩展 path kind、path generator、ribbon profile 或端点装饰时，如果没有结构范式，会让 compile 成为隐式规则堆叠点。

本 ADR 不改变公开 API、IR schema、renderer primitive 或编译行为，只规定 compile 文件结构和函数职责范式，为后续小步重构提供判断标准。

## 决策：按流水线阶段定义 compile 范式，domain 内按相同动词组织

`compile` 目录采用“全局流水线 + domain 局部实现”的结构约定：

```text
compile/
  compile.ts
  constants.ts
  warning.ts
  orchestration/
  namespace.ts
  position.ts
  scope.ts
  transform.ts
  style/
  resource/
  scene/
  text/
  node/
  path/
  reference/
```

全局流水线顺序为：

```text
context -> lower -> traverse/register -> resolve/normalize -> layout/geometry -> emit -> decorate -> resource -> bounds/finalize
```

函数命名与职责保持一致：

- `createXxx`：创建 context、cache、resource registry 或内部占位结构。
- `resolveXxx`：把 IR/options/registry/style 解析成 compile 消费态，可查 registry、套默认值、warn 或 throw，但不产出 primitive。
- `normalizeXxx`：对输入做结构归一化，不查 provider / namespace，不注册资源，不产生 warning。纯 authoring sugar 优先迁出到 `parsers`。
- `lowerXxx`：把高层语义降成低层 IR、commands、transform 或 geometry input，不产出最终 Scene primitive。
- `layoutXxx`：测量或计算 layout 中间模型，不写 namespace，不注册资源，不产出最终 primitive。
- `emitXxx`：把 layout / lowered result / provider output 转成 Scene primitive，可调用 resource resolver。
- `collectXxx`：只收集派生数据，最多追加到显式传入的 collection。
- `registerXxx`：写 namespace、resource registry 或 cache。
- `lookupXxx`：只读查表，可 fail loud，不写入。
- `computeXxx`：纯计算，不查表、不 warning、不 mutation。
- `formatXxx`：只格式化字符串。

### 全局文件职责

| 文件 / 目录 | 职责 | 备注 |
| --- | --- | --- |
| `compile/compile.ts` | 顶层入口、`CompileOptions`、`compileToScene` 和最终 Scene 组装 | 不放 node/path 细节。 |
| `compile/constants.ts` | compile 层 warning code、默认值和内部常量 | 不放 schema / provider 常量。 |
| `compile/warning.ts` | warning 类型、格式化和 dispatcher 辅助 | 不承载业务解析。 |
| `compile/orchestration/context.ts` | 合并 options、解析 provider registry、创建资源表、rounder | registry 消费集中入口。 |
| `compile/orchestration/composite.ts` | Tier 2 composite 到 Tier 1 IR 的 lowering | 只做 IR -> IR lowering。 |
| `compile/orchestration/traversal.ts` | child 遍历、scope frame、namespace 注册、path 延迟队列、zIndex 与 bounds 协调 | 只保留编排；通用类型、bounds 与 diagnostics 拆出。 |
| `compile/orchestration/primitive.ts` | primitive sink、placeholder、zIndex、排序 | 不放 domain 逻辑。 |
| `compile/orchestration/types.ts` | traversal 消费态类型 | 不放实现逻辑。 |
| `compile/orchestration/bounds.ts` | 自动 layout bounds 合并与 shadow 外溢 | 不读取 namespace / registry。 |
| `compile/orchestration/diagnostics.ts` | traversal warning code 与重复 id warning 格式化 | 不做 traversal mutation。 |
| `compile/namespace.ts` | namespace frame、id register / lookup / resolving phase | 这是 traversal 的核心基础设施，除非新 ADR 明确改造，否则保留为 compile 顶层文件。 |
| `compile/position.ts` | namespace-aware position 解析 | 因依赖 namespace / scopeChain，保留在 compile。 |
| `compile/scope.ts` | scope transform lowering、scope bbox helper | 只处理 scope 自身编译语义。 |
| `compile/transform.ts` | Scene transform 链计算、局部 / 全局坐标投影 | 这是 scopeChain 与 layout 投影基础设施，除非拆出更明确 owner，否则保留为 compile 顶层文件。 |
| `compile/style/` | style cascade、默认值、resolved style | 只产消费态，不 emit primitive。 |
| `compile/resource/` | Scene resource 注册、去重和 provider output 防御校验 | emit 阶段调用这里注册资源。 |
| `compile/scene/` | precision、viewBox、自动 layout 输出 | Scene 收尾阶段。 |
| `compile/text/` | compile-time 文本 run 解析、TeX lowering 消费、字体解析、行布局 | 纯字符串 authoring parser 若可脱离 compile，后续迁往 `parsers`。 |
| `compile/node/` | Node domain 的 resolve/layout/emit/label/boundary | 以 `NodeLayout` 作为主要中间模型。 |
| `compile/path/` | Path host 与内置 path kind lowering | 重点收敛 stroke / ribbon 的阶段边界。 |
| `compile/reference/` | 跨 domain 的引用缓存与解析基础设施 | 不放具体 node/path emit。 |

### Domain 子目录模板

每个 domain 不要求机械拥有全部文件，但出现对应职责时优先使用以下文件名。

| 文件名 | 职责 | 允许做什么 | 不应该做什么 |
| --- | --- | --- | --- |
| `types.ts` | compile 内部消费类型 | 定义 `ResolvedXxx`、`XxxLayout`、`EmitXxxContext` | 放实现逻辑。 |
| `resolve.ts` | IR/options/registry/style 到消费态 | 查 registry、套默认值、warn/throw | 产出 Scene primitive。 |
| `normalize.ts` | 结构归一化 | 消除局部等价写法，保证下游输入稳定 | 查 provider；处理可提前到 `parsers` 的 authoring sugar。 |
| `lower.ts` | 高层语义到低层 IR / command / geometry input | step 到 commands、host 到 kind input | 注册资源或写 namespace。 |
| `layout.ts` | layout 中间模型 | 文本测量、bbox、anchor/layout 计算 | 组装最终 primitive。 |
| `geometry.ts` 或具体算法名 | domain 内几何算法 | shrink、rounded corners、outline 等 | 依赖 compile runtime 的跨 domain helper 留在 compile；不依赖 compile runtime 的 core-local helper 迁往 `core/src/shared`；跨包复用的纯几何 helper 才迁往 `math`。 |
| `emit.ts` | lowered/layout result 到 Scene primitive | 组装 primitive、调用 resource resolver | 大段引用解析或复杂 lowering。 |
| `decorations.ts` | 附属 primitive | label、mark、arrow、pin 等 | 隐式改变 host 主几何，除非文件名和类型明确表达。 |
| `output.ts` | 输出包装 | group wrapping、transform、bounds result | 解析 IR 或查 registry。 |
| `index.ts` | barrel | 默认 `export *` | 写业务逻辑。 |

### Path 目录目标形态

`compile/path` 是本 ADR 的主要落点。目标结构为：

```text
compile/path/
  types.ts
  host/
    resolve.ts
    target.ts
    label.ts
    relative.ts
  stroke/
    commands.ts
    emit.ts
    lower.ts
    decorations.ts
    marks.ts
    output.ts
    rounded-corners.ts
    shrink.ts
    split.ts
    transform.ts
  ribbon/
    emit.ts
    centerline.ts
    boundary.ts
    outline/
      analytic.ts
      boundary.ts
      cross-section.ts
      output.ts
      sampled.ts
    width.ts
    caps.ts
  index.ts
```

阶段边界：

- `host` 负责 path 共享宿主语义：style、children、target / anchor / boundary clip、host label 和 path kind 输入。
- `stroke` 负责 `kind: "stroke"`：step lowering、rounded corners、endpoint arrows、inline marks、step labels、split subpath 和 output wrapping。
- `ribbon` 负责 `kind: "ribbon"`：`centerline` / `boundary` 两种 mode 的几何 lowering、width function、sampling、caps、outline 和 ribbon label。
- 根 `emit.ts` 只作为薄入口导出 stroke / ribbon 入口，不继续承载完整 step 主循环。

### Node 目录目标形态

`compile/node` 采用根 layout / emit + 子域聚合：

```text
compile/node/
  types.ts
  layout.ts
  emit.ts
  anchors.ts
  boundary.ts
  box.ts
  shape.ts
  synthetic.ts
  content/
    layout.ts
    text.ts
  label/
    geometry.ts
    layout.ts
  index.ts
```

阶段边界：

- `layout.ts` 只编排 node layout，具体正文和 label 计算下沉到 `content/` 与 `label/`。
- `emit.ts` 只把 `NodeLayout` 转 Scene primitive，不做 position / style / text run 解析。
- `content/` 负责节点正文文本布局与 wrapping。
- `label/` 负责节点 label 的位置归一化、几何投影和 label layout。

## 迁移策略

本 ADR 只定义范式，不要求一次性搬完。

1. 新增 compile 文件时，先按本 ADR 选择职责名，避免继续新增 `utils.ts` 或扩大既有大 emitter。
2. 修改既有大文件时，优先提取同阶段纯逻辑，而不是做跨 domain 大搬迁。
3. path 优先于 node/scope/text，因为 path 当前最集中地混合了 host、kind、geometry 和 decoration。
4. 每次迁移保持行为和 API 不变，提交粒度以“一个阶段边界”或“一个 domain 子能力”为单位。
5. 若发现某段逻辑不依赖 namespace、registry、scopeChain、resources 或 compile options，应按分层评估迁移：core-local 纯 helper 迁往 `core/src/shared`；跨包复用的纯几何 helper 迁往 `@retikz/math`；字符串 / DSL / authoring shorthand 到 IR 的 eager 解析迁往 `core/src/parsers`。

## 影响

- 不修改公开 IR schema、React / Vanilla DSL、Scene primitive、renderer 行为或 docs 示例。
- 不新增 compile option。
- 后续 refactor 会改变 `packages/kernel/core/src/compile/**` 的内部文件布局和 import 路径。
- 受影响测试以 `@retikz/core` 的 compile 测试为主，若迁移纯几何 helper 到 `@retikz/math`，同步跑 math 类型检查和相关测试。

## 不在本 ADR 范围

- 不重写 `compileToScene` 的整体算法。
- 不修改 `Path.kind` provider contract。
- 不新增 path kind、node shape、ribbon mode 或文本语义。
- 不把所有 sugar 立即迁往 `parsers`；本 ADR 只规定迁移判断标准。
- 不调整 docs 站用户文档；这是内部结构约定。

---

## 实现契约

### Level

`red`

原因：后续落地会修改 `packages/kernel/core/src/compile/**`，但必须保持公开行为不变。

### Schema 改动

无。

### 文件 scope

允许修改：

- `packages/kernel/core/src/compile/**`
- `packages/kernel/core/tests/compile/**`
- `packages/kernel/core/src/shared/**`，仅限从 compile 迁出的 core-local 纯 helper
- `packages/kernel/core/tests/shared/**`，仅限新增或调整对应 shared helper 测试
- `packages/kernel/math/src/**`，仅限从 compile 下沉的纯几何 helper
- `packages/kernel/math/tests/**`，仅限新增或调整对应纯几何 helper 测试
- `packages/kernel/core/src/parsers/**`，仅限把不依赖 compile runtime 的 authoring sugar 迁出 compile
- `packages/kernel/core/tests/parsers/**`，仅限新增或调整对应 parser 等价性测试

不允许在本 ADR 下修改：

- `packages/kernel/core/src/schemas/**`
- `packages/kernel/core/src/contract/**`
- `packages/kernel/core/src/providers/**`
- `packages/kernel/react/**`
- `packages/kernel/vanilla/**`
- renderer primitive 类型
- apps/docs 用户文档

### 测试策略

每个小步 refactor 至少执行：

- `pnpm --filter @retikz/core exec eslint . --fix`
- `pnpm --filter @retikz/core exec tsc --noEmit`
- 与迁移 domain 相关的 compile vitest 文件
- `git diff --check`

若触及 `@retikz/math`：

- `pnpm --filter @retikz/math exec eslint . --fix`
- `pnpm --filter @retikz/math exec tsc --noEmit`
- math 相关测试

若触及 `core/src/shared` 或 `core/src/parsers`：

- 同步运行对应 `packages/kernel/core/tests/shared/**` 或 `packages/kernel/core/tests/parsers/**` 测试
- 保留迁移前后的 compile 行为等价回归

### 回归重点

- `compileToScene` 对相同 IR + options 仍保持确定性。
- composite lowering 后不得有 Tier 2 节点进入 primitive traversal。
- scope / namespace 下的 node、coordinate、path target 解析结果不变。
- path placeholder 回填、zIndex 排序和自动 layout bounds 不变。
- stroke path 的 arrows、marks、roundedCorners、labels、ribbon centerline / boundary 输出不变。
- resource 去重、paint / clip 注册结果不变。

### 依赖的现有元素

- `compileToScene`：顶层纯函数入口。
- `createCompileContext`：registry、resource、rounder 和 host options 的集中解析点。
- `compileChildrenToPrimitives`：当前 traversal 编排入口。
- `PathKindDefinition`：path kind provider contract。
- `NodeLayout`：node domain 的中间 layout 模型。
- `PathPrimitiveEmitResult`：path kind emit 统一返回结构。
