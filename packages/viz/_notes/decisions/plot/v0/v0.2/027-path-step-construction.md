---
description: PathMark 以数据绑定步骤映射 Core 路径构造，Vanilla way 与 React PlotPathStep 统一归一为 steps，明确投影空间和实例语义
keywords: PathMark、steps、way、PlotPathStep、路径构造、坐标投影、Relation、Vanilla、React
---

# ADR-027：Path 步骤构造与统一作者简写

- 状态：Accepted
- 决策日期：2026-10-25
- 关联：[版本规划](./roadmap.md)、[021](./021-unified-mark-position-inputs.md)、[026](./026-mark-target-endpoints.md)、[可视化能力边界](../../../../architecture/plot-visualization-complete.md)
- 修订关系：扩展 021 的两类 Path 输入，保留其顶点与端点行为；沿用 026 的目标身份、作用域及声明顺序契约

## 背景与目标

PathMark 已能组织多行顶点，也能逐行连接坐标或图元目标。关系用途还需要正交折线、弯曲连接、控制点、途经点和分段标签。RelationMark 的 route、routing、via 只覆盖底层路径的一部分，独立维护构造字段容易与 Core 的能力和约束发生偏离。

目标是让 Plot 表达可绑定数据的完整路径构造模板，沿用 Core 的步骤种类、参数语义、默认值和几何计算，并使 JSON、Vanilla 与 React 表达同一能力。常见路径应有与既有绘图 API 一致的简写。

## 决策：Plot 解析数据位置，Core 构造投影后的路径

新增 encodings.steps，表示每个实例的一组有序路径步骤。Plot 负责字段消费、坐标投影、目标身份和位置 domain；Core 负责路径游标、几何构造、边界连接、标签、圆角及路径标记。

步骤保持 Core 的 kind 和种类专属结构。构造参数直接复用底层契约，不建立 Plot 专属的弯曲、折线或采样算法。只有位置输入增加 Plot 数据语义；步骤固定参数与位置共同构成完整模板，不拆成两个按索引配对的配置数组。

Vanilla 提供 way 作者简写，React 提供相同 way 属性及 PlotPathStep 子组件，全部归一为 encodings.steps。way、JSX 与箭头简写不进入 Source IR。Core 不读取 Plot 字段或 Mark 身份，React 不单独维护路径解析器。

## 基础数据结构与公开契约

### 三类路径输入

| 输入                           | 几何组织                                                |
| ------------------------------ | ------------------------------------------------------- |
| encodings.position             | 按现有 series、order 和缺值规则组织多行顶点             |
| encodings.from 与 encodings.to | 每个实例的一条简单连接，保留 coordinate / straight 语义 |
| encodings.steps                | 每个实例的一条完整路径，可含多个子路径                  |

三种形式互斥。steps 不接受 series、order、顶点 curve、closure、closed、connectNulls、interpolation 或 connection；连接方式和闭合动作由步骤明确表达。保留整条路径的外观、变换、cornerRadius、label 和 marks。

steps 是至少包含两个步骤的数组。每项只声明 kind 和该种类的字段，Core 的 type: 'step' 在下沉时补齐。结构性必填项、互斥关系和步骤执行限制沿用 Core；不为末步骤自动补 to，也不隐式追加闭合步骤。

```ts
{
  type: 'path',
  encodings: {
    steps: [
      { kind: 'move', to: { mark: 'nodes', key: { field: 'source' } } },
      {
        kind: 'bend',
        to: { mark: 'nodes', key: { field: 'target' } },
        bendDirection: 'left',
        bendAngle: 30,
      },
    ],
  },
  properties: { strokeWidth: 2, marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
}
```

### 步骤与位置

完整步骤覆盖 Core 的 move、line、axis-line、fold、cycle、curve、cubic、bend、arc、circlePath、ellipsePath、rectangle、smooth。fold 保留两段和三段结构及 fraction；bend 保留对称弯与出入切线模式；smooth 保留 points 与 tension。步骤种类跟随 Core 的公开契约，不保留已移除的 generator 步骤。

| 位置形式                                              | 语义                                                       |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `{ x: { field }, y: { field } }`                      | 从当前最终结果行取值，经过角色尺度与坐标投影               |
| `{ x: { value }, y: { edge } }`                       | 数据常量或视图角色边界，遵循既有位置输入规则               |
| `{ mark, key, anchor?, offset?, boundary? }`          | 依照 026 引用实际生成的图元                                |
| `[x, y]`                                              | Core 当前路径宿主局部空间坐标，不经过 Plot 比例尺          |
| Core 的极坐标、相对、累积相对、offset 与 between 形式 | 保留底层目标结构、引用规则与几何语义，不将数值解释为数据值 |

Plot 的数据角色位置和 Core 绘图位置是明确不同的对象分支；在同一位置不能混合两套字段。Core 极坐标对象不表示 Plot 的 polar2D 数据位置。已有 Core 目标可以使用其原有场景身份，但不能用这些身份代替 Mark 的业务 key；Plot 不生成隐式身份字符串或扩大 Mark 查找作用域。

各步骤的位置槽保留底层限制，只在接受绝对位置的槽中增加可投影的数据位置，在接受 NodeTarget 的槽中增加 MarkTarget：

- to、center、rectangle.from/to、smooth.points 等按对应 Core 槽允许的目标种类消费
- curve.control 与 cubic.control1/control2 只接受绘图空间笛卡尔坐标或可投影的数据位置，不接受图元引用、相对目标或边界参数
- axis-line 的目标投影到绘图空间后，按 Core 的水平或垂直轴构造，不解释为 Plot 的角向或径向线
- 相对偏移、半径、角度、松弛度和 fraction 保留底层单位与默认值，不经过比例尺；offset 仍沿用 Core 世界空间偏移语义

数据位置先投影为 Core 坐标，再执行步骤。极坐标中，带数据控制点的 cubic 是投影后构造的贝塞尔曲线，不是在数据空间构造后整体投影。沿坐标系插值继续由原有顶点和 from/to 入口表达。

步骤的 kind、数组拓扑和构造参数为固定声明；本决策不增加任意属性字段求值语言。后续数据转属性能力应复用统一属性契约。

步骤 label 使用 Core 路径标签契约，表示当前步骤的固定标签；整条路径的字段标签继续使用现有 encodings.label。逐步骤标签字段绑定不通过把字符串猜成字段名实现。

### 实例与 domain

steps 中所有数据位置和 key.field 都参与字段依赖收集，与现有外观及标签字段共同决定实例来源。存在有效字段依赖时，每个最终结果行生成一条完整路径；结果为空则零实例。全部为常量且无其它字段依赖时生成一个实例，不为步骤各自产生数据行。

所有数据空间绝对位置，包括控制点和 smooth.points，按 contributeToDomain 参与相应位置域推导；edge、图元身份、Core 绘图位置、相对偏移及半径不贡献位置 domain。不从曲线极值反推尺度，也不重复纳入目标图元的位置。

目标引用沿用 026：被引用 Mark 必须先声明，作用域限定为当前实际视图，目标必须已生成。steps 路径本体不因新增构造方式而成为 NodeTarget；现有顶点 Path 暴露的 Coordinate 能力保持不变。

### Vanilla 与 React 简写

Vanilla normalizePlot 的路径图元输入和 React PathMark 新增顶层 way。way 的首目标生成 move，连续目标生成 line；使用既有折线、curve、cubic、bend、arc、circle、ellipse、单轴、相对位置、闭合及标签算子。算子顺序和缺参诊断沿用底层语法；way 不承诺表达完整步骤的所有参数。

way 的目标和控制点位置槽按上述规则增加 Plot 数据输入。裸字符串保留底层目标简写的含义，不解释为数据字段或 Mark 业务身份；引用 Mark 必须使用 mark + key 对象。闭合和相对关键字复用 DrawWay，不添加另一套关键字。

```tsx
<PathMark
  way={[
    { mark: 'nodes', key: { field: 'source' } },
    { bend: 'left', angle: 30 },
    { mark: 'nodes', key: { field: 'target' } },
  ]}
  arrow="->"
  properties={{ strokeWidth: 2 }}
/>
```

Vanilla 路径图元输入接受相同 way、arrow 和 properties 对象。完整结构也可以直接使用 encodings.steps，不新增一组仅补 kind 的步骤工厂。

Core 的共享语法入口允许分别适配目标、控制点与单轴目标，默认 Core 解析与 Plot 解析使用同一算子归约逻辑。适配器保留所属领域的位置表达，不执行数据求值；Core 不依赖 Plot。步骤 schema 的字段与跨字段约束同样由 Core 提供可替换位置槽的组合入口。箭头归一由 Kernel Vanilla 的公共能力提供，两套作者 API 不复制箭头配置规则。

React PathMark 的步骤子组件统一命名 PlotPathStep，以 kind 区分动作，采用与 Source 步骤相同的字段。它只用于 PathMark，不能混入任意绘图节点；不复用参数类型不同的 Core Step 组件冒充 Plot 数据步骤。

```tsx
<PathMark properties={{ strokeWidth: 2 }}>
  <PlotPathStep kind="move" to={{ mark: 'nodes', key: { field: 'source' } }} />
  <PlotPathStep
    kind="bend"
    to={{ mark: 'nodes', key: { field: 'target' } }}
    outAngle={-45}
    inAngle={180}
    looseness={1.2}
  />
</PathMark>
```

way、PlotPathStep children、显式 steps、position 和 from/to 是互斥入口，不设优先级。React 只收集步骤并调度 Plot Vanilla 归一；Vanilla 与 React 都产出相同 Source，保留字段绑定直到 Plot 消费数据。

arrow 复用 Vanilla 路径箭头输入，支持 none、->、<-、<-> 及端点对象，最终写为 properties.arrow；尺寸、样式与 endpointOverlap 位于 start / end 端点对象，沿线 marks 独立保留，不新增 Plot 箭头结构。源码展示不能把 way 无法表达的步骤近似成另一种路线，应保留完整 steps。

## 行为、失败语义与兼容性

- JSON Source 仅接受明确的步骤结构；way 和 React 节点属于 authoring 输入，不能持久化为 Source 字段
- 输入分支混用、未知步骤、非法位置种类、缺少必填控制点、非法构造参数和无效 way 顺序明确报错，不静默忽略不适用字段
- 显式步骤的位置缺失、无法投影或目标解析失败时，整条实例失败，不跳过单步形成另一条路径；诊断保留 Mark、结果行和步骤位置，以及底层错误原因
- 路径扩展复用 Core 的 Path Definition 能力，Plot 不恢复已移除的生成器步骤或建立平行生成器 registry
- 既有 position 和 from/to 行为不变，不将 steps 的几何规则反向套到已有曲线插值和数据缺值策略
- 保留路径宿主样式、分段标签和路径标记的 Core 语义；实例 provenance 仍来自当前路径行，不被目标行替换
- Ribbon 是由中心线生成带状几何的 Path kind，按 028 接入，不能用 strokeWidth 冒充。端点图形使用独立 PointMark；RelationMark 移除。步骤标签保留固定声明，不提供逐段字段标签或最长段／最后一段自动选段策略
- 公开交付同步中英文路径构造说明、完整步骤与 way 示例、React / Vanilla 等价入口，并明确数据空间与绘图空间
