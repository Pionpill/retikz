---
name: standard-normalize
description: Use when changing Vanilla API package authoring normalization, including @retikz/vanilla, @retikz/plot-vanilla, or another *-vanilla package's InputXxx, normalizeXxx, authoring shorthand, typed input invariants, and Input-to-Source-IR assembly.
---

# Standard Normalize

分层意义的 `normalize/` 只属于 Vanilla API 包，负责把 TypeScript authoring input 组装为领域 Source IR：

```text
Input (`InputXxx`) -> normalizeXxx -> Source IR (`IRXxx`)
```

Core、Plot 等纵向领域包不设 `normalize/`、阶段级 `normalizeXxx` 或 `NormalizeContext`；它们的 Source IR 到下游唯一结构统一遵循 `standard-resolve`。

## 职责

Vanilla normalize 负责：

- authoring shorthand 与便利字段组装
- 已类型化 Input 的稳定字段映射
- TypeScript 无法表达且 schema 尚未覆盖的 authoring 组合不变量
- 保留显式 `0`、`false`、空字符串与空数组
- 输出领域 owner 定义的 `IRXxx`

Vanilla normalize 不负责：

- `unknown`、JSON、字符串或序列化输入的 parse / schema 校验
- IR 紧凑写法展开、领域默认、Canonical 或领域值转换
- registry、theme、data、host、reference、DOM 或 runtime context
- warning、lowering、layout、emit 或 renderer 输出

## 所有权与依赖

- `InputXxx` 与 `normalizeXxx` 只定义在 `@retikz/vanilla`、`@retikz/plot-vanilla` 等 Vanilla API 包
- `normalize/` 只依赖目标领域公开的 `shared` / `schemas` / `IRXxx`；不得依赖 contract、providers、resolve、pipeline、compile、runtime、DOM 或 renderer
- React 与其它 framework adapter 只构建对应 Vanilla `InputXxx` 并调度 `normalizeXxx`；不得绕过 Vanilla 建立平行 Source IR builder
- 领域默认、IR shorthand、上下文优先级与 Canonical 归属纵向领域包 `resolve/`

## 组织与命名

```text
normalize/<domain>/
  normalize.ts  # normalizeXxx: InputXxx -> IRXxx
  types.ts      # InputXxx 与 owner-local helper types
```

小型 domain 保持相邻文件；只有出现独立概念、测试边界或多个调用点才拆 topic 文件。不要建立跨包泛化 normalizer、空目录或一对一转发函数。

数学或值域语义中的 `normalizeVector`、`normalizeDegrees` 等不属于 authoring 阶段命名，按其真实领域语义判断。

## 与相邻阶段的区分

| 层 / 函数                      | 输入                            | 输出                          | 主要职责                   |
| ------------------------------ | ------------------------------- | ----------------------------- | -------------------------- |
| `parseXxx` / `parse/`          | `unknown`、字符串、序列化数据   | Source IR                     | 外部输入形态校验与 parse   |
| `normalizeXxx` / Vanilla API   | TypeScript `InputXxx`           | Source IR                     | authoring 组装             |
| `resolveXxx` / vertical domain | Source IR + `XxxResolveContext` | Canonical / domain resolution | 数据结构确定化与上下文解析 |
| `lowerXxx` / pipeline          | Canonical / domain resolution   | 下层 IR / command             | 语义 lowering              |

## 改动检查

1. 当前 owner 是否为 Vanilla API 包，而非 Core、Plot 等纵向领域包？
2. `normalizeXxx` 是否只执行 `InputXxx -> IRXxx`，且不读取 compile/runtime context？
3. `unknown` 校验是否仍只在 parse / schema 边界进行？
4. 是否保留显式 falsy 值并避免复制领域默认、优先级或 Canonical 逻辑？
5. framework adapter 是否只调度 Vanilla normalize，没有建立平行 IR builder？
