---
name: standard-structure
description: Use when changing retikz package file layout, dependency direction, layer placement, common constants/types/utils/index file organization, or deciding which standard layer skill to load.
---

# Standard Structure

retikz 模块按“无依赖共享层 → IR 契约 → 能力契约 → 契约实现 → 编排/编译”分层。这个 skill 只做总纲和按需路由；不要一次性加载所有子 skill。

## 按需加载

先判断改动层级，只读取对应细则：

| 改动内容 | 读取 |
| --- | --- |
| `shared/`、通用词汇、纯函数、无状态映射、工具类型 | `standard-shared` |
| `schemas/`、Zod schema、IR 类型、`.describe(...)`、`.superRefine(...)` | `standard-schema` |
| `contract/`、`XxxDefinition`、`defineXxx()`、作者侧 API、context | `standard-contract` |
| `providers/`、内置 definition、registry resolver、`BUILTIN_*`、保留名诊断 | `standard-providers` |
| `pipeline/` / `compile/`、lowering、registry 消费、options、`ResolvedXxx` | `standard-pipeline-compile` |

define-registry 能力通常跨多层：先读本总纲判断 scope，再只加载本次会改到的层级 skill。

## 依赖方向

允许依赖方向：

```text
shared <- schemas <- contract <- providers <- pipeline/compile
```

实际 import 方向是右侧消费左侧。`shared` 不依赖业务层；`schemas` 跨出自身时只依赖外部模块和 `shared`；`contract` 不依赖 provider；`providers` 不依赖 pipeline / compile。

## 共性文件拆分

| 文件 | 共性职责 |
| --- | --- |
| `constants.ts` | 稳定常量、const object enum、关键字集合 |
| `types.ts` | 导出类型、由 constants / schema 派生的类型 |
| `utils.ts` | 纯函数 helper；不得承载状态和层级副作用 |
| `define.ts` | 作者侧 define helper；仅 contract 层常见 |
| `registry.ts` | registry 合并、按 key 查找、重复 key 诊断；仅 providers 层常见 |
| `index.ts` | 统一 barrel 导出；不写业务逻辑 |

数组索引、`Map`、`Record<A, B>` 等稳定查表数据放在 `constants.ts`。

简单能力可以合并文件；一旦出现多个职责，优先按上表拆开。

## Barrel 规则

- 目录级 `index.ts` 统一导出当前目录稳定 API。
- 默认用 `export * from './xxx'`。
- 只有需要裁剪公共表面、避免冲突或显式重命名时，才用精选导出。
- 不要从非拥有者模块转手 export 其它层内容；消费方应从拥有者 barrel 直接导入。

## 改代码前检查

1. 这次改动属于哪一层？只加载必要的层级 skill。
2. 新文件是否能按 `constants` / `types` / `utils` / `index` 拆清职责？
3. import 是否沿允许依赖方向走？
4. `index.ts` 是否只是统一导出，没有业务逻辑？
