# ADR-02：Path 端点箭头重叠

- 状态：Accepted
- 决策日期：2026-09-03
- 关联：[alpha.4 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Core 绘图完备设计](../../../../architecture/core-drawing-complete.md)

## 背景与目标

Path 默认把端点箭头放在逻辑端点外侧，并把主描边缩短到箭头的线接触位置。流程图连接点等场景还需要箭头按比例跨过端点，但线接触点不等于视觉后缘；stealth 等带倒钩的箭头若只对齐接触点，比例为 `1` 时仍会露出尾翼

目标是在不移动逻辑端点、不改变 NodeTarget 裁剪和 Path 参数域的前提下，让起点或终点箭头从默认位置连续推进到视觉后缘完整进入。该语义随最终尺寸稳定，内置与自定义箭头共用 Core 几何，并让所有 renderer、bounds 与命中观察同一 Scene 结果

## 决策：以箭头视觉后缘定义完整重叠，线接触点继续独立负责主描边接合

`PathMarkPlacement.endpointOverlap` 只适用于被选为整条 Path 起点或终点箭头的 mark，取值为 `[0, 1]`，默认 `0`

设 Path 的逻辑端点为 `E`，箭头当前默认放置为 `P0`，箭头解析后的视觉后缘与 `E` 对齐时的放置为 `P1`。Core 按 `endpointOverlap` 在 `P0` 与 `P1` 之间做线性插值：

- `endpointOverlap: 0`：使用 `P0`，逐字保持现有默认放置、接缝覆盖和自动边界外轮廓保护
- `endpointOverlap: 0.5`：箭头位于默认位置与视觉后缘完全进入位置的中点
- `endpointOverlap: 1`：使用 `P1`，箭头解析后的视觉后缘与 `E` 对齐，整枚箭头位于逻辑端点内侧或恰好落在端点上

`ArrowDefinition.backX` 是 marker 基础坐标中沿箭头轴向的包络后缘；`lineContactX` 描述主描边接合点，`tipX` 描述尖端。Core 用最终 `length × scale` 和空心外轮廓补偿解析视觉后缘，不从 marker primitive bounds 或 shape 名称推断。重叠只移动端点箭头及其主描边接合位置，不改写 definition、marker 或逻辑 Path

内置、Standard 与自定义箭头继续共用 definition、registry、resolve 和 Stroke compile 链路；自定义 Path kind 与 renderer 不增加重叠协议

## 基础数据结构与公开契约

```ts
type IRPathMarkPlacement = {
  pos: number;
  endpointOverlap?: number;
  mark: IRArrowMark;
};
```

```ts
type ArrowDefinition = {
  name: string;
  backX: number;
  lineContactX: number;
  tipX?: number;
  // existing fields
};
```

```ts
type InputPathArrowEndpointPlacement = {
  overlap?: number;
};

type InputPathArrowPlacement = {
  overlap?: number;
  start?: InputPathArrowEndpointPlacement;
  end?: InputPathArrowEndpointPlacement;
};

type InputPath = {
  // existing fields
  arrowPlacement?: InputPathArrowPlacement;
};
```

`endpointOverlap` 只在 placement 成为最终端点箭头时合法。React `<Path>` / `<Draw>` 与 Vanilla 共享 `arrowPlacement`：顶层 `overlap` 作用于实际存在的端点，`start.overlap` / `end.overlap` 逐端覆盖；直接声明 `marks` 时使用 `endpointOverlap`

## 行为、失败语义与兼容性

- 省略或显式使用 `0` 时，箭头位置、主描边收缩、接缝覆盖和自动边界保护逐字兼容；显式 `0` 不求值完整进入分支
- `1` 让最终视觉后缘与逻辑端点对齐；中间值单调线性插值。起末方向对称，`length`、`scale`、空心 `lineWidth` 与 `outerInset` 参与最终几何
- NodeTarget、anchor、boundary、offset、逻辑端点、Path 参数域、label / 中段 mark 采样、identity 与 meta 不变；Scene、绘制顺序、zIndex、clip 和 renderer contract 不新增语义
- `backX`、`lineContactX` 与解析后的 `tipX` 必须有限且满足 `backX <= lineContactX <= tipX`；marker 不得在 `backX` 后继续输出可见几何，缺少 `backX` 不提供 fallback
- 非 Stroke host、inline mark、未被选中的重复端点 placement，以及没有对应 `arrow` 端点的 `arrowPlacement` 均 fail-loud
- overlap 只接受有限闭区间 `[0, 1]`。非零重叠若在最终尺寸或位移计算中溢出，由 Core compile fail-loud
- 兼容性 / breaking：默认与显式 `0` 保持兼容；既有非零 overlap 改为视觉后缘语义。所有自定义 `ArrowDefinition` 必须显式补齐 `backX`，不保留旧模式

## 实施结果与遗留风险

Core 已在统一 definition resolve 与 Stroke compile 链中实现该决策；内置、Standard、自定义箭头及 React / Vanilla authoring 共用同一契约，Scene 与 renderer 保持不变

真实遗留风险是 `ArrowDefinition.backX` 的必填变更跨越 Core 与 Standard 两个独立 release group。发布时必须协调兼容版本，并要求第三方 definition 明确补齐真实后缘；不提供 fallback 或旧语义模式
