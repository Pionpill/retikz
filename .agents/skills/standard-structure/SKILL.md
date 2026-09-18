---
name: standard-structure
description: Use when changing Retikz package structure, dependencies, schemas, definitions, providers, resolvers, Vanilla normalization, compile pipelines, or Tier 2 composites.
---

# 分层规范

先确定能力 owner，再选实际改动层。Source IR 是持久化契约；Vanilla Input 是 authoring 输入；Canonical 是领域内部确定形态。三者不建立平行 schema。

## 必须保持

- 领域包拥有 schema、resolve、lowering 与 Scene 语义；Vanilla 组装 Input → IR，React 等 adapter 调度 Vanilla，不绕开它新建 IR builder。
- 外部 unknown 在 parse/schema 边界校验；内部按类型契约消费，仅保留补全后不变量与真实上下文错误。
- schema 声明默认值；resolve 处理继承优先级、上下文 lookup 与默认应用时机；pipeline/compile 管理上下文及调度。
- 依赖沿 shared → schemas → contract → providers → resolve → pipeline/compile，不反向导入。
- 命名读 [standard-name](../standard-name/SKILL.md)；公共 JSDoc 读 [JSDoc](../docs-doc-reference/references/jsdoc.md)。

## 按改动加载

| 场景                                     | 必读 reference                                       |
| ---------------------------------------- | ---------------------------------------------------- |
| 包职责、层级迁移、parse 或信任边界       | [所有权与数据边界](references/boundaries.md)         |
| 跨 owner 导入、barrel、公共导出          | [导入导出](references/imports.md)                    |
| shared 词汇、纯工具                      | [shared](references/shared.md)                       |
| Zod、Source IR、默认、refinement         | [schema](references/schema.md)                       |
| Definition、defineXxx、能力回调          | [contract](references/contract.md)                   |
| 内置 definition、registry 合并           | [providers](references/providers.md)                 |
| Canonical、继承、lookup、领域转换        | [resolve](references/resolve.md)                     |
| Vanilla Input 与 authoring shorthand     | [normalize](references/normalize.md)                 |
| lowering、layout、emit、context 生命周期 | [pipeline / compile](references/pipeline-compile.md) |
| Tier 2 composite 设计、下层 surface 复用 | [Tier 2 复用](references/tier2-reuse.md)             |
| React DSL 文件职责与依赖                 | [React DSL](references/react-dsl.md)                 |

跨层任务只加载实际涉及的层；不要因修改单个 schema 读取整套规范。公共能力变化仍须执行根 AGENTS 的设计、测试契约和文档同步要求。
