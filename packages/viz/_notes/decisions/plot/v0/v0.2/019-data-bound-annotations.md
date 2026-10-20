---
description: Annotation 复用 Mark 局部数据变换与位置字段绑定，以显式几何逐行生成参考点、路径和区域，同时保留常量单实例
keywords: Annotation、transform、字段绑定、from/to、参考线、summarize、实例来源
---

# ADR-019：Annotation 数据绑定与局部变换

- 状态：Accepted
- 决策日期：2026-10-20
- 关联：[版本规划](./roadmap.md)、[可视化能力边界](../../../../architecture/plot-visualization-complete.md)、[数据执行作用域](./015-scoped-data-execution.md)、[独立 Annotation](./018-independent-annotations.md)
- 修订：本决策替代 ADR-018 中 Annotation 禁止字段绑定、局部变换及数据来源追踪的约束；其显式几何、坐标连接与常量独立实例契约继续有效

## 背景与目标

平均线、中位数线和分组参考区域需要消费数据计算结果，但其几何仍是显式端点或边界。PathMark 将多行位置连接成路径，而参考路径需要每个聚合结果行生成一条完整路径。扩展 x/y 为区间并借输入形态切换 PathMark 的实例规则，会混合两种几何组织方式。

Annotation 保留 position、from/to、bounds 的几何表达，开放位置字段绑定与现有局部 transform。统计由 Data 提供，上层参考组件只组合这些能力，Plot 不增加平均线、中位数线等业务图元。

## 决策：显式几何复用既有数据处理能力

PointAnnotation、PathAnnotation、IntervalAnnotation 共用 Mark 的局部 transform 声明、数据作用域、字段访问与数据执行策略。Annotation 不增加 bind、source、独立 dataset API 或专用统计配置。数据来自当前 Plot 的根级变换结果；位于分面内时消费对应分区，与 Mark 相同。coordinateView 和 trackId 仍只按既有组合契约选择视图，不凭位置引用建立额外数据分组。

几何类型与数据来源是不同语义：PathMark 继续按系列连接多行顶点；PathAnnotation 按一个完整 from/to 生成一条路径。数据驱动 Annotation 对每个结果行分别应用同一显式几何声明，不跨行连接，不按相同位置去重。

Plot 拥有位置绑定、实例生成、坐标解析、domain 贡献及领域身份。Data 拥有 transform、执行与 lineage。Vanilla 规范化作者输入，React 调用同一入口；最终仍下沉既有 Core 几何，不增加独立 renderer。

## 基础数据结构与公开契约

三个 Annotation 入口增加与 Mark 同形的可选 transform，类型为 `Array<IRDataTransformDeclaration>`。位置原子在已有有限数值、分类字符串与 `{ edge: 'start' | 'end' }` 之外，接受已有位置通道的显式 `{ field: string }` 或 `{ value: number | string }` 绑定。字段路径访问及字段/常量互斥规则复用位置通道契约；比例尺由所属坐标角色决定，不新增端点专属 scale 选择。

裸字符串仍是分类常量，不解释为字段名；字段使用显式 field 对象。直接常量和 value 绑定表达同一位置事实，作者输入规范化为直接常量，不保留两份事实源。edge 属于位置引用，不能作为普通数据常量塞入 value 或由数据单元格返回后触发。

PointAnnotation 的 position（及作者层 x/y）、PathAnnotation 的 from/to、IntervalAnnotation 的 bounds 内每个 from/to 均接受同一位置原子。Source 保留 type 和 kind: 'annotation'，不新增实例模式字段。非位置样式、文字及标签保持既有常量契约，本决策不将任意属性自动改为数据通道。

以下 React 示例在当前视图数据上计算平均值，并将同一结果字段用于两个端点：

```tsx
<PathAnnotation
  transform={[
    {
      operation: {
        kind: 'summarize',
        params: {
          groupBy: [],
          metrics: [{ kind: 'mean', field: 'value', as: 'mean' }],
        },
      },
    },
  ]}
  from={{ x: { edge: 'start' }, y: { field: 'mean' } }}
  to={{ x: { edge: 'end' }, y: { field: 'mean' } }}
/>
```

Vanilla 的 pathAnnotation 接受相同属性，返回同一 Source IR。PointAnnotation 与 IntervalAnnotation 也保持 React、Vanilla、直接 JSON IR 的等价性。

分组参考线通过 summarize 的 groupBy 与 metrics 输出每组统计值及必要端点，例如 mean、xMin、xMax，再以 from.x.field 和 to.x.field 绑定端点。数据最小/最大值属于数据空间；分类 band 的视觉边界不等于组内数值极值，也不由 groupBy 自动生成。本决策不新增含糊的 group-range 特殊值。

## 实例与数据执行行为

实例来源按声明中的显式数据依赖确定：任意位置含 field 绑定，或显式提供 transform（包括空数组），即消费当前数据作用域并按最终结果行生成实例。两者都不存在时是独立实例，不读取局部数据、不调用局部执行器。

transform 的存在表示作者显式声明了局部数据链；空链是对当前数据视图的恒等消费，不得与省略 transform 合并。因而纯常量几何也可用 transform: [] 按行生成；所有位置为常量不覆盖已声明的数据依赖。字段绑定不要求同时提供 transform。此规则只适用于 Annotation，不改变 Mark 已有的实例行为。

局部变换只影响本声明；兄弟 Mark 与 Annotation 不共享变换后的数据视图。字段读取面对变换后的 rows 和完整 model，不回退到根数据或聚合前的字段。实际输出 N 行就生成 N 个实例；空结果不生成实例。空输入经过聚合后是否产生行及何种统计值由 Data 的既有契约决定，不制造占位数据。

数据驱动 Annotation 的局部变换使用 dataExecution.marks 策略，声明级覆盖、同步/异步限制及预检规则与 Mark 一致，不新增 annotation 执行策略。无变换声明时不因外部执行默认配置而调用执行器。独立 Annotation 不豁免根数据声明、根变换及分面准备的原有要求。

## 位置、尺度与几何行为

字段和普通常量表示数据空间中的位置，先由坐标角色的 scale 映射。edge 始终读取当前视图的最终角色 range，不等同于原始数据极值或屏幕固定方向，不参与 domain 推导。

contributeToDomain 继续默认为 false；显式 true 时，独立实例的普通位置及数据实例从最终结果行取得的普通位置参与域推导，edge 始终排除。字段必须被收集用于取值和模型解析，即使禁止 domain 贡献也不能跳过绑定解析。全 edge 或全部排除域贡献的声明不能独自建立缺失数据域，仍须由其它图元或显式 scale domain 提供。

PathAnnotation 与 IntervalAnnotation 保留 connection: 'coordinate' | 'straight' 及默认 coordinate，复用同一坐标投影扩展契约。连续极坐标、多边形极坐标、自定义角色、反向范围、退化几何和裁切均遵循既有几何规则；字段绑定不把弧线改成屏幕直线。

## 身份、失败语义与兼容性

- id 仍标识整个声明。独立 Annotation 保留声明级身份，不产生 datum lineage；数据驱动 Annotation 复用 Mark 的结果行身份、视图限定与数据 locator 规则，聚合来源由 Data lineage 提供，不复制原始数据来反推来源。
- 同一声明在不同分面中的身份相互区分；结果行的多个端点归属于同一实例，不制造两个 datum。变换导致行数变化时，实例身份稳定性遵循现有 Mark 与 Data 契约，不承诺按行序跨更新稳定。
- 外部 JSON 的非法字段/常量组合、非法 transform 或非法位置类型在 schema 入口失败。未知字段、已被聚合移除的字段、无法映射的位置、角色缺失及缺少坐标连接能力明确诊断，不退回第一行、零值或直线。错误使用 Plot 所属错误边界；执行器异常沿用 Data 错误与 cause 传播规则。
- 无字段且省略 transform 的现有 Annotation 保持单实例行为，包括有效绑定的空根数据场景。原本禁止字段与 transform 的约束由本决策解除，不增加旧接口别名、兼容层或平行执行路径。
- 原有 Mark 的数据实例语义及 x/y API 不变。公开输入、默认值、错误行为与示例在实现时同步中英文文档；本决策不改变 Annotation 的根数据必填约束。
