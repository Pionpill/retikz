# ADR-17：由 Foundation 统一无领域基础 Schema 原子

- 状态：Accepted
- 决策日期：2026-08-09
- 关联：[v0.5 roadmap](../roadmap.md) · [alpha.2 roadmap](./roadmap.md) · [Foundation 基础包设计](../../../../../../../notes/architecture/foundation-design.md) · [Foundation ADR-14](./14-foundation-package.md) · [能力完备性与模块边界](../../../../../../../notes/architecture/capability-design.md) · [原子契约与组合设计](../../../../../../../notes/architecture/atomic-contract-design.md) · [包拓扑](../../../../../../../notes/architecture/package-topology.md)

## 背景与目标

Kernel、Standard、Graph、Data、Plot、Chart 与 Table 已反复定义相同的非空白字符串、正数、非负数、正整数、非负整数和归一化比例约束。部分重复已经产生语义分叉：有的 registry key 只拒绝空串却接受全空白，有的包重新声明 Core 已有的闭区间比例；相同 string / number 叶子约束也散落在完整对象 schema、provider 检查和 adapter wrapper 中。

ADR-14 把 Foundation 冻结为零生产依赖且排除 Zod schema，因此这些无绘图、IR 或领域词汇的原子无法由最低层 owner 统一提供。继续把它们留在 Core 会迫使不应由 Drawing Complete 拥有的通用校验依附绘图包，继续由各领域复制则无法形成单一真源。

本 ADR 修改 ADR-14 的零依赖与 schema 排除边界：Foundation 允许以 Zod 作为唯一生产依赖，并拥有一组闭合、非变换、无领域的 string / number schema 原子。目标是统一叶子约束与失败边界，同时保持完整对象、IR、领域 refinement、默认值和诊断仍由各自 owner 负责。

## 决策：Foundation 只依赖 Zod 并拥有闭合基础 Schema 原子

`@retikz/foundation` 继续位于 Kernel 拓扑最底层并随 kernel release group lockstep 发布，但不再承诺零生产依赖；Zod 是其唯一允许的生产依赖。Foundation 仍只提供包根入口，基础 schema 与既有类型、断言、错误契约从同一根入口直接公开，不建立 schema subpath。

Foundation 只拥有能够脱离 Retikz 绘图、数据和领域词汇独立解释的非变换 string / number 原子。完整对象、数组组合、IR、颜色、几何、parser、默认值、领域 refinement 和诊断继续留在消费 owner。一个原子迁入 Foundation 后，旧 owner 删除同义定义和转发出口；字段 owner 通过组合、描述或收窄形成自己的完整契约。

理由：

1. 基础 string / number 约束已经被多个独立能力域同义复用，放在 Foundation 能消除 Core 与领域包的多份真源
2. 允许唯一的 Zod 依赖比建立独立 schema 发布包更符合当前包拓扑，也让消费方直接复用可执行 schema 而不是再次包装 predicate
3. 限定为闭合、非变换的叶子原子，可以统一输入边界而不让 Foundation 吸收对象结构、领域默认值、IR 或 pipeline 语义

## 基础数据结构与公开契约

Foundation 根入口新增以下稳定 schema：

```ts
import type { ZodType } from 'zod';

export declare const NonBlankStringSchema: ZodType<string>;
export declare const PositiveNumberSchema: ZodType<number>;
export declare const NonNegativeNumberSchema: ZodType<number>;
export declare const PositiveIntegerSchema: ZodType<number>;
export declare const NonNegativeIntegerSchema: ZodType<number>;
export declare const NormalizedFractionSchema: ZodType<number>;
```

各原子的稳定语义为：

- `NonBlankStringSchema` 拒绝空串与全空白字符串，但不 trim 或改写合法值；它与 `assertNonEmptyString` 共享同一空白定义
- `PositiveNumberSchema` 接受严格大于 0 的有限 number
- `NonNegativeNumberSchema` 接受大于等于 0 的有限 number
- `PositiveIntegerSchema` 接受严格大于 0 的安全整数
- `NonNegativeIntegerSchema` 接受大于等于 0 的安全整数
- `NormalizedFractionSchema` 接受闭区间 `[0, 1]` 的有限 number，并从 Core 下沉到 Foundation 成为唯一真源

这些 schema 不 coercion、不 transform、不注入 default / catch，也不冻结输出。Foundation 不再提供单独的 finite schema，因为基础 number schema 已拒绝 `NaN` 和正负无穷；不提供通用 range 或 non-empty array factory。

Foundation 不为这些闭合原子建立 Definition、registry 或 provider。它们没有内置与第三方实现差异；外部组合方直接消费同一 schema object，并在自己的完整 schema 中增加字段描述、默认值或更窄的领域约束。

## 行为、失败语义与兼容性

- 默认行为：所有基础 schema 都是非变换 validator，成功输出与输入值保持同一 string / number 语义；正数拒绝正负零，非负数与归一化比例接受零，归一化比例同时接受 1
- 失败与诊断：非法类型、非有限数、越界值、非安全整数和全空白字符串由 Zod 以对应 issue fail-loud；Foundation 不把 Zod issue 转成 Retikz 全仓 Diagnostic。需要领域错误码、path 前缀或恢复策略的 owner 在自己的边界包装
- 兼容性 / breaking：Foundation 根入口新增运行时 Zod 依赖，任何根入口 runtime import 都接受这一依赖成本。Core 的 `NormalizedFractionSchema` 旧 owner 出口和其它包的同义公共出口直接移除，消费方改从 Foundation 根入口导入，不保留 alias、转发或双轨
- 迁移边界：只有语义完全相同的定义直接迁移。`z.string().min(1)` 允许全空白，普通 non-empty array、Data 概率关系、Polar 半开区间、Table positive dash、CSS color、TextBlock 和 owner-specific error guard 不得机械替换
- React / Vanilla 等价性：schema 原子不新增 authoring DSL；React、Vanilla、headless 与领域 adapter 继续委托同一完整 owner schema，因此对相同输入得到等价解析结果

## 功能与包边界

- 所属能力域与解决的问题：Kernel 基础契约层；解决跨 Drawing、Data、Visualization 与 adapter 的无领域叶子校验重复，不新增独立 Drawing / Data / Visualization 能力域
- 主责包与协作包：Foundation 主责六个基础 schema；Core、Standard、Graph、Data、Plot、Chart、Table 与 adapter 只按真实消费直接依赖并组合，继续拥有完整 schema、默认值、领域 refinement 与错误包装
- 拥有：无领域、非变换的 string / number Zod 原子及其稳定边界；Zod 是唯一生产依赖
- 不拥有：对象 / 数组 schema、IR / JSON 数据模型、parser / coercion、颜色、几何、Definition / registry、provider、compile / lowering、Scene / manifest、Diagnostic、领域错误和恢复语义
- 外部扩展与下游闭环：闭合原子无需动态扩展；完整 owner schema 直接组合 Foundation 原子并继续进入原有 contract、provider、pipeline、adapter、docs 与 schema registry 链路
- 不支持边界：只因写法相似但具有不同开闭区间、空值、默认、唯一性、trim、错误文本或领域关系的约束不进入 Foundation；Foundation 不提供参数化 schema builder 或通用 validation utils

## 架构验证

- 是否可由现有能力组合：现有 Zod 可以在每个包局部组合，但缺少最低层唯一 owner，无法防止同义叶子约束继续分叉
- math / core / render / adapter 责任切分：Foundation 只校验 string / number 原子；Math 继续拥有纯计算且没有真实 import 时保持零依赖；Core 继续拥有完整 Drawing IR/schema；Render 与 adapter 不创建平行 schema，只消费对应 owner 的完整输入
- 是否需要新 IR / contract / registry；不采用 registry 时的理由：不新增 IR、Definition 或 registry。六个原子是闭合 validator，没有第三方实现、动态解析或生命周期需求
- Scene / manifest / renderer / diagnostics 如何闭环：原子只参与既有输入 schema 的叶子校验，不改变合法输入进入 Scene / manifest / renderer 的路径；领域 owner 继续生成自己的错误和 Diagnostic
- provenance / locator / Interaction Readiness 是否适用：基础 scalar/string schema 不产生 occurrence、locator 或交互 target，因此不新增相关契约
- 结论：下沉

## 被否决方案

- 继续由 Core scalar schema 统一：能减少一部分重复，但让无绘图语义原子继续依附 Drawing owner，且不能服务未来不依赖 Core 的 consumer
- 建立独立 `@retikz/schema` 包：边界清晰但增加发布包、版本和依赖治理；当前 Foundation 已是跨能力域原子 owner，引入唯一 Zod 依赖即可承接
- 使用 `@retikz/foundation/schema` subpath：可以让既有根入口更轻，但形成第二公开入口并破坏 Foundation root-only 规则；消费方也更容易从不同入口获得分叉公共面
- 只提供 predicate / assertion：不能直接作为 Zod 对象 schema 的叶子真源，消费方仍会重复包装和错误边界
- 一次下沉所有 `.min(1)`、positive、nonnegative 与 non-empty array：表面语法相同不代表空白、开闭区间、默认值、唯一性和领域关系相同，会造成公开行为收紧或放宽

## 测试策略摘要

验证必须证明六个 schema 的成功输出不变形，string 的空串、全空白与 Unicode 空白边界稳定，number 的类型、正负零、边界、非有限值、小数和安全整数语义稳定；`assertNonEmptyString` 与 `NonBlankStringSchema` 对空白的判定一致。公共面与发布证据必须证明 Zod 是唯一生产依赖、六个 schema 只从 Foundation 根入口导出、旧 owner 无同义定义或转发。消费方证据必须证明同义迁移不改变完整 schema 的默认值、描述、strict object、领域 refinement、错误包装、JSON round-trip 与 React / Vanilla / headless 等价性。

## 完工摘要

六个非变换标量 schema 已由 Foundation 根入口统一提供，Zod 是唯一生产依赖。Core 的归一化比例旧 owner 与 Graph 的非空白字符串旧公共出口均已移除；Kernel、Standard、Graph、Data、Plot、Chart 与 Table 只组合语义完全相同的叶子，领域对象、默认值、refinement、颜色与诊断边界保持在原 owner。

验证覆盖基础标量边界、旧公共面移除、消费方完整 schema、headless 与 adapter 等价性、发布产物入口、双语文档与 changelog。无已知遗留风险需要改变本 ADR 的公开契约或包边界。

## 不在本 ADR 范围

- Foundation 对象、数组、IR、JSON-safe data、parser、coercion、transform、range factory、颜色或几何 schema
- 全仓机械替换 `z.string().min(1)`、non-empty array、positive / nonnegative 写法或领域运行时 guard
- 修改 Scene、manifest、renderer、Definition / registry、compile / lowering 或领域默认值
- 修复 React shape finite guard、Star 点数范围、Legend artifact key、Plot palette 空白颜色等独立行为问题
- 新增兼容 alias、旧 owner 转发、schema subpath 或独立 schema 发布包
