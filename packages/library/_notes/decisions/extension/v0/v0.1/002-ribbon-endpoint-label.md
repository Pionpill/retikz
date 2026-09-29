---
description: Ribbon 起终点标签与端帽并列配置，依据最终端帽轮廓和端面基底定位，复用 Kernel 文本能力并独立控制朝向。
keywords: Ribbon、端点标签、端帽、和弦图、label、rotate、Extension
---

# ADR-002：Ribbon 端点标签

- 状态：Accepted
- 决策日期：2026-09-29
- 关联：[001](./001-ribbon-endpoint-outline.md) · [Drawing Complete](../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景与目标

和弦图及连接带需要在流带接入端面处显示文字。现有 `Path.label` 沿中心线弧长定位，`sloped` 使用中心线切线；即使 position 取 0 或 1，也无法同时表达端帽形状的外边界、端面朝向及独立的文字旋转。

端点标签必须随端面和端帽变化，内置与自定义端帽采用相同定位规则。表示整个扇区的名称仍由扇区宿主承载；流带端点标签表示该连接的起点或终点，不负责聚合、去重或圆周排版。

## 决策：标签属于端点，与端帽并列

在 centerline 模式的 `start` / `end` 下增加可选 `label`，与 `direction`、`cap` 并列。端帽 Definition 只产生几何，不持有文本或返回标签专用锚点。标签位置由已有最终端帽几何推导，避免增加重复事实源。

Extension 拥有端点标签的持久化配置和端面定位语义；文字内容、字体、颜色、透明度、测量及文本图元生成复用 Kernel。通用的定向文本块定位能力归 Core，不在 Extension 复制富文本布局、字体测量或 renderer 分支。

## 基础数据结构与公开契约

```ts
kindOptions: {
  width: { kind: 'taper', start: 24, end: 40 },
  start: {
    direction: 90,
    cap: { name: 'butt' },
    label: {
      text: '来源',
      placement: 'outside',
      distance: 8,
      rotate: 'tangent',
      keepUpright: true,
    },
  },
}
```

端点直接引用 Kernel 的 `BoundaryLabelSchema`，不定义 Ribbon 专属标签 Schema。该共享契约从 Node 标签抽取，Node 与 Ribbon 复用相同字段；Node 的 position、pin 与单行内容约束仍属于 Node。输入和解析结果由 Kernel Schema 派生。每个端点至多配置一个文本块，多行通过文本块表达；省略 label 不生成标签。

| 属性          | 契约                                                                              |
| ------------- | --------------------------------------------------------------------------------- |
| `text`        | 必填，复用 Kernel TextBlock 的纯文本、多行和富文本能力                            |
| `font`        | 可选，复用 Kernel 字体配置与继承语义                                              |
| `textColor`   | 可选，复用 Kernel 标签颜色继承与 currentColor                                     |
| `opacity`     | 可选，0–1，与宿主透明度相乘                                                       |
| `align`       | `start`、`middle`、`end`，默认 `middle`；沿端面切向对齐                           |
| `placement`   | `outside` 或 `inside`，默认 `outside`                                             |
| `distance`    | 非负用户单位，默认 4，控制文字布局框到定位支撑线的间隔                            |
| `rotate`      | `none`、`radial`、`tangent` 或有限角度数值，默认 `none`；数值以 Path 局部坐标为准 |
| `keepUpright` | 布尔值，默认 false；在 Path 局部坐标系内保持可读朝向                              |

共享文本和外观字段直接组合 Kernel 权威契约。端点标签不接受中心线的 `position`、`side`、`sloped`、`interrupt`、`gap`；端点身份已经确定位置，放置方向与文字方向分别由 placement 与 rotate 表达。

`Path.label` 与两个端点的 label 可以共存，各自独立。boundary 模式继续禁止 start/end 配置，不隐式推断端帽标签。React、Vanilla、直接 JSON 使用相同的 kindOptions 和显式装配的 Ribbon Definition，不新增专用 adapter 或 JSX 子组件。

## 定位：由最终端帽轮廓决定外向支撑线

沿用 [001](./001-ribbon-endpoint-outline.md) 的端面中心 C、单位端面轴 S 和单位外向轴 N。端帽开放命令链已经位于 Path 局部坐标系，并包含 extension 的最终效果。令 P 遍历这条最终曲线，外向距离 h 为 `(P − C) · N` 的最大值，包含曲线内部极值，不能只取命令端点或基础采样点。

定位基点为 `A = C + hN`，经过 A 且平行 S 的直线称为端帽外向支撑线。A 不要求落在实际曲线上；对不对称或凹形自定义端帽，支撑线仍给出稳定、保守的外侧定位。h 可以为负，不钳制为零；不得将 extension 再次叠加。butt 对应端面直线，square 包含延伸，round/arc 包含圆弧外向极值，第三方端帽复用同一曲线规则。

`align` 复用 Kernel 的 start/middle/end，默认 middle；沿端面切向 T = [-N.y, N.x] 对齐。middle 时文本沿 T 居中，start/end 将文字布局框相对 A 分别沿 T 正向/反向偏移一个切向半投影长度。设完成旋转后的文本布局框在 N 方向的半投影长度为 r，则 outside 的布局框中心位于 `A + (distance + r)N`，inside 位于 `A − (distance + r)N`。布局框使用 Kernel 的文本度量，不能用字符数量估算。

outside 保证文字布局框位于端帽支撑线外；这不保证与流带其它部分、其它图元或其它标签无碰撞。inside 表示向内放置，不保证文字能被狭窄或凹形流带完整容纳；不自动裁剪、缩小、换行或避让。边距是布局框与支撑线之间的间距，不是字形墨迹距离或曲线最近距离。

## 朝向与 Kernel 消费契约

`none` 保持局部 0°；`tangent` 取 N 的角度加 90°（与端面平行），`radial` 取 N 的角度，显式数值直接指定文字基线角度。角度与 Path 使用相同坐标约定。placement 改变偏移方向，不改变文字朝向；start/end 的外向轴分别背离流带内部，不能由同一个中心线切线角度代替。

keepUpright 在归一化角度超出闭区间 [−90°, 90°] 时翻转 180°，在定位前确定最终朝向；恰好 ±90° 不翻转。它同样作用于数值角度；需要严格几何角度时设置 false。Path/Scope 后续变换整体作用于流带和标签，不再按屏幕坐标重新翻转。

Core 的宿主标签消费入口需要支持已确定的布局基点、单位偏移方向、边距及独立文字角度，并以共享文本度量计算旋转后的布局框投影。该运行时输入不包含端帽名称、Ribbon 模式或另一套持久化标签 IR；Extension 负责将端点契约解析为这些几何事实。现有依赖中心线切线的 Path 标签行为保持不变，不能通过伪造中心线切线同时承担端面偏移和文字旋转。

自定义 Path kind 通过 Core `wrapOutput` 对最终轮廓和标签统一执行宿主 `rotate` / `scale`、元数据及动画包装，旋转与缩放中心使用包含标签的完整布局边界；沿用 Kernel 描边路径的语义。`emitStroke` 已完成宿主包装，不再次包装。

标签输出使用普通 Scene 文本与变换，参与宿主的 bounds、provenance 和整体变换；不得把标签范围反馈为流带几何宽度或改变端帽曲线。端点身份应能在诊断与来源定位中区分。

## 行为、失败语义与兼容性

- 非法枚举、非有限角度、负 distance、非法文本与外观、混入中心线字段在 Schema 入口拒绝。
- 端帽无效仍遵循原端帽错误规则。无法得到有限外向支撑范围时失败，诊断包含 start/end 和对应字段；不得回退到中心线中点掩盖问题。
- 宽度为零但端帽几何有效时仍可显示端点标签；零宽 arc 的原有失败语义不变。
- 标签配置不进入 cap.params，不改变 RibbonCapDefinition / RibbonCapGeometry 的输入输出；自定义端帽无需新增标签回调。
- 此能力为新增可选配置。没有端点 label 的图保持现有行为；不修改 Path.label.side 或 sloped 的含义，也不将 Node.label.rotate 的所有模式扩展到 Path.label。
