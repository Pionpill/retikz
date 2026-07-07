# ADR-01: Compile Structure Convention

- 状态：Accepted
- 决策日期：2026-07-06
- 关联：[beta.1 roadmap](./roadmap.md) / [v0.4 roadmap](../roadmap.md) / [alpha.6 ADR-07](../alpha.6/07-path-kind-registry.md) / [alpha.8 ADR-06](../alpha.8/06-builtin-path-generator-ribbon-profile.md)

## 背景

`packages/kernel/core/src/compile` 是 Kernel IR 到 renderer-agnostic Scene 的确定性消费层。它合并 compile options、解析 provider registry、展开 composite、维护 namespace / scope、解析位置引用、消费样式继承、生成 Scene primitive、注册资源并计算自动 layout。

相比 `schemas`、`contract`、`providers` 已经形成的文件范式，`compile` 长期混合了 domain、pipeline phase、几何算法和历史演进文件。尤其是 path 领域同时承载 host 解析、stroke emit、ribbon geometry、label、mark、arrow、bounds 与 output 包装，读者需要进入实现后才能判断文件职责。

本 ADR 不改变公开 API、IR schema、Scene primitive 或 renderer 行为，只规定 compile 的文件结构和职责边界，为 beta.1 内部重构提供长期约束。

## 决策

`compile` 采用“全局流水线 + domain 局部实现”的结构。全局入口只保留 orchestration、namespace、position、scope、transform、style、resource、scene 等跨 domain 能力；node、path、text 等 domain 内部再按相同动词组织。

全局流水线顺序为：

```text
context -> lower -> traverse/register -> resolve/normalize -> layout/geometry -> emit -> decorate -> resource -> bounds/finalize
```

函数命名与职责保持一致：

| 前缀           | 职责                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ |
| `createXxx`    | 创建 context、cache、resource registry 或内部占位结构                                      |
| `resolveXxx`   | 把 IR/options/registry/style 解析成 compile 消费态，可查 registry、套默认值、warn 或 throw |
| `normalizeXxx` | 做结构归一化，不查 provider / namespace，不注册资源，不产生 warning                        |
| `lowerXxx`     | 把高层语义降成低层 IR、commands、transform 或 geometry input                               |
| `layoutXxx`    | 计算 layout 中间模型，不写 namespace，不注册资源，不产生最终 primitive                     |
| `emitXxx`      | 把 layout / lowered result / provider output 转成 Scene primitive                          |
| `collectXxx`   | 只收集派生数据，最多追加到显式传入的 collection                                            |
| `registerXxx`  | 写 namespace、resource registry 或 cache                                                   |
| `lookupXxx`    | 只读查表，可 fail loud，不写入                                                             |
| `computeXxx`   | 纯计算，不查表、不 warning、不 mutation                                                    |
| `formatXxx`    | 只格式化字符串                                                                             |

可提前消除的 authoring sugar 优先迁往 `core/src/parsers`；不依赖 compile runtime 的 core-local helper 迁往 `core/src/shared`；跨包复用的纯几何 helper 迁往 `@retikz/math`。

## 目录范式

顶层职责：

| 文件 / 目录              | 职责                                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `compile/compile.ts`     | 顶层入口、`compileToScene` 和最终 Scene 组装                                                                     |
| `compile/types.ts`       | compile options 与顶层类型                                                                                       |
| `compile/constants.ts`   | compile 层 warning code、默认值和内部常量                                                                        |
| `compile/warning.ts`     | warning 类型、格式化和 dispatcher                                                                                |
| `compile/orchestration/` | options 合并、provider registry 消费、composite lowering、child traversal、primitive sink、bounds 与 diagnostics |
| `compile/namespace.ts`   | namespace frame、id register / lookup / resolving phase                                                          |
| `compile/position.ts`    | namespace-aware position 解析                                                                                    |
| `compile/scope.ts`       | scope transform lowering 与 scope bbox helper                                                                    |
| `compile/transform.ts`   | Scene transform 链计算与坐标投影                                                                                 |
| `compile/style/`         | style cascade、默认值和 resolved style                                                                           |
| `compile/resource/`      | Scene resource 注册、去重和 provider output 校验                                                                 |
| `compile/scene/`         | precision、viewBox、自动 layout 输出                                                                             |
| `compile/text/`          | compile-time 文本 run、TeX lowering、字号解析和文本布局                                                          |
| `compile/node/`          | Node domain 的 resolve / layout / emit / label / boundary                                                        |
| `compile/path/`          | Path host、stroke lowering / emit、ribbon geometry                                                               |

domain 子目录按需采用以下文件名：`types.ts`、`resolve.ts`、`normalize.ts`、`lower.ts`、`layout.ts`、`geometry.ts`、`emit.ts`、`decorations.ts`、`output.ts`、`index.ts`。`index.ts` 只做 barrel。

path 的目标结构为：

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

node 的目标结构为：

```text
compile/node/
  types.ts
  layout.ts
  emit.ts
  anchors.ts
  boundary.ts
  synthetic.ts
  content/
    layout.ts
    text.ts
  label/
    geometry.ts
    layout.ts
  index.ts
```

## 落地摘要

beta.1 已按该范式完成第一轮内部重构：

- `compile/compile.ts` 的 options 类型移至 `compile/types.ts`。
- orchestration 拆出 `types`、`bounds`、`diagnostics`，降低 traversal 文件职责。
- path 拆成 `host`、`stroke`、`ribbon/outline`，移除无职责聚合文件。
- path thickness sugar 解析迁往 `parsers/path-thickness.ts`。
- position 类型判断沉淀到 `shared/position.ts`。
- `samePoint`、`shiftToward`、finite point helper 等纯几何能力沉淀到 `@retikz/math`。
- node content / label 布局拆入对应子目录。
- compile pipeline 范式同步写入 `standard-pipeline-compile` skill。

这些变更只调整内部结构和 helper 归属，不改变公开 IR、React / Vanilla DSL、Scene primitive 或 renderer 行为。

## 验证

收尾时已通过：

- `pnpm --filter @retikz/core exec tsc --noEmit`
- `pnpm --filter @retikz/math exec tsc --noEmit`
- `pnpm --filter @retikz/react exec tsc --noEmit`
- `pnpm --filter @retikz/vanilla exec tsc --noEmit`
- `pnpm --filter @retikz/core exec eslint .`
- `pnpm --filter @retikz/math exec eslint .`
- `pnpm --filter @retikz/react exec eslint .`
- `pnpm --filter @retikz/vanilla exec eslint .`
- `pnpm --filter @retikz/core exec vitest run`
- `pnpm --filter @retikz/math exec vitest run`
- `pnpm --filter @retikz/react exec vitest run`
- `pnpm --filter @retikz/vanilla exec vitest run`

一次四包并行测试中 `@retikz/vanilla` 的 SSR guard 曾因 5s timeout 失败；单独复现该文件和 vanilla 全量测试均通过，判断为并行资源抖动。

## 遗留风险

- `compile` 仍是 core 中最复杂的内部模块，后续新增能力必须继续按本 ADR 的阶段命名和 owner barrel 约束落点。
- `compile/text` 中仍存在可继续迁往 `parsers` 的 authoring sugar，需要在不改变行为的前提下逐步处理。
- 若未来调整 schema / provider contract / public DSL，需要新 ADR；本 ADR 只覆盖内部结构范式。
