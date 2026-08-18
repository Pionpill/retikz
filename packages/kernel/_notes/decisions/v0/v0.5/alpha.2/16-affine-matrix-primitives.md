# ADR-16：统一二维仿射矩阵原子

- 状态：Accepted
- 决策日期：2026-08-09
- 关联：[ADR-17](./17-foundation-schema-primitives.md)

## 背景与目标

Retikz 的 TeX SVG lowering 与 Render hydration 都需要把二维平移、缩放和旋转组合为六元组仿射矩阵，再将矩阵应用于平面坐标。两者当前分别维护相同的 `[a,b,c,d,e,f]` 表示、单位矩阵、矩阵复合公式和点映射公式，已经形成跨发布包的第二实现真源。

这组计算不依赖 SVG parser、Core IR、Scene、renderer context 或 TeX 诊断，只表达通用二维数值变换，长期 owner 应为零依赖 `@retikz/math`。本 ADR 的目标是冻结唯一的仿射矩阵原子契约，使 TeX 与 Render 直接复用 Math，同时保持现有 transform 解析、Scene 遍历、包围盒聚合、stroke 限制和失败语义不变。

## 决策：由 Math 提供闭合的二维仿射矩阵原子

`@retikz/math` 公开 SVG / Canvas 同序的二维仿射六元组、运行时不可变的单位矩阵、固定顺序的矩阵复合和点映射。TeX 与 Render 直接消费这些原子，不再维护等价公式；各自继续拥有把领域输入转换为矩阵以及消费变换结果的过程。

理由：

1. 六元组、复合和点映射只使用 number 与已有 `Position`，可以脱离绘图、renderer 和 parser 语义独立解释
2. TeX 与 Render 已经证明两个独立发布包需要同一契约，Math 作为零依赖纯计算 owner 可以消除数值语义分叉而不形成反向依赖
3. 只下沉最小计算原子，可以统一真源，同时不把 SVG 语法、Scene 结构、诊断或 stroke policy 错放进 Math

## 基础数据结构与公开契约

Math 根入口新增以下稳定契约：

```ts
export type AffineMatrix = readonly [number, number, number, number, number, number];

export declare const AFFINE_IDENTITY: AffineMatrix;

export declare const multiplyAffine: (outer: AffineMatrix, inner: AffineMatrix) => AffineMatrix;

export declare const applyAffine: (matrix: AffineMatrix, point: Position) => Position;
```

`AffineMatrix` 固定采用 SVG / Canvas 的 `[a,b,c,d,e,f]` 顺序：

```text
x' = a*x + c*y + e
y' = b*x + d*y + f
```

`multiplyAffine(outer, inner)` 返回 `outer × inner`，即对点先应用 `inner`，再应用 `outer`。复合与点映射返回新 tuple，不修改输入。`AFFINE_IDENTITY` 是跨 consumer 共享的单例值，除 readonly 类型约束外还必须保证运行时不可变；普通运算结果由调用方独占，不承诺额外冻结。

## 行为、失败语义与兼容性

- 默认行为：单位矩阵左右复合均保持另一矩阵；复合顺序严格按 `outer × inner`；点映射按六元组约定返回新的 `Position`
- 失败与诊断：Math 不解析 unknown，不检查矩阵是否有限、可逆或 similarity transform，也不新增领域错误。输入 number 按 JavaScript 数值运算传播；需要 finite、non-singular 或 stroke 限制的 caller 继续在自己的边界校验和诊断
- 兼容性 / breaking：Math 新增公开 API，属于 additive change。TeX 与 Render 被替换的是私有重复实现，不删除其既有公开输入、输出或错误 class；不通过 Core、Render 或 TeX 转发 Math 契约
- React / Vanilla 等价性：本 ADR 不新增 authoring 语法、IR 或 adapter API；React、Vanilla 与 headless 路径继续消费相同的 Core Scene / Render 结果，因此不需要专属入口

## 功能与包边界

- 所属能力域与解决的问题：Kernel 纯计算底座；解决二维仿射数值原子在多个执行包重复实现的问题
- 主责包与协作包：`@retikz/math` 主责矩阵表示与运算；`@retikz/render` 协作消费 Scene transform；`@retikz/tex` 协作消费 SVG transform
- 拥有：六元组 ABI、运行时不可变单位矩阵、确定性的矩阵复合和点映射
- 不拥有：SVG transform parser、DOMMatrix、Core Transform / IR / Scene、group traversal、hydration context、bbox、可逆性、similarity、stroke policy、renderer 或 TeX diagnostic
- 外部扩展与下游闭环：该能力是闭合数值原子，不提供 Definition / registry。TeX 与 Render 直接组合 Math 原子到现有 parser / hydration 链路，最终 Core Scene、SVG / Canvas 输出和诊断保持原有 owner
- 不支持边界：不提供 mutable matrix class、任意维矩阵、矩阵求逆/分解、CSS transform 解析或 caller 专属 transform builder；未来新增运算必须重新证明跨包需求和稳定数值契约

## 最终结果

Math 已提供冻结的单位矩阵、固定顺序复合与点映射公共原子；Render hydration 与 TeX SVG lowering 已改为直接消费该真源，原有 Scene 编排、SVG 解析、有限非奇异与 similarity 检查、stroke policy 和领域诊断仍由各自包负责。未发现需要改变本 ADR 公开契约或包边界的遗留风险。

## 长期边界

- Foundation、directed angle sweep、quantile、linear sampling 或其它本轮审计候选
- Core Transform schema、Scene、manifest、renderer 输出格式或 hydration public API
- SVG / CSS transform 语法扩展、DOMMatrix 接入、matrix inverse / decomposition
- TeX stroke policy、MathJax profile、parser diagnostic 或 Render bbox 精度策略调整
