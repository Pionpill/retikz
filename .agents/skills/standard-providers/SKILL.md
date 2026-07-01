---
name: standard-providers
description: Use when changing retikz providers layer code, builtin definitions, registry resolvers, BUILTIN_* collections, reserved or removed keys, custom definition merging, provider diagnostics, or implementation of contract capabilities.
---

# Standard Providers

`providers/` 是契约实现层：实现内置 definition，合并用户 definition，并向 pipeline / compile 提供可消费的 registry。它可以依赖 `shared`、`schemas`、`contract`，不依赖 pipeline / compile。

## 职责

- 提供内置 definition。
- 建立内置 definition 数组、索引和默认 provider。
- 合并内置与用户 definition。
- 诊断重复 key、内置冲突、保留名、已移除名。
- 暴露 registry resolver 和按 key 查询 helper。

不要做：

- 让消费侧复制内置白名单。
- 在 provider 内依赖 pipeline / compile 的临时状态。
- 在 provider 内定义 IR schema。
- 把用户 definition 放到与内置不同的旁路逻辑。

## 文件结构

| 文件 | 职责 |
| --- | --- |
| `providers/<capability>/definitions.ts` | 内置 definition 集合，或组装各内置项 |
| `providers/<capability>/registry.ts` | `resolveXxxRegistry()`、索引 map、重复 key / 保留名诊断 |
| `providers/<capability>/<builtin>.ts` | 复杂内置项的单独实现 |
| `providers/<capability>/index.ts` | barrel 导出 |

小能力可以合并文件，但不要混淆内置实现、registry 合并和 public contract。

## 命名

| 格式 | 职能 |
| --- | --- |
| `BUILTIN_XXXS` | 内置 definition 数组或集合 |
| `BUILTIN_XXX_DEFINITIONS_BY_<KEY>` | 按 `TYPE` / `KIND` / `NAME` 建索引 map |
| `RESERVED_XXX_<KEYS>` / `REMOVED_XXX_<KEYS>` | 保留名和已移除名诊断依据 |
| `resolveXxxRegistry()` | 合并内置和用户 definition，返回消费侧 registry |
| `xxxDefinitionOf()` | 按 key 查询 definition |
| `extractXxxType|Kind|Name()` | 从 IR 或 option 抽取 registry key |

`<KEY>` 后缀必须匹配真实 discriminator；不要 `kind` / `name` 混用。

## Registry 合并规则

- 内置先注册，用户 definition 后注册。
- 用户 definition 可以使用自定义 key，但不能覆盖内置保留 key，除非明确设计为 override。
- 重复用户 key fail-loud，不静默 last-wins。
- fallback 是 registry 策略，不是消费侧旁路；例如“boundary provider 优先、shape fallback 其次”应写在 resolver/lookup 阶段。
- resolver 返回的结构应让 pipeline / compile 只消费解析结果，不重新判断“内置特殊情况”。

## 内置实现

- 内置项也通过 `defineXxx()` 或同等 contract 入口创建。
- 内置项的名称、kind、type 使用 schema / shared vocabulary 的 const object enum 成员，不写裸字符串。
- 复杂内置实现可以拆 helper，但 helper 留在 provider 内部，除非跨层复用才抽到 `shared`。

## 改代码前检查

1. 内置和用户 definition 是否同路注册、同路解析、同路消费？
2. 是否把 key 冲突、保留名和已移除名诊断集中在 registry resolver？
3. pipeline / compile 是否只消费 resolver 输出，而不是复制内置列表？
4. provider 是否错误依赖了 pipeline / compile？
5. 新增内置项是否补了索引、默认值、测试和必要文档？
