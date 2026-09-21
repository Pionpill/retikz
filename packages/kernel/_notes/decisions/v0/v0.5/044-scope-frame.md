---
description: Scope 通过显式 frame 装饰固有内容包络，支持填充、描边与图元级效果，保持布局和引用的单向依赖
keywords: Scope、frame、包络、背景、padding、图案、shadow、无环、hitTest
---

# ADR-044：Scope 内容包络外框

- 状态：Accepted
- 决策日期：2026-09-19
- 关联：[v0.5 roadmap](./roadmap.md) · [Scope 锚点与变换](./002-scope-anchor-and-transform-pivot.md) · [完整 Scope 输出](./020-layout-aware-scope-output.md) · [组效果边界](../v0.4/030-group-scope-effect-boundary.md) · [Drawing Complete](../../../architecture/core-drawing-complete.md)

## 背景与目标

Scope 已能组织子图、传递样式，并以固有包络提供引用与定位。作者需要为已有子图添加统一背景、轮廓或背景形状的阴影，而不重新安排子内容，也不手工维护一份跟随内容变化的外框尺寸。

`Scope.style.fill` 与 `stroke` 已表示后代样式继承，不能因设置这些字段就隐式创建背景。布局容器的空间分配、圆角与 overflow 仍由 Standard Surface 等组合能力负责；本决策只为已有 Scope 包络增加可绘制装饰。

## 决策：使用独立的 frame 装饰固有包络

Core 拥有 `Scope.frame` 的可序列化语义。外框是 Scope 的派生绘图结果，复用已有几何、paint 与图元效果契约，不成为参与子内容布局的普通 Node，也不增加一种 Scene primitive。

外框始终位于所属 Scope 全部子内容下面，随 Scope 一起变换、定位和执行组动画。子内容的局部 zIndex 不能越过外框；Scope 自身 zIndex 仍控制它与外部兄弟内容的顺序。

理由：

1. 样式继承与容器自身外观必须显式区分，现有配置不能意外产生额外几何。
2. 内容决定外框，外框不能反向决定内容尺寸或位置；装饰不引入布局求解器。
3. 相同 IR 必须在 React、Vanilla、直接编译与组合输出中具有相同效果，不能由 adapter 或 renderer 私自补画。

## 基础数据结构与公开契约

以下展示 Source 契约形态，实际类型由公开 Schema 推导：

```ts
type IRScopeFrameSource = {
  padding?: number;
  style?: IRGraphicStyle;
};

// Scope 的既有字段继续保留
type ScopeFrameFragment = {
  frame?: IRScopeFrameSource;
};
```

`frame` 省略时不产生装饰；`frame: {}` 显式开启外框。`padding` 是有限非负的局部坐标距离，默认 0，表示内容包络与外框之间的均匀间距，不是分配给子内容的布局内边距。

外框复用 Scope 已确定的 `boundingShape`：矩形包络向四边各扩展 padding，圆形包络半径增加 padding，中心不变。缺省仍为矩形。外框不增加第二套 shape 选择器或 registry；形状范围与 Scope 包络契约一致，不开放完整 Node 的文字、label、连接、尺寸或定位能力。

`style` 复用通用图形样式原子，支持已有 fill / stroke paint（含内置与自定义图案）、透明度、描边样式、shadow 与 blendMode。缺省填充为 `none`，描边为 `currentColor`，线宽为 1，无阴影，混合为 `normal`，透明度为 1。其它描边参数遵循通用图形样式默认。样式内显式字段覆盖这些默认；`currentColor` 与上下文颜色仍由有效 Scope 颜色上下文解析。

外框不继承 `Scope.style` 的 fill / stroke、node/path 默认值或祖先 frame，也不向后代传递自己的 style；只消费已有有效颜色上下文。frame 内部不接受 id、meta、zIndex、独立动画或事件配置。

```tsx
<Scope frame={{ padding: 12, style: { fill: 'white', stroke: 'gray', shadow: 'lg' } }}>{/* 既有子内容 */}</Scope>
```

Vanilla 的 Scope 输入与手写 Scope IR 表达相同的 `frame` 数据；React 只负责把输入传给同一归一化与编译链。layout-aware composite 的完整 authored Scope 输出必须支持同一字段。Layout 的 `rootScope` 不因此扩展，作者需要外框时显式使用 Scope。

## 包络、绘制与无环约束

依赖保持为「子内容 → 固有内容包络 → 外框 → Scene」。外框依据现有 Scope 固有包络，而不是 renderer 测量值或包含阴影的可见像素范围；Path 曲线外溢、label、marker 等是否进入内容包络，继续由现有包络契约决定，frame 不扩大其定义。

外框不参与本 Scope 或祖先 Scope 的内容包络、布局 allocation、slot size、空间锚点及连接裁剪边界。已有 id、boundingShape、selfAnchor、pivot、placement 与命中区域保持不变。因此 padding 可能让外框伸到现有锚点之外；需要连接真实容器边界时，应使用有独立几何或 allocation 的 Node / Surface。

外框的绘制范围，包括描边与现有阴影外溢，必须进入 visual bounds 与自动取景，并按既有裁剪与变换契约处理。显式 viewBox 不自动扩张。嵌套 Scope 的外框仅贡献绘制范围，不作为祖先外框扩张的输入；祖先框不承诺包住后代装饰或阴影。

Scope.clip 作用于外框和子内容的整体输出，可能裁掉 padding 或阴影，不自动扩大裁剪区。shadow 只投影外框几何，blendMode 只作用于外框图元；两者不把内容、文字或子组先合成后处理，整组离屏效果仍遵循既有独立决策。

无公开 id 不等于无运行时所有权。派生外框归属于该 Scope occurrence，增量增删、样式变更和子内容变化必须更新或移除对应输出；不得遗留旧图元、资源或副作用，也不得为外框发布独立命名引用与空间 handle。

## Scene 命中隔离

匿名图元仍可能通过祖先 id 或运行时 occurrence 参与命中，因此省略外框 id 不能保证交互边界不变。普通 Scene 图元增加以下可选契约，由 Core 表达、Render 消费：

```ts
type SceneHitTestFragment = {
  hitTest?: false;
};
```

省略 `hitTest` 时沿用现有命中行为；`false` 表示该图元不参与指针命中，也不能通过祖先或运行时标识成为事件目标。用于 group 时排除整个子树，后代不能重新开启命中。禁用命中不影响绘制、取景、裁剪、变换、动画或运行时所有权，也不阻止命中其下方的其它内容。

Scope 派生外框固定输出 `hitTest: false`，Scope 内容保持原有命中行为。此字段属于 Scene 消费契约，不在 `frame`、Node、Path 或 Scope authoring 中新增可配置的交互选项。

SVG 将禁用命中映射为 `pointer-events="none"`，Canvas 点测排除对应图元或子树；静态输出与 retained 更新均保留相同语义。运行时分配标识不能覆盖该限制，禁用命中的装饰也不能触发祖先的指针事件或悬停动画。

## 行为、失败语义与兼容性

- 空 Scope 没有内容包络时不输出外框，即使 padding 非零；不凭装饰创建一个可布局节点。非空但退化的包络保留既有几何退化语义，padding 可扩展其绘制尺寸。
- padding 非法值、未知字段或不合法的 style 数据由统一 Schema 拒绝；图案名称、资源与颜色解析失败沿用当前 Core 诊断，不静默回退。
- 子内容编译或引用失败时不通过外框掩盖错误；自引用、前向引用等保持现有失败规则，不增加自动重排或迭代求解。
- 内容或 frame 改变后一次确定性编译产生结果；外框不得重新进入自己的包络输入。相同输入与环境的全量和增量结果必须等价。
- 未提供 frame 的 Scene、定位、布局与事件行为保持原样。新增 frame 只改变约定的绘制输出及自动取景，不改既有 fill / stroke 继承含义，不提供旧名别名。
- SVG 与 Canvas 消费同一普通图元输出，图案与阴影沿既有资源链执行；保留现有后端效果差异，不承诺逐像素一致。
