---
description: 统一内置与自定义拟合方法的 Definition 与 registry，以固定采样和过点曲线绘制趋势
keywords: Regression、Definition、registry、extraMethods、CatmullRom、curve、采样
---

# ADR-017：可扩展拟合方法与趋势线绘制

- 状态：Accepted
- 决策日期：2026-09-28
- 关联：[roadmap](./roadmap.md) · [006](./006-regression.md) · [Chart 封装完备设计](../../../../architecture/chart-encapsulation-complete.md) · [Data 能力完备设计](../../../../architecture/data-capability-complete.md) · [Plot 可视化完备设计](../../../../architecture/plot-visualization-complete.md)

## 背景与目标

Regression 当前通过闭合的方法集合拟合，再以折线连接固定数量的预测点。复杂函数在较大画布上可能出现明显折角，外部算法也无法作为普通拟合方法进入相同主链。

本决策统一解决方法扩展与趋势连接方式。继续使用固定 sampleCount，不引入画布误差阈值、自适应采样或自动增加采样点。过点曲线改善连接的连续性，但不承诺采样之间严格等于真实函数，也不提供无限放大后的误差保证。

## 决策：统一拟合 Definition，复用 Plot 曲线绘制

拟合能力由 Data 拥有：输入有限数值观测及方法参数，输出可计算预测值的运行时模型。内置方法与外部方法统一通过 RegressionDefinition、defineRegression 和 resolveRegressionRegistry 注册与消费，不保留按内置 kind 分派算法的旁路。

Plot 的 Smooth 消费该能力，负责分组、预测采样与数据来源关联；Path 负责尺度、坐标投影和曲线连接。Chart 继续组织唯一观测层、主趋势与 extraMethods 趋势，不维护第二套拟合 registry。纯拟合算法从 Plot 归入 Data；Smooth 既有操作 envelope、分组和输出字段语义保持不变，本决策不迁移其他 transform。

默认连接方式采用 Plot 既有 catmullRom，沿 Core smooth step 与 Math Catmull–Rom 到三次贝塞尔的链路绘制。算法经过采样点，但允许点间过冲。显式 linear 可以保留折线连接；其余连接方式复用 Plot Path 已公开的 curve 契约，不建立另一套 Chart 曲线枚举或曲线 registry。

Data 只负责模型拟合和预测，不声明绘图几何。所有方法统一采用完整固定采样，由 Plot 连接预测点，不提供直线专用优化。

## 拟合方法与运行时注册契约

方法 operation 以 kind 为唯一判别字段，其余内容为 JSON 参数。内置 linear、quadratic、polynomial、logarithmic、exponential、power 的原有配置和数值语义保持不变；polynomial.order 仍为 2–6，默认 3。开放 operation 复用 Foundation 的 OpenString 与 JSON 原子，允许任意已注册方法，不另设 custom 分支。

以下为 Data 拥有的最小公开契约形态；泛型 operation 的运行时 schema 是精确参数真源：

```ts
type RegressionPair = Readonly<{ x: number; y: number }>;
type RegressionModel = Readonly<{ predict: (x: number) => number }>;

type RegressionDefinition<TSource extends IRRegressionMethod, TOperation = TSource> = {
  schema: ZodType<TOperation, TSource>;
  fit: (pairs: ReadonlyArray<RegressionPair>, operation: TOperation) => RegressionModel;
  validateExtent?: (operation: TOperation, extent: readonly [number, number]) => void;
};

// 泛型保留 Definition 作者的参数推断
const definition = defineRegression({ schema, fit, validateExtent });
const registry = resolveRegressionRegistry(customDefinitions);
```

- schema 必须包含非空字面量 kind，注册键从 schema 提取，不重复保存 name 或 kind。
- fit 是同步纯计算；接收当前组过滤后的观测，不能修改输入、访问 renderer 或要求 DOM。模型与函数只在本次运行时有效，不进入 IR、数据行或持久化结果。
- validateExtent 校验方法专有的采样域，例如对数与幂拟合的正 x 要求；通用递增、有限数值约束不在各 Definition 重复实现。
- Data 提供统一 resolve/fit 消费入口，单独使用 Data 也能选择注册方法、校验参数并得到模型。Plot 不自行调用未解析的任意 definition，也不重新校验相同参数。

registry 在当前编译上下文建立，内置 definitions 与注入 definitions 同路索引。重复 kind（包括与内置冲突）、空注册键和未注册方法均报错；不采用后注册覆盖，不引入全局可变 registry。内置集合从实际 Definition 派生，BuiltinRegressionMethod 列出内置方法提示，BuiltinRegressionMethodSchemas 保存内置精确参数 schema；开放 RegressionMethodSchema 表达完整方法契约。枚举仅用于类型提示，不充当自定义方法白名单。

IR schema 校验方法的 JSON envelope；选中 Definition 后精确解析参数一次，物化其默认值。未选中的方法不解析。Chart Source 的结构校验不等于证明方法已注册；完整可执行性由同一 active registry 验证。未知参数错误保留所在 recipe.properties.method 或 extraMethods 项的路径。

运行时注入采用 regressionDefinitions，接入现有 Plot LowerPlotsOptions、Data transform 执行上下文和 provider contribution 通路。Chart React / Vanilla 通过已有 lowerOptions.regressionDefinitions 提供，直接 IR 通过对应 provider 的运行时 lowerOptions 提供。所有入口共用 Data registry；不得在 Source recipe、plotExtension 或序列化 React props 中保存函数。Plot 和 Chart 直接使用 Data 的 BuiltinRegressionMethod、RegressionMethodSchema 与 IRRegressionMethod，不维护纯改名常量、schema 或类型别名。

## 趋势绘制契约

Regression 的 trend 增加 curve，类型与合法值精确复用 Plot Path 的 curve。公共 trend.curve 默认 catmullRom；extraMethods[].trend.curve 显式值优先，否则继承所在组的公共 trend.curve。RegressionMark 的 trend 仍按成员继承；extraMethods 数组仍整体替换，空数组清空。

```ts
properties: {
  method: { kind: 'linear' },
  sampleCount: 64,
  trend: { curve: 'catmullRom' },
  extraMethods: [
    { method: { kind: 'my-fit', degree: 3 }, trend: { curve: 'linear' } },
  ],
}
```

sampleCount 仍是至少为 2 的整数，默认 64；extent 默认当前组有效 x 范围。Smooth 对每个拟合方法输出完整的 sampleCount 个预测点，所有方法采用相同采样策略。每个预测点继续关联本组输入来源。

拟合在数据空间完成，预测点经过 scale 与 coordinate 后由 Path 连接。默认过点曲线不得重新拟合统计模型，不改变预测点、原始观测、方法参数或分组。显式选择其他 curve 即采用该 Plot 连接方式已有的形状与坐标约束；不会承诺所有连接方式都经过每个点。曲线控制点不作为统计预测值写回数据，也不参与重新求解模型。

本决策仅改变 Regression 的默认曲线；普通 Plot Path 省略 curve 时仍默认 linear。

## 统一采样与连接

线性拟合与其他方法采用相同的固定采样与曲线连接链路，不引入方法几何声明、投影仿射标记或预测序列追踪。线性投影下共线预测点经默认过点曲线连接仍呈现直线；非线性投影下按投影后的采样点连接。

## 行为、失败语义与兼容性

- 任一组、任一额外方法拟合失败，整图失败；不得丢弃失败趋势、改用 linear 或只保留散点。
- 不满足方法参数 schema、模型特有样本/值域要求、非法采样范围或非有限预测均明确诊断。自定义回调异常在 Data 边界包装为 RetikzDataError 并保留 cause，Plot / Chart 补充方法、分组和源路径上下文，不吞掉原始原因。
- 同一数据下的主方法与 extraMethods 继续只生成一套观测点。既有 series 颜色优先级、额外项显式 stroke 优先级、facet 隔离、mark 完整组替换及数组继承语义不变。
- React、Vanilla 和直接 IR 对方法参数、curve 和运行时注入表达同一能力；SVG / Canvas 只消费既有 Core Path / Scene，不新增 renderer 专属算法。
- 本决策接受后，替代 006 中“方法闭合集合、不支持外部拟合”及“trend 禁止 curve”两项限制；其余 Regression 契约继续成立。默认曲线从折线改为 catmullRom，属于可见变化；需要折线时显式配置 trend.curve: 'linear'，不保留旧默认模式或兼容开关。
