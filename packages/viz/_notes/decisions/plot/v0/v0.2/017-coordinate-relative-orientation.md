---
description: 统一坐标局部切向契约，为 PointMark 提供沿坐标角色切向或法向的方向对齐，并与位置调整及 rotate 通道组合
keywords: orientation、PointMark、tangentAt、CoordinateFrame、切向、法向、rotate、曲线坐标
---

# ADR-017：坐标局部方向与点图元方向对齐

- 状态：Accepted
- 决策日期：2026-10-15
- 关联：[roadmap](./roadmap.md) · [坐标 registry](../v0.1/061-coordinate-registry.md) · [Mark Placement](./010-position-jitter.md) · [Plot 可视化完备设计](../../../../architecture/plot-visualization-complete.md)

## 背景与目标

点图元通过坐标系确定位置，其可视内容由 Core Node 绘制。既有 rotate 通道表达屏幕旋转角，不会自动跟随极坐标角度。文本、非对称形状等内容需要按当前位置的坐标方向旋转；未来曲线坐标同样需要沿某个角色的切向或法向定向。

该能力不能依赖极坐标专属的 radial / tangential 分支，也不能把可见坐标轴的标识当作方向来源。位置调整之后，方向必须与实际使用的坐标参数一致。坐标方向只影响节点朝向，不使节点随坐标曲线弯曲、缩放或剪切。

## 决策：坐标提供切向，图元声明对齐意图

Plot 坐标契约提供当前位置沿指定角色的屏幕切向。图元选择屏幕方向、坐标切向或坐标法向，并将所得角度与 rotate 通道组合。PointMark 是首个消费者，文本与形状节点使用同一规则；其它 Mark 不因共享契约而自动获得方向语义。

局部方向属于 Plot 的 Coordinate 能力，通过现有 CoordinateDefinition、defineCoordinate 和坐标 registry 提供；内置与自定义坐标使用同一接口。Core 只接收最终位置和数值旋转角，React、Vanilla、Chart 与 renderer 不承担方向计算。

固定其他映射后角色参数，只增加选定角色参数，得到经过当前点的坐标曲线。其导向为切向，切向按 Core 正旋转约定旋转 90° 为正法向。法向不是另一个角色的切向，也不是 containment 使用的边界法向；这一区分在斜交和一般曲线坐标中必须成立。

## 基础数据结构与公开契约

PointMark 增加 JSON-safe 的 orientation 属性：

```ts
type IRPlotMarkOrientation =
  | { kind: 'screen' }
  | {
      kind: 'coordinate';
      role: DimensionRole;
      align: 'tangent' | 'normal';
    };
```

省略 orientation 等价于 `{ kind: 'screen' }`。coordinate 分支要求显式 role 与 align；role 使用当前有效坐标视图声明的角色，而非 Axis guide ID。内置极坐标的 x 为角向、y 为径向；自定义坐标可使用自身声明的角色。方向配置是图元级意图，不新增字段通道；每条数据的角度差异仍通过 rotate 常量或字段通道表达。

```tsx
<PointMark orientation={{ kind: 'coordinate', role: 'x', align: 'normal' }} rotate={15} />
```

上述片段表示将节点局部正 x 方向对齐到 x 坐标曲线的正法向，再按既有角度单位额外旋转 15°。反向可通过 rotate 增加 180° 表达，不引入坐标系相关的 inner / outer 枚举。orientation 不触发文字自动翻正。

CoordinateFrame 及其创建入口提供以下可选运行时能力，函数不进入 IR：

```ts
tangentAt?: (
  role: DimensionRole,
  mappedRoles: ReadonlyArray<number>,
) => Position | null;
```

mappedRoles 与 projectMappedRoles 使用相同顺序、单位和位置参数。返回值是屏幕向量，幅值不要求归一化，但必须有限且非零；无法定义唯一局部方向时返回 null。反向 scale 改变参数映射，不改变“映射后参数递增”为正向的定义。该能力不是原始数据顺序的导数，离散角色也在其映射后的连续坐标空间求方向。

只保留切向这一独立几何事实。位置来自既有投影能力，法向和角度由消费者推导，不跨层复制 origin、normal、angle 或完整变换矩阵。

新契约替代接受原始角色值的 frameAlong；坐标创建入口与 Guide 同步迁移，不保留旧名别名。Guide 原有缺省数值求切向能力保留，但不能作为显式请求 PointMark 坐标方向时的隐式兜底。提供 tangentAt 的坐标必须同时提供同源 mapRoles 与 projectMappedRoles，保证位置和方向在同一参数空间。

## 位置、方向与节点的组合

方向查询与坐标投影共享 role-space adjustment 完成后的 mappedRoles。因此 angle jitter 后使用调整后的角度，曲线坐标中的角色位移后使用新位置的局部方向。没有 placement 配置时，使用原始字段经过 scale 映射的参数，语义相同。

screen-space adjustment 与 dx / dy 只改变最终屏幕位置，保持上述方向参考点，不反解坐标参数。位置与方向按同一个 placement target identity 对应，不能重新按数据顺序猜测配对或重新执行随机调整。

节点最终角度为对齐基准角与已解析 rotate 的和。screen 基准角为 0；tangent 基准角使节点局部正 x 方向与切向同向；normal 基准角在切向角基础上增加 90°。rotate 的既有单位、通道尺度与默认规则不变，省略时角度偏移为 0。每个节点只消费一次合成结果，不能再由 Scope 默认值或通道交付重复覆盖、叠加。

Core Node 继续负责旋转后的形状、文本、边界、标签与锚点语义。Plot 的数据身份与 provenance 保持不变，方向不得另建一套与实际节点不一致的连接边界。

## 行为、失败语义与兼容性

- 默认屏幕方向保持现有结果，不要求坐标提供 tangentAt；既有 rotate 使用方式保持不变。
- 请求 coordinate 方向时，未知 role、缺少两段投影或切向能力均由 Plot 明确报错。方向解析错误包含图元、角色与适用时的 target identity。
- 既有规则判定不可投影的目标仍跳过；能投影但方向不唯一的目标不静默退回屏幕方向，也不借用相邻数据的方向，而是报错。
- 零向量、非有限向量属于无效方向。极坐标圆心的角向、分段曲线的不可微尖点等返回 null。极坐标 chord 插值必须使用实际直线段的切向；连接处只有两侧方向一致时才具有唯一切向，不以圆弧切向冒充多边形切向。
- 内置二维直角、极坐标及一维坐标在角色有效且局部方向可定义的位置提供该能力；平滑自定义曲线通过相同接口接入。
- frameAlong 的替换是 runtime coordinate 扩展契约的 breaking change。已有定义迁移至 tangentAt，不保留双轨；JSON 坐标声明与默认 PointMark 朝向不变。本决策替代此前关于 frameAlong 的局部标架入口约定，坐标 registry 的所有权与注册规则继续有效。
- React、Vanilla 与 JSON IR 表达同一 orientation 契约；standalone、embedded 和直接 lowering 使用同一 Plot 解析路径。
- PointMark 用法、坐标扩展文档和相关 API 说明须与行为同步更新，zh / en 对等；实现原理明确“默认只定位，显式方向对齐才额外读取局部方向”。

## 实现摘要

内置直角与极坐标及其一维形式均提供局部切向，PointMark 文本与形状共用方向合成。Guide 已迁移至同一坐标契约；位置调整、节点旋转、连接边界和数据身份沿用既有链路。自定义坐标需声明同源投影和切向；不唯一的方向仍按本决策明确报错，不提供自动翻正或曲线变形。
