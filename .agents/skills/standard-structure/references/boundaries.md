# 分层与所有权

## 包职能与数据边界

- 核心能力包（Core、Plot 等 domain owner）拥有 Source IR schema、domain resolver 的 `CanonicalXxx` 与 `IRXxx + XxxResolveContext -> CanonicalXxx / XxxResolution` 的 `resolveXxx`、registry 消费、lowering / compile 和 Scene 语义。不得维护框架通用 Input、DOM 或框架生命周期
- API 基础包（Vanilla、Plot Vanilla）拥有 TypeScript-only `InputXxx -> IRXxx` 的 `normalizeXxx`、共享 session / retained runtime 与 SSR 接线；不得重写 domain schema、resolve、lowering 或 Scene 语义
- 框架包（React、Plot React）把 JSX / props / lifecycle 调度为对应 Vanilla `InputXxx`；不得直接重建 Core / Plot IR builder、session 或 renderer 编排
- `normalizeXxx` 只存在于 Vanilla API 包并处理 `InputXxx -> IRXxx`；纵向领域包的 `resolveXxx` 消费 Source IR 与当前 context，统一产出 Canonical / Resolution。只有完全脱离领域且被多层复用的原子值转换才能进入 `shared`；`parseXxx` 只处理 `unknown` 边界

## 入口类型

- 有命名类型且存在统一承载入口时，把类型写在入口处（如 `defineXxx<TParams>({...})`、builder 泛型、类泛型或构造入口），不要在其上下文回调、成员或内部参数上重复声明同一类型。

## 类型信任与校验边界

- 内部调度按 TypeScript 类型契约设计，消费方通过明确的类型调用；不为纯 JavaScript 调度额外维护类型校验和错误分支，纯 JavaScript 调用由第三方自行负责校验
- JSON、持久化配置和其他类型不明确的数据，只在 parse / schema 边界完成一次 parse / 校验；Vanilla / adapter 的 `normalizeXxx` 只把已类型化的 `InputXxx` 组装为 Source IR，纵向领域 `resolveXxx` 再消费 context 唯一产出 Canonical / Resolution。进入内部实现后必须使用明确的数据类型，不以 `unknown` 或未收窄的宽联合继续传递
- 优先让 TypeScript 表达类型约束，避免重复的 `typeof`、对象结构检查和对应的 `throw`；不得在 normalize、resolve、lower 或 emit 重复 schema 已覆盖或明确 TypeScript 类型已保证的约束。只保留入口校验、schema 未覆盖且 TypeScript 无法表达的真实业务不变量或查找失败诊断
- 只在对象会暴露给外部，或会通过公开 API 返回给外部时使用 `Object.freeze`；纯内部使用的中间对象不做多余冻结，复制与明确的所有权边界已经足够时不要额外防御

## 依赖方向

允许依赖方向：

```text
shared <- schemas <- contract <- providers <- resolve <- pipeline/compile
shared/schemas <- parse
shared/schemas <- Vanilla normalize
```

右侧消费左侧；左侧不反向读取右侧。`parse/` 是 unknown、字符串或 DSL 入 Source IR 的纯函数旁路，只依赖 `shared` / `schemas`，输出 `IRXxx` 节点或片段；不得依赖 `compile`、`providers` 或运行时 registry。Vanilla API `normalize/` 只依赖公开 `shared` / `schemas`，把 `InputXxx` 组装为 `IRXxx`；不得定义领域 schema、Canonical 或 compile 规则。纵向领域 `resolve/<domain>/` 从 schema IR 类型派生 `CanonicalXxx`，定义窄 `XxxResolveContext`，并统一处理默认、优先级、lookup、领域值转换和补全后不变量；pipeline / compile 只创建 context、管理阶段顺序并调度 resolver。跨层复用的纯函数优先下沉到 `shared`，IR 契约回 `schemas`，Canonical 类型与逻辑回 domain `resolve/`，作者协议回 `contract`，内置实现回 `providers`，编排消费留在 `pipeline/compile`。

## 原子契约与组合

- `shared`、`schemas` 与 `contract` 向上导出的公共内容，优先按稳定语义提供可独立复用的原子契约；上层包负责组合，不为单一消费方把组合结果下沉成底层 bundle
- Canonical / normalized 结果及本层中间对象遵循根 AGENTS 的最小规范模型规则；缓存 key、索引、展示或适配投影等消费方派生信息不得倒灌回源模型或公共契约
- 原子边界按可观察语义、不变量和扩展边界划分，不把每个字段机械拆成独立公共 API
- 多个 Tier 2 反复从同一个大型底层 schema `pick` / `omit` 出相同字段子集时，先检查拥有该语义的下层是否缺少命名契约，再决定是否新增或复用原子 schema / type / contract
- Tier 2 自己的默认值、禁用字段、输入收窄和领域组合仍留在 Tier 2；不要为了消除一次 `pick` 把消费方专属限制错误下沉
- 原子契约必须继续复用同一 JSON / IR / registry / pipeline 真源，不得因组合便利复制一套平行词汇或消费路径
