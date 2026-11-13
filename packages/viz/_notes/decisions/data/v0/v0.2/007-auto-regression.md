---
description: 统一拟合优度评价，以 auto 方法从内置与自定义候选中按组选择最佳模型，复用现有拟合与趋势绘制链路
keywords: 自动拟合、auto、Regression、R2、候选方法、拟合优度、candidates
---

# ADR-007：拟合优度评价与自动方法选择

- 状态：Accepted
- 决策日期：2026-11-11
- 关联：[roadmap](./roadmap.md) · [002](./002-transform-execution.md) · [Chart 006](../../../chart/v0/v0.1/006-regression.md) · [Chart 017](../../../chart/v0/v0.1/017-regression-definition-and-trend-curves.md) · [Data 能力完备设计](../../../../architecture/data-capability-complete.md)

## 背景与目标

同一组观测可以用不同方法拟合。作者需要统一评价这些模型，并可将方法声明为自动选择，从指定候选中绘制拟合优度最高的一条趋势。内置方法和自定义方法必须使用相同数据、评分与失败规则，不能让各方法自报不可比较的分数。

自动选择属于拟合方法语义，不是另一种图元或 Chart 属性。Data 拥有模型评价与选择；Smooth 继续负责分组、预测采样与来源关联，Chart 继续组织观测点和趋势，Plot 继续执行视觉映射与曲线连接。

## 决策：将 auto 注册为组合拟合方法

`method` 增加 `kind: 'auto'`。它通过与普通方法相同的 Definition、Implementation、registry 和执行入口接入，声明候选拟合依赖，在每组观测上选择一个模型。返回值仍满足现有 `RegressionModel.predict(x)` 契约，趋势绘制不增加自动模式分支。

评分由 Data 的统一能力计算，自定义候选只需实现既有拟合模型契约。当前评分固定使用原始因变量空间中的决定系数 R²，不增加可配置评分器、评分 registry 或自定义排序回调。

理由：

1. `auto` 与具体方法都描述如何从观测得到预测模型，复用 method 保持单一配置真源
2. 使用同一观测和同一评分算法才能公平比较，包括对数变换后拟合及外部实现的方法
3. 候选依赖必须参与现有执行准备，不能在运行时绕过 active registry 或外部执行能力检查
4. 选择模型与采样、坐标、曲线连接相互独立，调整绘制参数不应改变拟合优度排名

## 方法声明与默认候选

```ts
method: { kind: 'auto' }

method: {
  kind: 'auto',
  candidates: [
    'linear',
    { kind: 'polynomial', order: 3 },
    { kind: 'custom-fit', tension: 0.5 },
  ],
}
```

`candidates` 为可选的有序非空数组，每项是已注册方法名字符串，或包含 `kind` 的 JSON-safe 方法对象。字符串表示 `{ kind: name }`，参数默认值由对应 Definition 的精确 schema 提供；对象复用现有开放 `IRRegressionMethod` envelope，不接受无 kind 的 `{}`。该简写只属于 candidates，不据此扩大普通 method 的输入形式。

省略 candidates 时，按固定顺序比较 `linear`、`quadratic`、`logarithmic`、`exponential`、`power`。二次多项式保留，仅默认排除 `polynomial`。默认集合不随自定义 registry 增长；显式数组完全替换默认集合，可以包含 polynomial 和已注册的自定义方法。同一种方法可以以不同参数重复出现，保留作者顺序，不按 kind 去重。

不新增并列 auto 属性，不使用 true/false 作为 method 值。省略整个 method 时仍使用 linear；自动模式必须显式声明。候选中禁止直接或间接包含 auto，候选依赖循环在执行准备阶段报错，不递归展开自动搜索。

## 统一拟合优度

Data 提供 `evaluateRegression(pairs, model)`，接收同一组有限 `RegressionPair` 与 `RegressionModel`，返回：

```ts
type RegressionScore = Readonly<{
  rSquared: number | null;
  meanSquaredError: number;
}>;
```

令观测值为 yᵢ、预测值为 ŷᵢ = model.predict(xᵢ)、观测均值为 ȳ：

- SSE = Σ(yᵢ − ŷᵢ)²
- SST = Σ(yᵢ − ȳ)²
- meanSquaredError = SSE / n
- SST > 0 时，rSquared = 1 − SSE / SST
- SST = 0 时，rSquared = null，以 meanSquaredError 比较常量响应的拟合误差；完全拟合的误差为 0

至少需要两个有限观测。候选共享同一批观测及相同的重复值权重，不允许某个候选另行丢弃不利样本。非有限 x/y 由现有 Smooth 输入政策在分组后统一处理，评分不再次筛选数据。对数、指数、幂方法必须先还原预测到原始 y 空间再评分。

R² 越大越好，最高为 1，负值保留，不裁剪到 [0, 1]。自动选择按 meanSquaredError 最小确定胜者：对同一非恒定观测，这与最大化 R² 完全等价，同时避免 R² 舍入导致的假并列，并覆盖常量响应。误差完全相等时取数组中靠前的候选，不引入近似相等阈值或隐含复杂度惩罚。

评分以真实观测 x 处的模型预测计算，与 sampleCount、curve、坐标变换、画布尺寸和观测点显示无关。实现应使用数值稳定的中心化与累计计算；无法表示为有限误差、非有限预测或评分算术失败均明确报错，不作为低分或静默排除。

这里评价当前观测的样本内拟合，不宣称泛化、预测可靠性或因果关系。不采用交叉验证、调整后 R²、AIC/BIC 或正则化惩罚；显式纳入高阶 polynomial 可能使更复杂的模型获胜。

## 候选依赖与执行契约

沿用 Data 002 的 Definition 与 Implementation 分离。拟合 Definition 可声明由已解析参数导出的有序拟合依赖，auto 的依赖即其候选。依赖声明只描述方法，不读取观测或执行拟合；准备阶段解析所有候选的精确参数、注册身份及传递依赖。默认参数仅在对应 Definition 边界物化，不在 Chart 或 adapter 复制。

拟合 Implementation 的运行时上下文可按依赖下标调用已准备的拟合能力，传入当前组观测和可选预测范围；不得自由查找未声明的方法。此能力对内置与自定义组合拟合实现一致开放，不为 auto 增加私有候选 registry。同一 Implementation 至少提供同步 `fit` 或异步 `fitAsync` 之一，也可同时提供两者。`fit` 的上下文仅包含同步依赖，`fitAsync` 的上下文允许 Promise，二者共享候选顺序、评分和失败规则。异步执行器优先使用 `fitAsync`；省略时复用 `fit`，但必须在计算前确认其完整传递依赖均提供同步能力。同步入口不调用 `fitAsync`，不通过执行回调探测 Promise，也不将异步依赖强转为同步。异步完成顺序不影响胜者。

必要接口增量如下；已有 schema、validateExtent 和模型 predict 契约继续保留：

| 契约                                                               | 增量语义                                                                                                  |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| RegressionDefinition.dependencies(operation)                       | 可选回调，返回有序 ReadonlyArray<IRRegressionMethod>；省略表示无拟合依赖                                  |
| RegressionImplementation.fit / fitAsync(pairs, operation, context) | 分别声明同步与异步能力，至少一个；具体拟合方法可不消费上下文                                              |
| RegressionFitContext.extent                                        | 可选的只读预测范围，属于当前组请求                                                                        |
| RegressionFitContext.fitRegression(index, pairs)                   | 调用当前 Definition 已声明的候选依赖，继承当前 extent，返回模型或 Promise；同步 specialization 只返回模型 |
| RegressionResolution.fit(pairs, options?)                          | 同步独立拟合入口以 options.extent 接收同一预测域要求，不将异步实现放入同步集合                            |

对依赖的调用沿统一适用性、异常与模型预测边界，不重新解析已经准备的参数。不存在的依赖下标或未声明依赖属于实现错误。

预测范围是本次拟合请求的可选运行时输入，不进入模型持久化状态。Smooth 在选择前确定并传入最终 extent，候选按其 Definition 的 validateExtent 校验该范围；Data 独立拟合未传范围时只评价观测适用性。获胜模型在当前组复用，不再次拟合，避免自定义实现重复计算或出现不同结果。不同组不得共享上一次的胜者或可变模型。

外部 executor 收到包含 auto 和完整候选依赖的语义计划，只有能执行完整比较契约时才能声明支持。external 不允许仅运行某一个候选冒充 auto；hybrid 的整阶段本地选择遵守 Data 002，不能以缺少某个候选实现为由悄悄缩小搜索集合。

## 适用性与失败语义

Data 增加统一错误码 `DATA_REGRESSION_NOT_APPLICABLE`，由同一个 RetikzDataError 表达。内置与自定义方法均可据此明确报告当前观测或预测域不适用，包括样本不足、秩不足和方法所需的正值域不满足。普通显式方法遇到该错误仍失败；只有 auto 在逐候选评价中将其记录为排除项。

错误包装保留该分类和 cause；不得匹配 message 或将任意 RetikzDataError 都视为可排除。参数非法、未注册方法、缺少 implementation、依赖循环、用户回调异常、非有限预测、数值溢出以及取消均终止本次选择，不继续搜索以掩盖问题。自定义方法未明确报告不适用时，其失败按实现异常处理。

候选必须对观测、预测域和评分均成立才参与排名。全部不适用时，整次拟合失败，诊断按候选顺序包含下标、方法声明和排除原因，并保留分组及作者路径。一个组失败不发布其他组的部分结果，不退回 linear 或只绘制散点。

## 分组、绘制与入口一致性

每个 Smooth 实际分组独立选择；Chart series 与 facet 仍决定其输入范围，不按整张图强制共享一种方法。原始观测层不因候选数量增加，auto 每组只提供一个获胜模型和一条趋势。

主 method、extraMethods 中的 method 以及 RegressionMark 覆盖的 method 都可使用 auto。extraMethods 仍表示另外绘制的趋势，不隐式参与主方法比较；每一项 auto 独立选择。RegressionMark 继续遵守既有属性继承与 extraMethods 整体替换规则，showPoints 只决定观测图元显示。

React、Vanilla 和直接 JSON IR 表达相同 method；自定义 Definition 与 Implementation 继续通过运行时 options/provider 注入，不进入 JSON。Smooth 的输出字段、采样数量、来源关联以及 Plot Path 的曲线连接保持不变。不新增 Chart 评分字段、候选榜单、自动图例、renderer 分支或持久化模型函数。

本决策扩展 Data 拟合契约及其执行依赖；Chart 017 的方法扩展原则继续有效，Definition/Implementation 分离以 Data 002 为准。普通方法原有数值算法和失败行为保持；auto 内部可排除明确不适用候选是新增组合语义，不放宽显式方法的失败规则。旧的 Definition/Implementation 组合接口不恢复，不保留平行实现通路。
