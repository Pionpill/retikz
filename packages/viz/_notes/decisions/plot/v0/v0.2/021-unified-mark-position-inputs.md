---
description: 将 Annotation 能力归入 Mark，以字段、常量和视图边界统一位置输入，由有效数据绑定决定实例来源，并迁移标注文档与示例
keywords: Mark、Annotation、位置编码、field、value、edge、实例数量、显式路径、文档迁移
---

# ADR-021：统一 Mark 与三类位置输入

- 状态：Accepted
- 决策日期：2026-10-21
- 关联：[版本规划](./roadmap.md)、[可视化能力边界](../../../../architecture/plot-visualization-complete.md)、[包职责](../../../../../../../notes/architecture/package-responsibility-design.md)
- 替代关系：替代 [018](./018-independent-annotations.md) 与 [019](./019-data-bound-annotations.md) 的独立 Annotation 入口和实例判定；修订 [020](./020-mark-encoding-properties.md) 的 data/annotation 判别、位置来源表示及 transforms 对实例数量的影响，保留其非位置编码、属性、Chart 语义组与数据作用域契约

## 背景与目标

参考点、阈值线和背景区域与普通数据图形共享位置投影及几何绘制能力。现有 Annotation 又支持字段绑定与局部数据变换，已经不能用是否依赖数据区分 Mark 与 Annotation。同一种点、路径和区间需要维护两套入口，显式端点路径等通用几何能力也被绑定到了标注身份。

统一后的 Mark 应同时表达数据图形和辅助标记：位置可以来自数据字段、数据空间常量或明确的特殊值；字段绑定消费明细结果表，无数据绑定的完整几何只生成一个实例。标注描述图形的用途，不再是独立的图元类型。

## 决策：由 Mark 统一承担数据图形与显式标记

保留 PointMark、PathMark、IntervalMark 及对应 Vanilla 工厂，移除 PointAnnotation、PathAnnotation、IntervalAnnotation 及其工厂、Source 分支和专属扩展入口。Plot 的 marks 集合统一保存 Mark，不再使用顶层 kind: data / annotation 区分实例来源，也不增加等价的 instanceMode 或 annotation 标志。

位置来源、实例来源与几何组织分别定义：字段、常量和特殊值描述如何取得位置；有效字段依赖决定是否消费数据结果表；Point、Path、Interval 的几何契约决定如何将记录组织为点、路径或区域。常量不能自动切换路径组织方式，辅助用途也不能改变几何算法。

Plot 拥有这些语义、坐标投影、域贡献与实例身份；Data 继续拥有数据变换、字段模型和 lineage；几何与外观继续下沉既有 Kernel 能力。React 调度 Vanilla，JSON、React、Vanilla、standalone 与 embedded 表达同一契约。

## 基础数据结构与公开契约

### 三类位置输入

位置统一放在 encodings 的相应位置目标中，每个位置原子只能使用以下一种形态：

| 来源   | Source 形态                            | 含义                                  |
| ------ | -------------------------------------- | ------------------------------------- |
| 数据   | `{ field: 'value' }`                   | 从当前 Mark 最终结果行读取字段        |
| 常量   | `{ value: 100 }`、`{ value: '五月' }`  | 数据空间中的固定数值或分类值          |
| 特殊值 | `{ edge: 'start' }`、`{ edge: 'end' }` | 当前坐标视图最终角色 range 的起止边界 |

三种对象互斥且封闭，不接受裸字段名或裸常量，不猜测字符串含义。常量复用现有有限数值、分类字符串与时间尺度数值表示，不接受函数、Date 实例、无穷值或任意对象。数据单元格返回的对象不解释为 field、value 或 edge 指令。

位置 scale 继续由坐标角色确定，不允许 field 对象为端点单独指定 scale。常量与字段中的相同值经过同一尺度和坐标投影；常量不是像素。特殊值先于几何投影取得角色范围边界，包含范围反转与留白的影响，不等于数据最小值或最大值。

本次特殊值集合限定为 edge start/end。平均值、中位数、最小值与最大值仍由 Data transform 计算并通过 field 消费，不添加统计关键字或隐式表达式。Interval 的 full 是区间构造规则，不是第四类位置原子。

properties 不再保存 position、from/to 或显式位置端点；固定外观与构造规则仍属于 properties。Interval 的 bounds 构造模式及 baseline 等模式参数继续属于 properties，其显式 from/to 端点统一属于 encodings.bounds。非位置通道仍遵循 [020](./020-mark-encoding-properties.md)：字段编码在 encodings，固定外观在 properties，不顺带将全部样式改成三类位置输入。

### 点、路径与区间

Plot 的公开位置角色限定为 x、y、z。Point 的 position 必须有 x，y、z 分别可选；实际坐标消费的角色必须完整，不读取的额外角色明确诊断。省略 y 支持一维坐标，不表示在二维坐标中自动补零。坐标扩展通过这些角色声明自身映射，不增加任意位置键。

PathMark 支持互斥的两类几何输入：

- encodings.position：按既有 series、order 和缺值分段规则组织顶点；位置原子支持三类来源，字段驱动的多行仍组成路径，不能变成每行一条零长线
- encodings.from 与 encodings.to：每个实例提供完整的两个端点；每个端点使用相同的位置角色规则；不能同时声明 position，也不能混入 series/order 等跨行路径组织字段

显式端点路径使用 properties.connection: coordinate | straight，默认 coordinate，承接原 Annotation 的连续极坐标、多边形极坐标、反向范围与退化路径行为。顶点路径保留既有 curve、closure、排序与分段语义，不通过是否存在字段来猜测是哪种路径。

IntervalMark 统一承接显式区域与已有 band、span、extent、proportional、full 构造。二维区间的 x、y 两个有效边界必须可确定，不开放 z。角色中心和显式端点使用三类位置输入；extent 的 from/to 可以分别绑定字段、常量或 edge。保留已有尺度驱动的构造模式推导，不要求现有柱图、直方图或饼图手动展开所有端点；推导也不得将缺失位置静默解释为 full。

原 IntervalAnnotation 的显式 bounds 归入 extent 构造；其 connection: coordinate | straight 由 IntervalMark 承接。connection 默认 coordinate，保留既有普通 Interval 的坐标边界插值；straight 明确连接投影后角点，不静默覆盖适用范围不相容的构造配置。分组与权重继续是数据角色，不作为空间位置或特殊值。

固定阈值路径的 Source 示例：

```ts
{
  type: 'path',
  encodings: {
    from: { x: { edge: 'start' }, y: { value: 100 } },
    to: { x: { edge: 'end' }, y: { value: 100 } },
  },
  properties: { stroke: 'red', connection: 'coordinate' },
  contributeToDomain: false,
}
```

同一位置混合字段与常量的点示例：

```ts
{
  type: 'point',
  encodings: {
    position: { x: { field: 'time' }, y: { value: 100 } },
  },
  properties: { fill: 'red' },
}
```

前者每个实际视图生成一条阈值线；后者按每条结果记录的 time 生成一个点。React 与 Vanilla 复用上述 encodings、properties 结构，仅由具名入口补齐 type。

### 实例来源与明细表

实例来源由有效数据字段依赖决定，覆盖位置 field、获准的颜色／文字／标签等字段编码，以及 series、order、group、weight 和 Definition 声明的其它数据角色。仅位置为常量但颜色绑定字段的声明仍然是数据驱动，不能把多行颜色任意压成一个实例。

| 有效输入                                      | 实例行为                                           |
| --------------------------------------------- | -------------------------------------------------- |
| 无任何字段依赖，仅常量／edge／固定构造        | 每个实际坐标视图一个独立几何实例                   |
| 存在字段依赖，混合任意常量或 edge             | 消费当前结果明细表；常量和 edge 在各实例中复用     |
| Point、显式 from/to Path、Interval 的数据输入 | 每条有效结果记录生成一个完整实例，不按相同位置去重 |
| 顶点 Path 的数据输入                          | 结果记录作为顶点，按系列、顺序与缺值分段组织路径   |
| 字段驱动的最终结果为空                        | 不生成实例，不回退成常量单实例                     |

“明细表”指 Plot 根级变换、当前分区以及本 Mark 局部 transforms 完成后的 rows/model，不限定为原始输入表。summarize 产生一行时生成一个完整点、端点路径或区间；分组聚合产生多行时按对应结果记录生成。

transforms 只描述数据变换，不再充当重复绘制开关。空数组与省略在实例判定上等价；没有任何有效字段消费却声明非空局部 transforms 时明确报错，避免无消费者的计算或通过变换偷偷切换实例来源。需要按行生成的图元必须声明真实的数据绑定。

独立实例不读取第一行、不制造空行，不产生虚假的 datum lineage。有效绑定的空根数据不抑制独立实例。Plot 根数据声明与绑定仍必需，根变换、分面准备、同步／异步执行和执行器异常遵循原契约；局部独立不豁免根级错误。每个实际生成的 facet / view 独立生成实例，不凭空创建空分区。

### 尺度、身份与扩展

contributeToDomain 统一成为 Mark 的域贡献控制，默认 true；普通常量与最终结果行的位置均可参与 domain 推导，edge 始终不参与。参考线和背景区域需要保持原标注不扩域的效果时显式设置 false。全 edge 或全部排除域贡献的声明必须从其它图元或显式 scale domain 获得有效域，缺域时按既有规则诊断。

常量位置不自动创建字段图例；非位置字段编码继续按既有规则建立图例。数据驱动显式路径的两个端点属于同一记录实例；独立实例只有声明及视图身份，不可通过 datum locator 冒充数据行。分组顶点路径继续保持既有系列、分段与取值粒度，首行外观规则不因本次统一而改变。

内置与自定义 Mark 继续经同一 MarkDefinition、defineMark、registry 和领域解析链路。字段依赖由已声明的编码目标及 collectFields 契约收集，不能扫描任意 properties 对象寻找同名 field；移除 Definition 中以 annotation 命名的分支，独立实例与数据实例能力归入统一 Mark 的几何消费契约。自定义 Mark 必须明确支持的几何输入和独立实例消费能力；不支持的组合明确诊断，不伪造一条数据调用旧的逐行实现。

MarkDefinition 的 schema 统一覆盖该类型支持的几何形态；lower、placement.targets 与 domainPadding 统一消费以下运行时实例输入，其余 frame、channels、context 的职责保持不变：

```ts
type MarkInstanceInput = { kind: 'single' } | { kind: 'rows'; rows: Array<ExternalRow> };

/** 单个几何或位置调整目标消费的实例 */
type MarkInstance = { kind: 'single' } | { kind: 'row'; row: ExternalRow; transformedIndex: number };
```

该输入由有效字段依赖派生，不进入 Source IR，不建立平行 Zod schema，也不与 rows 另存重复的实例数量。rows 分支包括空表；single 分支没有 datum。具体几何实现必须处理所声明支持的分支，域贡献、字段读取与 locator 使用相同的实例事实，不各自推断。旧 annotation capability 的独立 schema 和 lower 不作为兼容入口保留。

buildCell 与位置调整目标消费 MarkInstance，替代强制要求数据行的契约。single 目标使用声明内稳定键，不产生 datum locator 或 lineage。字段通道解析器仍只接收真实 row；独立实例直接消费固定属性和常量标签，不用空对象调用字段解析器。常量 Point 的 placement 与 autoPadding 复用普通能力入口；edge 不参与 domain，不能推导相应域留白时明确诊断，不通过虚构数据实现边界避让。

锚点生成与引用同样消费真实实例身份：AnchorIdGenerator 接收 MarkInstance；AnchorOwner 区分 single 与 row，只有 row 具有 transformedIndex。独立实例可使用固定模板、声明身份或生成器建立稳定锚点，不产生 datum lineage。模板的 index 与字段占位符需要行实例；独立实例使用 index 时明确诊断，不伪造索引 0。字段占位符仍建立有效字段依赖。锚点注册、重复标识检测和引用解析对两种实例使用同一入口。

RelationMark 暂时保留，适配移除顶层 data/annotation 判别后的统一声明与实例来源规则；其已有投影位置使用相同位置原子，目标引用继续复用原寻址契约。RelationMark 的替代与 Kernel 几何能力扩展仍由各自决策负责。

## 行为、失败语义与兼容性

- field/value/edge 混写、未知特殊值、非法常量、未知位置角色、Path 两类输入混用及旧 kind 等非法 JSON 在 schema 边界拒绝；TypeScript 类型表达相同限制
- 未知字段、聚合后字段不存在、缺少实际坐标所需位置、无法映射位置、缺少坐标连接能力及无法确定范围明确诊断，不回退第一行、零值、像素坐标或直线
- 缺测值、退化几何、裁切、主题、锚点、位置调整和字段驱动样式沿用所属几何的现有规则；“单实例”不保证退化输入一定产生可见面积
- 删除 Annotation 公共 API、独立 Source 分支、专属 definition capability 和旧文档入口，不保留别名、兼容转换或新旧双轨；已有 Mark 的位置字符串、properties 位置和旧 kind 同步迁移
- Chart 继续拥有精确 recipe 与 semantic group；其内部生成的 Plot Mark 和 plotExtension 使用统一契约，不将 Plot 三类位置输入直接扩散到 Chart 的 field-only recipe 输入

## 文档与示例交付

Annotation 的现有用户能力和 demo 必须随代码完整迁移到对应 Mark 文档，中文与英文同时更新：

| 目的文档                  | 必须承接的内容                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| PointMark                 | 固定目标点／文字、字段位置与外观、聚合点、分组点、常量与字段混用、一维位置                  |
| PathMark                  | 固定阈值线、显式端点路径、平均／中位参考线、分组路径、edge 全范围与局部范围、坐标连接与直连 |
| IntervalMark              | 固定高亮区域、显式端点边界、聚合／分组参考区域、完整范围与局部范围、坐标连接与直连          |
| Mark 与 Encoding 共同说明 | 三类位置输入、实例来源、局部 transforms、空数据、domain 贡献、身份与错误语义                |

迁移保留现有 demo 的交互意图，包括笛卡尔／极坐标切换、分组开关、统计方式切换、边界范围与连接方式。不得以删除 Annotation 页面代替能力迁移，也不得将三个几何的示例只集中到一篇新概览。综合展示使用统一 Mark 组合，各几何页面包含自身完整可运行示例。

同步迁移公开 API 参考、Schema 展示、React／Vanilla／JSON 示例、导航、站内链接、预览注册与其它页面中的 Annotation 消费；移除已被替代的 Annotation 页面、生成参考和空目录。文档中的“标注”可继续描述用途，但不能再引导用户调用已移除的 API。Data 的 annotate 数据操作属于独立能力，不因图形 Annotation 移除而删除或改名。
