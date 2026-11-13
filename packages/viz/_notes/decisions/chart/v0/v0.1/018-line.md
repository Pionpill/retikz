---
description: Line 的序列连接、系列身份、可选观测点与 PathMark 组合契约；区分连接顺序和尺度顺序，统一 JSON、Vanilla 与 React 入口
keywords: Line、折线图、序列、PathMark、point、connectNulls
---

# ADR-018：Line 有序序列图

- 状态：Accepted（2026-11-12）
- 决策日期：2026-11-12
- 关联：[roadmap](./roadmap.md) · [Chart 总设计](../../../../architecture/chart-design.md) · [Chart 封装完备设计](../../../../architecture/chart-encapsulation-complete.md) · [009](./009-family-recipe-chart-schema.md) · [011](./011-chart-encoding-field-mapping.md) · [012](./012-chart-react-declaration-authoring.md) · [015](./015-theme-source-fragments.md) · [016](./016-vanilla-input-embed.md)

## 背景与目标

Line 表达指标沿时间、数值或有序类别序列的变化，路径是主体，观测点是可选辅助。Connected Scatter 表达二维观测之间的行进轨迹，连接顺序是独立的必填角色，点与路径共同构成图形。两者共享 Plot 几何，但拥有不同的数据阅读契约。

Line 不因曲线、阶梯、显示点、横向布局或紧凑展示而拆分 chartType。Sparkline 是 Line 的配置与使用示例，不建立独立 Chart 或 Chart mark。Slope、Bump 与面积系列不属于本决策。

## 决策：以开放 Path 为主体组合可选 Point

采用 family `line`、chartType `line` 和 semantic mark kind `line`。具体 Line recipe 下沉到 Plot 的开放 PathMark；`point` 为 true 或样式对象时追加同一数据、同一位置与系列颜色的 PointMark。Chart 不实现曲线求解、缺值桥接、数据排序算法或 renderer 分支。

Line 使用既有 recipe / mark Definition、compile-bound provider、Theme Source 默认片段与 Plot lowering 链路。它是一个精确的内置 recipe，不开放第三方 Line recipe registry；自定义通用图形继续使用 Plot。

## 基础数据结构与公开契约

Source 延续 Chart shell，最小输入如下：

```ts
{
  namespace: 'chart',
  type: 'line',
  data: { reference: 'observations' },
  recipe: {
    chartType: 'line',
    encodings: { x: 'position', y: 'value' },
    properties: { point: false, path: { strokeWidth: 2 } },
  },
}
```

### 数据角色

| 角色                     | 契约                                                                                                                    |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `x`、`y`                 | 必填位置角色；复用直接字段、单值聚合及命名 scale operation / reference 映射，不引入第二套字段映射语法                   |
| `order`                  | 可选直接字段映射；控制每个系列内的连接顺序，不绑定 scale，不承载聚合                                                    |
| `series`                 | 可选直接字段映射；决定路径分组身份，并默认通过 ordinal scale 分配系列颜色；允许显式 ordinal scale operation / reference |
| `row`、`column`、`facet` | 复用 Chart 的 Plot 分面映射；`facet` 配置必须具有 row 或 column 角色                                                    |

没有 `series` 时，每个分面是一条序列。系列身份不随常量颜色改变，相同颜色的两个系列仍是两条路径。本版本不提供独立的逐行 color / opacity / dash 字段编码，避免把 Path 的单路径样式误表达成逐顶点样式；常量线型和颜色由 properties 设置。

位置尺度使用既有 Chart 映射优先级；未声明尺度时 x/y 使用 linear fallback。类别位置显式选用 point 或 band，时间位置显式选用 time；Data model 与 Plot 负责字段解释和投影，Chart 不新增数据类型推断。数值域、零基线、反向、类别 domain 与时间格式服从所选尺度的正式契约。

### 连接顺序

- 省略 `order` 时，保留最终 Data view 在每个分面、系列内的行顺序，不隐式按 x 排序。
- 指定 `order` 时，复用 Plot Path 的稳定升序：有限数值按数值比较，其余有效值按字符串比较，缺失与非有限数值排在有效值之后；相同排序值保留原行顺序。
- 类别 domain、反向轴和时间格式只控制投影，不重排路径。需要业务类别顺序、解析日期顺序或降序连接时，由作者提供排序字段或预先使用 Data 变换，并省略不需要的 `order`。
- 同一个 x 的多行不会被自动去重、聚合或平均，仍按连接顺序绘制。声明聚合时，按既有 Chart encoding 聚合契约生成最终 Data view，再消费连接角色。
- 缺失整行不等于有一行但位置缺失；Line 不推测采样间隔、不补行、不补零。

### 常量属性与默认值

| 字段                | 契约与默认                                                                                                                                               |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `path`              | 开放路径属性；支持 curve、stroke、strokeWidth、opacity、lineCap、lineJoin、dashPattern、shadow、blendMode、connectNulls；不开放 fill、closed 或 baseline |
| `path.curve`        | 默认 linear；完整复用 Plot 的直线、阶梯与曲线取值和约束，不近似为另一种曲线                                                                              |
| `path.strokeWidth`  | Line 默认 2；作者可以覆盖，不改变 Plot Path 的默认值                                                                                                     |
| `path.connectNulls` | 默认 false；true 或桥接样式对象复用 Plot 的缺值桥接，包括其默认虚线行为；不产生新观测值                                                                  |
| `point`             | boolean 或样式对象；默认 false 不输出辅助点，true 或对象开启；对象支持 size、shape、fill、stroke、strokeWidth、opacity，值域复用 Plot / Core             |

系列颜色默认统一应用到路径与辅助点；显式 `path.stroke` 和 `point.fill` 分别覆盖对应成员，不改变系列身份。无系列时使用当前主题默认颜色。默认提供 x/y 轴，存在系列时提供系列颜色图例，图例线符号与路径颜色一致；guide 的显式配置遵守现有 Chart 优先级，不新增独立图例系统。

### Chart mark、主题与入口

LineMark 继承 recipe 的 x/y/order/series 及 path/point，允许直接覆盖 x/y/order 字段与成员常量；不覆盖 series 或分面身份。point 省略时继承配方，false 明确关闭，true 开启并保留可继承样式，对象开启并逐字段覆盖继承样式；空对象同样开启。成员属性按字段合并，显式 false 和 0 不被缺省替换。`override: true` 原位替换整个同 kind semantic group，包含其可选点；普通 authored mark 追加整个组。

Theme 沿 Core 环境选择与 ChartThemeDefinition 的 `defaults` / `defaultPlot` 生效；实例使用 `defaultChart` 与 `plotExtension.defaultPlot`，遵守现行 Source 的允许字段和覆盖顺序，不新增 recipe Theme slice，也不通过主题增删辅助点。Chart 根 coordinate 与 PlotExtension 保持既有出口；替换 coordinate 必须满足 x/y 角色契约，分面复用其 coordinate 模板。复杂逐点样式、附加标签和其它 Plot mark 走显式 PlotExtension，不作为 Line 的新角色。

公开入口使用各 Chart 包的 `/line`：精确 `LineChartSchema`、Line provider contribution、Vanilla 的 `lineChart` / `lineMark` 与 React 的 `LineChart`、`LineEncodings`、`LineProperties`、`LineMark`。这些名称表示具体 line recipe，不是接收任意 line family 图表的宽入口。React 只适配 Vanilla Input；等价 JSON、Vanilla 与 React 输入生成相同 Source 与 Plot 结果。

## 行为、失败语义与兼容性

- 空数据不产生路径；不足两个有效点的连续片段不产生线段，启用辅助点时仍显示有效观测点。无效投影按 Plot 的缺值规则处理，不替换成零。
- 未知字段、非法 curve / 属性、错误 family、未安装 provider、未知尺度引用、缺失字段及不匹配 coordinate 在所属 schema / resolve / compile 边界报告，不静默降级或改换图表。
- 保留 Chart 既有重复 override、未匹配 override 警告与 Source 错误路径规则；Line 不另建异常模型。
- 新增精确 Line 能力，不改变 Connected Scatter、Regression 或底层 Path 的现有行为，不增加旧 API 别名。
