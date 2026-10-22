---
description: Plot Mark 统一拆分几何类型、构造方式、字段编码、固定属性与局部数据变换，覆盖 Annotation 并保持 Chart 语义展开与覆盖规则
keywords: Mark、Annotation、Chart、encodings、properties、transforms、kind、type、字段绑定
---

# ADR-020：Mark 字段编码与固定属性分离

- 状态：Accepted
- 决策日期：2026-10-20
- 关联：[版本规划](./roadmap.md)、[可视化能力边界](../../../../architecture/plot-visualization-complete.md)、[包职责](../../../../../../../notes/architecture/package-responsibility-design.md)
- 修订：[014](./014-progressive-mark-properties.md) 的字段／常量混合属性表示、[018](./018-independent-annotations.md) 与 [019](./019-data-bound-annotations.md) 的 Mark Source 表面；保留其几何、坐标连接、实例与数据执行语义
- 协作：[Chart 009](../../../chart/v0/v0.1/009-family-recipe-chart-schema.md)、[Chart 011](../../../chart/v0/v0.1/011-chart-encoding-field-mapping.md)；保留 Chart 精确 recipe、语义组、继承与高层映射职责

## 背景与目标

Plot 当前把位置放在 encoding，把颜色、尺寸等字段驱动属性放在 mark 顶层，同时保留 encoding.color 与自定义 encoding.channels。相同的数据映射出现多种位置和字段／常量判别形式，Annotation 又使用独立的位置绑定结构。Chart 已采用数据 encodings 与常量 properties，向 Plot 展开时需要重新包装同一事实。

新的 Mark 契约以取值来源划分编码与属性，以几何构造区分 type 与 kind。统一不改变数据路径与显式路径的实例规则，不把 Chart 语义组等同于一个 Plot 几何图元，也不复制 Core 的几何与样式语义。

## 决策：统一 Mark 声明结构

Plot Source Mark 使用下列语义分组。只有存在内容时才提供可选分组；唯一例外是 transforms 的空数组具有明确数据消费语义。

| 字段         | 契约                                                                          |
| ------------ | ----------------------------------------------------------------------------- |
| `type`       | 封闭图元类型：point、path、interval、relation                                 |
| `kind`       | 该类型的构造方式，Source 显式为 data 或 annotation；Definition 声明支持的分支 |
| `encodings`  | 字段到已声明属性目标或数据角色的映射，不接受常量或任意函数                    |
| `properties` | 固定实例属性与构造参数，不包含字段绑定；精确结构由 type/kind 决定             |
| `transforms` | 有序的 Mark 局部 Data transform declaration，不承载几何变换                   |

id、coordinateView、layer、声明级默认颜色分配及 contributeToDomain 等身份、作用域或域贡献控制仍在声明层。构造规则与实例样式进入 properties，字段角色进入 encodings。不是所有固定属性都允许数据编码，也不是所有数据角色都有固定属性形式。

```ts
{
  type: 'point',
  kind: 'data',
  encodings: {
    position: {
      x: 'height',
      y: 'weight',
    },
    color: { field: 'region', scale: 'regionColor' },
    size: { field: 'population', scale: 'populationSize' },
  },
  properties: {
    stroke: '#0f172a',
    strokeWidth: 2,
    opacity: { overall: 0.85 },
  },
}
```

### type 与 kind

type 选择几何能力，kind 选择其构造方式。data 不保证逐行一图元：Point 按记录生成，Path 按系列和顺序连接多行，Interval 按区间规则生成，Relation 按记录解析关系目标。annotation 表达完整的显式几何，数据驱动时每个结果行独立生成一份，不跨行连接。

Point、Path、Interval 支持 data 与 annotation。Relation 保留 data 分支，不因此新增 RelationAnnotation。Relation 原顶层 path/ribbon 判别进入 properties.geometry.kind，相应 path/ribbon 专属构造配置归入该 geometry 分支，端点图形与共享外观保持自己的目标，不混入顶层 kind。

React／Vanilla 的具名 Mark 与 Annotation 工厂补齐 type/kind；直接 JSON Source 显式声明。不支持的 type/kind 组合明确失败。

### 字段绑定与固定值

基础字段绑定直接使用非空白字段名字符串，例如 `x: 'height'`；只有显式指定 scale 时才使用 `{ field: string, scale: string }`。encodings 已确定字段来源，不保留没有 scale 的 `{ field }` 对象形式。两种形态都是正式 Source 表达，JSON、Vanilla 与 React 保持一致，不把简单字符串自动膨胀为字段对象。

字段面向当前局部变换结果的字段模型；scale 是已声明比例尺的名称，仅允许在支持显式尺度的目标上使用。位置目标的 scale 由 coordinate role 确定，禁止端点私自覆盖，因此位置绑定使用字段名字符串。series、order 等数据角色同样只接受字段名字符串，不接受视觉 scale。格式化由相应内容目标的显式配置承担，不把任意运算放入基础绑定。此简化只针对 Plot 基础字段绑定，不改变 Chart 高层 aggregate／derived 映射的对象契约。

properties 直接保存目标值，不使用 `{ kind: 'constant', value }` 包装。字符串始终是该属性的常量，不猜测字段名称。结构化 Paint、Shape、Font、target 引用与布局值复用 Core 的对应契约；数据单元格中的对象不会自动被解释为字段声明、edge 或引用指令。

encodings 与 properties 中可替换的目标使用相同路径。例如 position.x、from.y、bounds.y.to、opacity.overall。位置角色统一处于 position、from/to 或 bounds 下，避免自定义坐标角色与 color、size 等属性争用顶层名称。

目标是 Definition 声明的语义单元，不按任意对象叶子递归推断。Paint 等复合值可以是原子目标；opacity 的 overall/fill/stroke 是独立成员。有序标签保留宿主、顺序与内容配置，字段内容绑定位于 encodings 的对应标签项，固定内容及宿主配置位于 properties 的对应标签项；按同一数组索引定位，不按文本猜测或重排。未声明的嵌套编码目标必须拒绝。

颜色类字段编码统一遵循 Plot 通道的尺度规则，未显式指定 scale 时使用该通道的默认映射；Relation 与 Point、Path、Interval 一致，不再将字段值直接当作 CSS 色值透传。固定颜色写入 properties。Relation 本次仅适配统一契约，不扩展其能力。

### 优先级与默认值

同一显式层级的 encoding 优先于相同目标的 property；property 是固定赋值，不是数据缺失或尺度失败时的 fallback。不同目标独立组合，例如 opacity.overall 的编码不清除固定 fill/stroke 因子，因子的相乘语义沿用 Core。

主题、领域默认与显式输入仍遵循所属 owner 的级联。仅有效的取值来源参与字段消费、尺度与图例生成；被明确覆盖的来源不产生悬空尺度或额外图例。失败的有效 encoding 不回退到固定属性。

Path 保留既有分组、排序与缺值分段规则。每个实际线段的整体外观、标签与 Path 属性编码使用该线段首行求值，不支持逐顶点任意样式；颜色沿用既有系列取值规则，显式同时指定 series 与 color 编码时仍要求组内颜色恒定。不同记录的其它外观属性不同不会新增一致性错误。

## 几何输入与 Annotation

各类型保留准确的几何组织，不以统一字段字典替代构造契约。

| 类型与分支              | 几何输入与字段角色                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Point data / annotation | position 角色映射；text、size、color 等按能力声明编码                                                  |
| Path data               | position 顶点映射，series/order 字段角色；固定 curve、closure 与连接规则                               |
| Path annotation         | 完整 from/to 角色映射；固定 connection                                                                 |
| Interval data           | 每个 bounds 角色的 band/span/extent/proportional/full 构造；固定模式与基线、字段中心／端点／权重／分组 |
| Interval annotation     | 每个 bounds 角色的完整 from/to                                                                         |
| Relation data           | source/target 的寻址或投影结构、geometry 与路径配置；目标中的数据依赖进入对应 encoding                 |

Interval data 的固定区间规则置于 properties.bounds：band 的中心消费 encodings.position，分组字段使用 encodings.bounds.<role>.group；span 消费 position 与固定 baseline；extent 的端点字段使用 encodings.bounds.<role>.from/to；proportional 的权重字段使用 encodings.bounds.<role>.weight；full 不读取数据字段。省略模式时的既有尺度推导规则不变。

Relation 的固定 source/target、via 与 route 保留原有 Core-compatible 寻址和路径语义；其中字段取值移入相同目标位置的 encodings，投影角色使用 position 映射，不再以字段名字符串伪装固定坐标。目标引用、锚点生成规则及路由仍由各自公开契约解释，不按普通视觉 scale 解析。

### 位置值的空间语义

固定位置属于数据空间，有限数值或分类字符串经该角色 scale 和 coordinate 投影。`{ edge: 'start' | 'end' }` 表示当前视图最终角色 range 的边缘，包含反向范围与留白影响，不表示数据最小／最大值或固定屏幕方向。

因此 properties.position.y 为 100 与 encodings.position.y 读取值为 100 的字段使用相同投影；字段来源与固定来源不同，位置语义相同。dx/dy 等明确的投影后偏移仍使用绘图单位，不把裸 position 常量解释成像素。

Annotation 在组合有效属性与编码后必须具备完整位置、端点或边界。不同来源可以提供不同角色，不隐式把缺失角色补成全视图范围。

```ts
{
  type: 'path',
  kind: 'annotation',
  transforms: [
    {
      operation: {
        kind: 'summarize',
        params: {
          groupBy: [],
          metrics: [{ kind: 'mean', field: 'value', as: 'mean' }],
        },
      },
    },
  ],
  encodings: {
    from: { y: 'mean' },
    to: { y: 'mean' },
  },
  properties: {
    from: { x: { edge: 'start' } },
    to: { x: { edge: 'end' } },
    connection: 'coordinate',
    stroke: 'red',
  },
}
```

固定参考线把上述两个 y 放入 properties，删除 encodings 和 transforms，即成为独立实例。绑定颜色等获准的非位置字段同样建立数据依赖，不再只检查位置字段。Annotation 只开放对应几何宿主已声明的编码目标，不自动开放全部 Core 属性。

contributeToDomain 对 annotation 继续默认为 false。开启时，最终局部数据的位置值和独立实例的固定位置参与 domain；edge 始终不贡献。edge 在视图范围确定后解析，不允许反过来建立缺失的 domain。

## 数据执行与实例语义

transforms 复用 Data declaration、执行策略和 lineage，不创建另一套统计或执行协议。Mark 消费当前 Plot 根变换结果；分面内消费实际分区。局部变换不影响兄弟声明，字段读取与图例等消费使用同一结果 rows/model，不回读聚合前字段。

- data Mark 始终按其类型的数据构造规则消费当前作用域
- annotation 无 encoding 且省略 transforms 时为独立实例，不制造空数据行或 datum lineage
- annotation 存在 encoding，或显式提供 transforms（包括空数组），按最终结果行生成完整实例
- annotation 的 transforms 空数组表示恒等数据消费，不能与省略合并；空结果生成零实例，独立实例不因根数据为空而消失

根数据必填、根变换与同步／异步执行约束保持不变；全 annotation 的 Plot 也不绕过根数据与尺度验证。geometry 的旋转、缩放、路径变换不进入 transforms。Plot 根级既有 transform 属于独立根作用域，本决策只将 Mark 局部字段改为 transforms，不因命名统一把根变换搬到 mark。

## Chart 与适配器契约

Chart recipe 与 Chart mark 继续采用 field-bound encodings 和固定 properties。Chart 的 aggregate、derived 与内联 scale 是高层数据映射意图；解析后产生 Plot 数据变换、named scales 与基础字段编码，不进入 Plot 基础绑定的宽 union。

Chart mark 的 kind 是 semantic group 身份，不是 Plot 的 data/annotation。一个 Chart mark 可展开成多个 Plot mark；override 按 Chart kind 原位替换整个 semantic group，不能只替换其中一个几何 mark，也不把 override 下沉到 Plot。

Chart 层按所属 recipe 的 slot binding 先解析继承：

1. inherited properties 与 inherited encodings 形成继承输入
2. authored mark 显式 property 覆盖相同目标的继承 encoding
3. authored mark 显式 encoding 再覆盖同目标的显式 property

Chart 向 Plot 交付已确定的目标来源；同层 encoding 优先的原则在两层一致。Chart 的 x/y、category/start/end 等高层 slot 不必与 Plot position/from/to/bounds 的路径同形，必须通过明确的 consumer 映射，不直接展开整个对象。Chart 专属默认、必需字段和语义收窄继续由 Chart 拥有。

Chart 编码派生的共享数据视图保持原作用域，不拆成每个 Plot mark 的局部 transforms。plotExtension.marks 直接使用新的 Plot Mark 契约，不继承 recipe 字段或属性；它消费的共享数据作用域保持现有规则。

Plot 拥有精确 Source、可编码目标、字段／尺度／坐标解析、构造与诊断；Data 拥有数据执行；Core 拥有目标图形语义。Vanilla 负责作者输入规范化，React 调度同一入口。JSON、Vanilla、React、standalone 与 embedded 表达同一能力，不由 adapter 决定优先级或实例数量。

## 扩展、失败语义与兼容性

Mark 类型集合按 [023](./023-closed-mark-vocabulary.md) 封闭，仅内置实现使用内部行为定义。Definition 必须明确支持的 kind、精确 properties 与 encoding 目标、目标值域、适用 scale 和消费粒度；自定义通道在同一 encodings 结构注册，不保留额外 channels 字典。Definition 与执行函数只存在于运行时，不写入 JSON。

属性和值域复用权威 schema 原子；不按对象形状机械生成“所有属性均可绑定”的平行 schema。未注册目标、未消费字段、不支持的 kind、非法固定值、非法尺度、缺失角色、聚合后字段不存在或无法映射都在相应边界明确诊断。外部 JSON 由 schema 解析，依赖上下文的领域错误由 Plot 解析层报告。

本决策为破坏性 Source 调整：删除旧 encoding、encoding.channels、顶层字段／常量包装、Annotation 内嵌 field/value 位置绑定及 Mark 局部 transform；Relation 顶层几何 kind 同步迁移。公开新旧字段不双读，不提供别名、migration 或 fallback。

Plot、Chart 生成出口及显式 Plot extension、两组适配器与中英文文档必须共同迁移，保持 semantic group、默认颜色、图例、数据作用域、identity、provenance 与 locator 行为。获准的 Annotation 非位置编码属于明确扩展，不能以此次结构调整静默扩大其它属性能力。
