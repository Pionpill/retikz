# ADR-04：重构 Frame 为带 Node-like header 的语义分组框

- 状态：Accepted
- 决策日期：2026-07-23
- 关联：[Standard v0.1 roadmap](../roadmap.md) · [alpha.1 roadmap](./roadmap.md) · [ADR-03](./03-frame-composite.md) · [Standard Drawing Library 设计](../../../../../architecture/standard-library-design.md) · [Drawing Complete](../../../../../../../kernel/_notes/architecture/core-drawing-complete.md)

## 背景

ADR-03 的 Frame 可以自动围合 Node，但标题只是 Path label 字符串，不能复用 Core Node 的文本、shape、style、font、label、meta 与 animation。嵌套 `border`、作为边框外扩的 `gap` 也混淆了 Frame 自身样式和 header 排列。

Frame 的长期语义是有默认边框、可组合 header 和稳定身份的分组框。它只排列自己的 Title / Description，不重排 body children，也不成为通用 Stack。

Core v0.5 alpha.1 已提供 `IRAnchorPosition`，普通 Node 可以在真实布局完成后对齐已解析实体的 anchor。Frame 直接消费该能力，不复制文本测量或 Node layout。

## 决策

保留 `standard.frame` Tier 2 discriminator，但用 ADR-04 契约替代 ADR-03 的公开字段。Frame root lower 为带 id 的 Scope，内部包含默认矩形边框、body Scope 和可选的 Title / Description Core Node。

```ts
type IRFrameTitle = Omit<IRNode, 'type' | 'position' | 'text'> & {
  text: NonNullable<IRNode['text']>;
};

type IRFrameDescription = Omit<IRNode, 'type' | 'position' | 'text'> & {
  text: NonNullable<IRNode['text']>;
};

type IRFrame = {
  namespace: 'standard';
  type: 'frame';
  id: string;
  padding?: number | IRBoxSpacing;
  gap?: number;
  headerDirection?: 'horizontal' | 'vertical';
  stroke?: IRPath['stroke'];
  strokeWidth?: number;
  strokeOpacity?: number;
  dashPattern?: Array<number>;
  dashOffset?: number;
  lineCap?: IRPath['lineCap'];
  lineJoin?: IRPath['lineJoin'];
  fill?: IRPath['fill'];
  fillOpacity?: number;
  fillRule?: IRPath['fillRule'];
  cornerRadius?: number;
  zIndex?: number;
  title?: IRFrameTitle;
  description?: IRFrameDescription;
  children: Array<IRNode>;
};
```

### 边框、padding 与层级

- Frame 样式字段直接描述自身边框，不再嵌套 `border`
- `padding` 默认 8，并按 `side > axis > default > 8` 解析；它只扩张最终边框，不移动 header 或 body
- `cornerRadius` 可选且非负；lowering 只在字段存在时写入 rectangle step，Core 负责限制到短边一半
- 默认边框为矩形、`stroke: currentColor`、`strokeWidth: 1`、无填充，内部 `zIndex` 为 -1
- Frame `zIndex` 作用于外层 Scope；body Scope 固定为 0，header 默认 1，显式 header `zIndex` 原样保留
- Frame 不提供整体 opacity，边框透明度与 body / header 视觉透明度保持独立

### Title / Description 与布局

`FrameTitleSchema` 与 `FrameDescriptionSchema` 从公开 `NodeSchema` 精确 omit `type` / `position`，并将 `text` 收窄为必填。两者继续使用普通 Core Node compile、Scene 与 renderer 路径；空字符串沿用 Node 的合法文本语义。

默认 Title 使用透明 rectangle、零 padding、`font.size: sm`、`font.weight: 600`；Description 使用透明 rectangle、零 padding、`font.size: xs`、`opacity: 0.7`。显式 Node 字段覆盖默认值，font 逐字段合并。

`headerDirection` 默认 horizontal，`gap` 默认 4：

- horizontal：Title 位于 body 上方；Description 接在 Title 右侧并 bottom 对齐；header row 与 body 之间也使用同一 gap
- vertical：Title、Description、body 纵向排列
- 只有一个 header part 时，无论方向都直接放在 body 上方

lowering 通过普通 Node `IRAnchorPosition` 建立 `content → title → description` 或 `content → description → title` 的已解析依赖链。body Node 的原 position 永不被 Frame 改写。

### identity 与错误

缺省 id 稳定派生为 `${frame.id}/content`、`${frame.id}/title`、`${frame.id}/description`。Frame schema 对 direct body Node、Title 与 Description 的显式 id 保留 frame id 及这三个派生 id，命中时 fail-loud；其它跨树重复仍由 Core duplicate-id 诊断处理。

body 至少包含一个直接 Core Node。Path、Coordinate、Scope 或 foreign composite 不会被 adapter 静默丢弃。Frame 不提供多 Title、多 Description、任意 React slot 或 body 自动布局。

### 宿主入口

React 公开独立 `<Frame>`, `<FrameTitle>` 与 `<FrameDescription>`。header part 只能作为 Frame direct child，重复、无效 child 或独立渲染都会 fail-loud。React 通过公开 Node JSX → IR 转换复用 Node authoring，不复制 Kernel builder 或 hydration event props。

Vanilla 公开 `frame()`、`frameTitle()` 与 `frameDescription()`；两个 header builder 只生成 JSON-safe Node-like input，不注册独立 composite。React 与 Vanilla 贡献同一 `FrameDefinition`，直接 IR 通过 `composites: [FrameDefinition]` 接入

## 被否决的方案

- 保留 Path label 作为标题：无法承载 Node-like 语义与工具链 identity
- 新增 `FrameBorder`：边框是 Frame 成立所必需的外观，不形成独立能力
- Frame 私有文本测量或 position：会复制 Core Node layout 与 anchor contract
- 开放任意 header layout registry：alpha.1 只有两个封闭排列策略，没有扩展证据
- 为 ADR-03 保留 alias：v0.x 优先收敛正确公开契约，不保留 `label`、嵌套 `border` 或旧 `gap` 桥接

## 公开影响与兼容性

- BREAKING：删除 `IRFrame.label` / React `label`，迁移为 Title；删除嵌套 `border`，视觉字段提升到 Frame 顶层
- BREAKING：旧 `gap` 的边框外扩语义改名为 `padding`；新 `gap` 表示 header parts 与 body 的间距
- 新增 JSON-safe `title`、`description`、`headerDirection`、box spacing `padding` 与 `cornerRadius`
- React 新增 `FrameTitle` / `FrameDescription`；Vanilla 新增对应 builder
- renderer 仍只消费普通 Scope、Path、Node 与 text Scene primitives

## 最终实现与验证摘要

- Standard 已实现 Node schema 复用、默认样式、两种 header anchor 链、box padding、圆角、稳定派生 id 与保留 id 诊断
- React / Vanilla 对同一 Frame input 生成等价 IR；React 对重复 part、非法 child 与独立 part fail-loud
- 双语 Frame 页面、默认 / 横向 / 纵向 demo、controls、API 表、AI JSX parser 与 `LogicFrame` dogfood 已同步
- schema、lowering、Node 字段透传、z-index、scale / rotate / margin、圆角、错误路径与跨 composite 组合均有自动化证据
- Standard 三包及 docs 的 lint、类型检查、测试与 build 已在 alpha.1 收尾验证通过

## 遗留边界

- 不支持通用 Stack / Flex / Grid、Align / Distribute 或 body 自动布局
- 不支持多 Title / Description、Header / Content / Footer slot、分角半径或多层装饰
- 不支持 Path、Coordinate、Scope、foreign composite 直接参与 body bounds
- selection、collapse、hit area、事件与 editor runtime 留给宿主或后续独立能力
