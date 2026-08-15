---
name: standard-resolve
description: Use when changing Core, Plot, or another vertical domain package's resolve layer, Source IR-to-Canonical conversion, resolveXxx, XxxResolveContext, CanonicalXxx, EffectiveXxx, XxxResolution, context-dependent defaults, priority or cascade handling, registry/reference/host/data resolution, or data-shaping logic currently mixed into pipeline/compile.
---

# Standard Resolve

纵向领域包只设 `resolve/`，不设分层意义的 `normalize/`。resolver 消费 Source IR 与当前上下文，统一产出下游唯一结构：

```text
Source IR (`IRXxx`) + `XxxResolveContext`
  -> resolveXxx
  -> Canonical (`CanonicalXxx`) / domain resolution (`XxxResolution`)
  -> lower / layout / emit
```

`resolve` 是数据结构确定化层，不要求一次全局前置执行。compile / pipeline 可以在 traversal、data、reference、host 或 layout context 就绪时调度对应 resolver，但不能自行解释默认值、优先级或等价写法。

## 职责

| 层                    | 负责                                                                                                                                     | 不负责                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| schema / parse        | Source IR 的 JSON 形态、持久化契约和入口校验                                                                                             | context lookup、领域默认、Canonical                             |
| resolve               | IR shorthand、领域默认、cascade / 继承 / 覆盖优先级、registry / reference / host / data lookup、领域值转换、补全后不变量与上下文失败诊断 | unknown parse、traversal 调度、lowering、layout、primitive 输出 |
| pipeline / compile    | 创建和维护上下文、确定依赖顺序、traversal 与阶段调度                                                                                     | 重复 resolver 的 merge、fallback、默认、校验和值转换            |
| lower / layout / emit | 消费已经确定的结构并执行语义 lowering、几何计算或输出                                                                                    | 继续补 Canonical 字段或解释配置优先级                           |

schema 已覆盖或 TypeScript 已保证的结构不得在 resolve 重复校验。resolve 只保留 Canonical 化后才出现的领域不变量、provider / reference 查找失败及其它真实上下文错误。

## Context 边界

- compile / pipeline 拥有 context 生命周期与动态状态，按当前阶段投影为窄 `XxxResolveContext`
- `resolve/<domain>/types.ts` 定义 `XxxResolveContext`；resolver 不反向 import compile / pipeline 私有类型
- context 可以包含 registry、effective parent state、data view、host、reference lookup、measurement 或显式 diagnostics collector，但所有输入必须显式传递并保持确定性
- 动态上下文不能提前获得时，在上下文就绪点调用 resolver；不要因此把结构处理留在 traversal、layout 或 emit
- 真正依赖 layout 结果的几何计算仍属于 layout；它可以形成准确命名的 layout / compile 消费态，不伪装成 Canonical 默认

## 类型与命名

目录、文件和符号名以 `standard-name` 为唯一真源：

| 概念                                                       | 命名                 |
| ---------------------------------------------------------- | -------------------- |
| 唯一完整内部形态                                           | `CanonicalXxx`       |
| resolver 的窄输入上下文                                    | `XxxResolveContext`  |
| cascade / 继承后的有效值                                   | `EffectiveXxx`       |
| 同时携带 value、provider、provenance 或 diagnostics 的结果 | `XxxResolution`      |
| Source IR 到内部确定形态                                   | `resolveXxx`         |
| provider registry 合并                                     | `resolveXxxRegistry` |

不要使用泛化 `ResolvedXxx`，也不要为非持久化的 Canonical、Effective 或 Resolution 定义 `XxxSchema` / `IRXxx`。

## 组织与依赖

```text
resolve/<domain>/
  resolve.ts
  types.ts
  <topic>.ts   # 仅在有独立语义、测试边界或多个调用点时
```

允许依赖方向：

```text
shared / schemas / contract / providers <- resolve <- pipeline / compile
```

`CanonicalXxx`、`XxxResolveContext` 与必要的 `XxxResolution` 定义在 `resolve/<domain>/types.ts`。纯转换 helper 与 resolver 相邻，并按真实动作使用 `expandXxx`、`mergeXxx`、`applyXxx`、`computeXxx` 或准确领域名；不要保留一对一委托的阶段级 `normalizeXxx`。

数学或值域语义中的 `normalizeVector`、`normalizeDegrees` 等不属于分层阶段限制；是否使用 `normalize` 由其领域含义决定。

## 改动检查

1. `resolveXxx` 是否消费明确的 Source IR 与窄 context，并产出下游唯一结构？
2. shorthand、默认、优先级、lookup、领域值转换和补全后不变量是否只实现一次？
3. compile / pipeline 是否只管理 context 生命周期、依赖顺序和调度？
4. lower / layout / emit 是否只消费已确定结构，没有继续补字段或解释优先级？
5. Canonical、Effective、Resolution 是否均为 TypeScript 类型且没有平行 schema？
6. 是否删除了纵向领域包的阶段级 `normalize/`、`normalizeXxx` 与 `NormalizeContext`？
