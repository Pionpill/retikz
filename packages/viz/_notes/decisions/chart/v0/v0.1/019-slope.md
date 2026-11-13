---
description: Slope 以每行两个阶段值表达实体变化，复用 Plot 完整端点路径、观测点和标签
keywords: Slope、坡度图、两阶段、端点标签
---

# ADR-019：两阶段配对的 Slope 坡度图

- 状态：Accepted
- 决策日期：2026-11-12
- 关联：[roadmap](./roadmap.md) · [018](./018-line.md) · [Plot 030](../../../plot/v0/v0.2/030-path-endpoint-missing-values.md) · [Chart 总设计](../../../../architecture/chart-design.md)

## 背景与目标

Slope 比较同一实体在两个阶段的数值变化。区别于任意长度的 Line 序列，它固定两端的数据角色和阶段顺序，并提供端点实体标签。颜色只是识别辅助，不决定实体配对。

## 决策：每行配对两端，共享数值尺度

采用 family `line`、chartType 与 semantic mark kind `slope`。每行保存一个实体的 `start`、`end` 两个观测值，通过 Plot 的完整端点 PathMark 连接；两端各自使用 PointMark 与节点标签。Chart 不做跨行 join、聚合、补零、排序或标签避让。

该结构天然保持配对，不受行顺序或重复颜色影响。长表需由调用方先整理为配对数据；相同实体名的多行仍是独立观测，不隐式合并。需要多阶段序列时使用 Line。

## 基础数据结构与公开契约

```ts
{
  namespace: 'chart',
  type: 'line',
  data: { reference: 'comparisons' },
  recipe: {
    chartType: 'slope',
    encodings: { entity: 'product', start: 'previous', end: 'current' },
    properties: { stages: ['去年', '今年'], point: true, label: true },
  },
}
```

### 数据角色

- `entity` 必填，直接字段映射，用于名称标签与默认分类颜色，不用它跨行连接。
- `start`、`end` 必填，直接字段映射，可声明或引用位置尺度；两端必须共用同一 y 尺度，默认 linear。允许显式注册的自定义尺度，不隐式聚合。
- `color` 可选，直接字段与 ordinal 尺度映射；省略时使用 entity。常量路径颜色与点填色分别覆盖视觉结果，不影响配对。
- `row`、`column`、`facet` 复用 Plot 分面；单独提供 facet 而无分面维度非法。

### 常量属性

- `stages`：两个不同的非空阶段名称，按 start、end 顺序；省略时使用对应字段名。同一字段用于两端时必须显式提供不同名称。
- `path`：直线连接的描边外观，默认线宽 2；不提供 curve、闭合与缺值桥接，避免改变两阶段比较含义。
- `point`：boolean 或点样式对象，默认 true；false 隐藏点，true 或对象开启。支持 size、shape、fill、stroke、strokeWidth、opacity，显式 0 保留。
- `label`：boolean 或单个标签配置对象，默认 true。每端一个标签，内容固定取 entity，不提供 name/value 开关、标签数组、独立端点配置或额外标签映射。样式复用 Plot 节点标签契约；默认起点向左、终点向右，显式 position 同时覆盖两端。支持距离、字体、颜色、旋转、放置与引线等配置，内容不可另设。关闭点不关闭标签，关闭标签不关闭点。

默认生成阶段轴与数值轴；实体名称已直接标注，不默认添加图例。需要图例或更细的轴控制使用 recipe guides 与 Plot extension 的现有出口。阶段轴采用 point 尺度并为端点文字留出空间，y 轴域覆盖两端有效观测值，默认上下各留 32 个绘图单位供端点标签使用；显式声明的数值尺度保留自身留白配置。

### Chart mark 与 authoring

SlopeMark 继承 entity、start、end、color 与成员属性，仅允许直接覆盖 start、end 字段和 path、point、label 样式，不覆盖阶段名称、实体身份或分面。成员样式按字段继承；省略继承，false 关闭，true 开启并保留继承样式，对象开启并覆盖指定叶子。`override: true` 原位替换整个路径、点与标签组；普通声明追加整个组。

主题与默认片段沿现有 Chart 和 Plot 链路生效，不增加平行主题或标签格式体系。各 Chart 包的 `/line` 入口提供 Slope 精确 schema、provider contribution、Vanilla `slopeChart` / `slopeMark`、React `SlopeChart` / `SlopeEncodings` / `SlopeProperties` / `SlopeMark`；React 调度 Vanilla，三种入口表达同一 Source 契约。

## 行为、失败语义与兼容性

- 任一端字段值无法映射为有限数值时不绘制该行连线；另一端有效时仍可显示点和标签。空数据不生成数据图元，不补值、不跨实体连接。映射后的坐标投影失败仍遵循 Plot 错误语义。
- 重复阶段名、不一致的显式数值尺度、非法 facet 配置在 Source 边界诊断；未知字段、尺度引用和不匹配坐标继续由正式 Chart / Plot 边界诊断，不静默降级。
- 重复名称、相同颜色、倒序输入及上升、下降、持平均不改变每行配对。每行就是一个比较单元，不承诺按 entity 去重。
- 标签可能重叠；通过样式、数据筛选或分面控制密度，不引入自动避让算法。
- 新增能力不改变 Line、Point 图表及底层 Plot 默认值；不建立旧名别名或 renderer 专属行为。
