# ADR-08：Node label 附着对齐

- 状态：Accepted
- 决策日期：2026-08-28
- 关联：[v0.5 roadmap](../roadmap.md) · [Core 绘图完备设计](../../../architecture/core-drawing-complete.md) · [Node label 视觉盒间距](./05-node-label-box-spacing.md)

## 背景与目标

Core Node label 当前只把文字视觉盒的中心放在 attachment point。需要把标签附着到矩形边界端点时，文字会向两侧均匀溢出，无法表达“边界左端开始、沿边界向右展开”这一常见的图示语义。Graph Group 的默认外围标签正需要这种语义，但该行为属于通用 Node label 几何，不能由 Graph 复制一套偏移算法

本决策为 Node label 增加与 Core 文本对齐词汇一致的附着对齐字段，同时保持既有 label 的默认中心行为，并让边界、方向、角度和旋转后的视觉盒共享同一几何计算

## 决策：按 attachment tangent 对齐 Node label 视觉盒

`NodeLabel.align` 使用 `TextAlignSchema` 的 `start`、`middle`、`end`。对非 `center` 标签，Core 先按既有 position / placement / distance 计算沿外法向的视觉盒位置，再沿 attachment 的切线移动视觉盒：`middle` 不移动，`start` 让视觉盒的切线起边落在 attachment point，`end` 让切线终边落在 attachment point。投影半径使用标签自旋后的 OBB，因此 pin、visual bounds、自动 viewBox 与文字位置保持一致

切线方向采用屏幕坐标中的稳定正向：`top` / `bottom` 边界与垂直方向 anchor 的切线为从左到右；`left` / `right` 边界与水平方向 anchor 的切线为从上到下；数字角度和对角 anchor 使用该位置径向向量的顺时针法向。`center` 没有 attachment tangent，`align` 对其不改变中心位置

Group 只在 Group boundary label 省略 `align` 时注入 `start`；显式 `align`、`position`、`placement` 和其它 Core 字段保持作者优先级。Graph 不新增对齐 schema、枚举或几何实现

理由：

1. 对齐是 Node label 的通用附着几何，不是 Graph 专属视觉偏移
2. 复用 Core 文本对齐词汇，允许 JSON、React 与 Vanilla 共享同一 Source IR
3. OBB 投影与现有 label distance / pin / bounds 共用同一布局结果，避免 renderer 或上层重新测量

## 基础数据结构与公开契约

```ts
type IRNodeLabel = {
  text: string | { runs: Array<IRTextRun | IRMathRun> };
  align?: 'start' | 'middle' | 'end';
  position?:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
    | 'center'
    | number
    | { boundary: 'top' | 'right' | 'bottom' | 'left'; fraction?: number };
  placement?: 'outside' | 'inside';
  distance?: number;
  rotate?: 'none' | 'radial' | 'tangent' | number;
  keepUpright?: boolean;
  pin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number>; dashOffset?: number };
};
```

`align` 省略时由 Core resolve 为 `middle`。字段使用 Core 已有的 `TextAlignSchema` / `NodeTextAlignValue`；Graph、Standard 与 adapter 不复制该值类型

## 行为、失败语义与兼容性

- 默认行为：未提供 `align` 的既有 Node label 与现在相同，按 `middle` 计算；未提供 `position` / `placement` / `distance` 的默认链保持不变
- 对齐行为：`start` / `middle` / `end` 只改变沿 attachment tangent 的位置，不改变 position 选定的边界法向、inside / outside 方向或 distance 净距；旋转 label 使用旋转后视觉盒投影
- `center`：保持在 Node 中心，忽略 `align`、`placement` 与 `distance`
- 失败与诊断：`align` 非 `start`、`middle`、`end` 由 `NodeLabelSchema` 拒绝；其它 position、fraction、placement、pin 与 shape 约束继续沿用既有 Core schema / compile 诊断
- 兼容性 / breaking：新增可选字段，省略时保持现有 Scene 坐标与渲染行为；显式使用新字段会产生预期的新坐标，但不新增 Scene primitive 字段
- React / Vanilla 等价性：两者只透传同一 `IRNodeLabel.align`，Direct IR、React 与 Vanilla 对相同输入生成等价 Source IR 与 Scene
