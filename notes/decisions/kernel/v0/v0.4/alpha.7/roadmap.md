# v0.4.0-alpha.7 Roadmap: Provider contract 收敛与功能补齐

## 目标

alpha.7 聚焦 kernel 扩展面的机制收敛。此前 shape / arrow / pattern / path generator / path kind / ribbon width profile / composite 已经陆续长出 `contract/` + `providers/` 形态，但 registry 输入、key 来源、重复注册诊断、覆盖内置能力、React / Vanilla 透传等细节尚未完全统一。

本 milestone 的目标是把这些能力正式收敛为一套强约束 provider contract:

- `contract/<capability>` 放第三方作者实现的 `Definition` 类型、`defineX()` 工厂、key 提取与共享上下文类型。
- `providers/<capability>` 放内置 definition、`BUILTIN_*` 清单与 `resolveXxxRegistry()`。
- 内置与自定义 definition 进入同一 registry，compile 只消费 resolve 后的表，不写内置白名单或补丁接口。
- runtime definition 可以包含函数、schema 与 helper，但不进 IR；IR 只保存 JSON-safe 的字符串引用或 operation object。
- 允许破坏性改动，不为 0.x 旧 provider 输入形态保留兼容桥。

## plot / graph 参考结论

本轮设计参考 `@retikz/plot` 在 v0.1-alpha.12 的 registry 收敛经验:

- `contract/<层>` 与 `providers/<层>` 分离，依赖方向为 `contract <- providers <- pipeline`。
- registry 输入使用 `ReadonlyArray<AnyXxxDefinition>`，resolve 后使用 `Map<string, AnyXxxDefinition>`。
- builtin 先注册，custom 后注册；custom 不允许覆盖 builtin，也不允许自定义之间重复，冲突直接 throw。
- unknown provider fail-loud，并提示用户通过对应 options 注入 definition。
- definition 不进 IR，IR 保存 `{ type/kind/op/...config }` 或字符串引用。
- key 来源不机械统一: plot 的 scale / transform / coordinate 从 schema literal 抽 `type` / `kind`，mark / channel 则从 definition 自带的 `type` / `channel` 字段取 key。

kernel alpha.7 采用同样原则: **registry 机制统一，key 来源按能力语义分两类**。

## Provider 分类

### String Reference Provider

这类能力在 IR 中只是一个字符串引用，definition 自身必须携带 `name` 作为 registry key。

| 能力 | IR 引用 | Definition key | 说明 |
| --- | --- | --- | --- |
| Shape | `node.shape` | `ShapeDefinition.name` | `paramsSchema` / geometry / emit 运行时注入，不进 IR |
| Arrow | `arrowDetail.shape` | `ArrowDefinition.name` | 保留 IR 字段语义，definition name 作为注册项真源 |
| Pattern | pattern 引用字段 | `PatternDefinition.name` | 不为统一而强行改 IR 字段名；只要求它指向 definition name |
| Path generator | generator step `name` | `PathGeneratorDefinition.name` | generator operation 仍保存 JSON params |
| Ribbon width profile | ribbon width profile 引用 | `RibbonWidthProfileDefinition.name` | profile 函数运行时注入，不进 IR |

### Operation Provider

这类能力在 IR 中有完整 operation object，registry key 应绑定 discriminant literal 或 namespace，而不是另设一个可能漂移的 `name`。

| 能力 | IR operation | Registry key | 说明 |
| --- | --- | --- | --- |
| Path kind | `IRPath.kind` + kind-specific options | schema literal `kind` | 对齐 plot scale / transform 的 schema-keyed definition |
| Composite | `{ namespace, type, ...payload }` | `${namespace}.${type}` | 保留 namespace 防撞；schema 校验 payload，不再让内置走特殊入口 |

## 决策列表

| ADR | 状态 | 主题 | 说明 |
| --- | --- | --- | --- |
| [ADR-01](./01-provider-registry-contract.md) | Accepted（2026-06-29 人工签字，待实现） | Provider registry contract | 统一 array 输入、Map resolve、builtin-first、duplicate throw、unknown 诊断、测试矩阵与错误消息格式 |
| [ADR-02](./02-provider-key-contract.md) | Accepted（2026-06-29 人工签字，待实现） | Provider key contract | 区分 string reference provider 与 operation provider；明确 `name`、schema literal、`namespace.type` 三种 key 来源 |
| [ADR-03](./03-capability-provider-migration.md) | Accepted（2026-06-29 人工签字，待实现） | Capability migration | 迁移 shape / arrow / pattern / path generator / path kind / ribbon width profile / composite 到统一 provider 模型 |
| [ADR-04](./04-adapter-surface-and-docs.md) | Accepted（2026-06-29 人工签字，待实现） | Adapter surface and docs | React / Vanilla provider 透传改成数组定义；文档新增 provider authoring 总览与扩展示例 |

## 设计约束

- `CompileOptions` 的 provider 字段统一改为 `ReadonlyArray<AnyXxxDefinition>` 或对应精确 definition 数组。
- `BUILTIN_*` 公开清单统一为 `ReadonlyArray<AnyXxxDefinition>`；如需诊断可另建内部 `ReadonlyMap`，但公共面以数组为主。
- custom provider 与 builtin provider 同名默认 throw，不通过 warn 静默覆盖。
- alpha.7 不设计 `overrideBuiltin` 逃生口；如后续确有覆盖内置行为需求，单独 ADR 讨论。
- `defineX()` 保持纯函数，不读全局 registry，不依赖 providers。
- `defineX()` 可以做定义点的最小运行时校验，如 key 非空、必要函数存在、schema 可 parse，但不做 unknown 引用检查。
- contract 层不得 import providers；compile / pipeline 只通过 `resolveXxxRegistry()` 消费有效表。
- error message 必须包含 capability、失败 key 与注入选项名，便于用户和 LLM 修正。

## 范围

本 milestone 覆盖:

- `packages/kernel/core/src/contract/**`
- `packages/kernel/core/src/providers/**`
- `packages/kernel/core/src/compile/**` 中 provider resolve 与 lookup 相关代码
- `packages/kernel/core/src/index.ts` 的 provider 公开导出
- `packages/kernel/react` 中 `<Layout>` provider props 的透传形态
- `packages/kernel/vanilla` 中 builder / render 入口的 provider 透传形态
- `apps/docs` 中 kernel provider authoring 总览、相关 API 表与示例
- 现有 provider registry 测试与 adversarial 测试

不在本 milestone 范围:

- 新增具体 shape / arrow / pattern / path kind 成品能力。
- 新增 renderer primitive 或渲染后端能力。
- 为旧 `Record<string, Definition>` 输入保留兼容别名。
- 将所有 IR 字段名机械改成 `name`。字段名以领域语义为准，registry key 映射由 contract 说明。

## 验收清单

- [ ] `CompileOptions` 中 provider 注入形态统一为 definition 数组。
- [ ] `BUILTIN_SHAPES` / `BUILTIN_ARROWS` / `BUILTIN_PATTERNS` / `BUILTIN_PATH_GENERATORS` / `BUILTIN_PATH_KINDS` / `BUILTIN_RIBBON_WIDTH_PROFILES` / `BUILTIN_COMPOSITES` 公开形态一致。
- [ ] 所有 provider registry 都先注册 builtin，再注册 custom，并对重复 key throw。
- [ ] custom 不能覆盖 builtin；同一 custom 数组内重复 key 也必须 throw。
- [ ] unknown provider 引用的报错列出 capability、失败 key、可用 key 与注入 options 名称。
- [ ] string reference provider 全部由 `Definition.name` 提供 key。
- [ ] operation provider 全部由 schema literal 或 `namespace.type` 提供 key，且有显式 key 提取 helper。
- [ ] compile 中不存在面向内置 provider 的特殊白名单分支。
- [ ] React / Vanilla 的 provider props 与 core `CompileOptions` 命名和形态一致。
- [ ] docs 说明 runtime definition 不进 IR、IR 只保存 JSON-safe 引用或 operation。
- [ ] provider authoring 示例覆盖至少 shape、path kind、composite 三类代表性能力。

## 测试设计

每个迁移能力至少覆盖:

- happy path: builtin provider 与 custom provider 走同一 registry lookup。
- boundary: 空 custom 数组保留 builtin；注册顺序稳定；错误 key 诊断稳定。
- error path: custom 覆盖 builtin、custom 重复、缺失必需字段、unknown 引用。
- interaction: React / Vanilla 透传 custom provider 到 core compile。
- JSON boundary: IR round-trip 不包含 runtime definition、函数或 class 实例。

## 文档同步

alpha.7 会改变 public provider API，因此必须同步 docs:

- 新增 kernel provider authoring 总览页，解释 `contract/`、`providers/`、IR JSON 与 runtime definition 的边界。
- 更新 Shape / Path / Pattern / Arrow 等相关页面中的自定义 provider 写法。
- 更新 React `<Layout>` 与 Vanilla render / builder 的 provider 参数 API 表。
- 如字段名或输入形态破坏旧写法，文档只保留新写法，不写迁移兼容层。
