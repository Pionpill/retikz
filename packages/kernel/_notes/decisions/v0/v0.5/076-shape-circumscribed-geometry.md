---
description: Shape 以单一回调返回内容包围半轴与中心偏移，保持尺寸、定位和布局候选一致
keywords: Shape、computeCircumscribedGeometry、内容包围、中心偏移
---

# ADR-076：统一 Shape 内容包围几何

- 状态：Accepted
- 决策日期：2026-10-26
- 关联：[roadmap](./roadmap.md)、[001](./001-node-anchor-position.md)

## 背景与目标

形状根据内容与 padding 确定外接盒尺寸，非对称形状还需要表达盒中心相对节点位置的偏移。分离的回调割裂同一包围几何的尺寸与位置，使作者重复处理参数，也无法让布局候选完整携带自身几何结果。

## 决策

Shape 使用必填的 `computeCircumscribedGeometry` 同时返回半轴和可选中心偏移。Core 拥有该契约并统一消费内置、自定义与 Extension 形状；内容测量、宽度约束、margin 和旋转仍由 Core 布局处理。

## 公开契约

```ts
type ShapeCircumscribedGeometry = {
  halfWidth: number;
  halfHeight: number;
  offset?: Position;
};

computeCircumscribedGeometry: (innerHalfWidth: number, innerHalfHeight: number, params: TParams) =>
  ShapeCircumscribedGeometry;
```

输入半轴包含内容与 padding，返回半轴描述完整形状未旋转外接盒。`offset` 表示该盒中心相对节点位置的未旋转局部偏移，省略等价于 `[0, 0]`。尺寸和偏移属于同一布局候选，最终定位使用被选中候选的完整结果。

## 行为、失败语义与兼容性

- 保持现有形状尺寸、中心偏移、最小尺寸、固定宽度、折行、锚点定位及旋转行为。
- 半轴须为有限非负数，偏移须为有限坐标；保持现有 provider 输出失败诊断和布局试算恢复边界。
- 删除 `computeCircumscribedHalfAxes` 和 `computeCircumscribedOffset`，不保留旧名或双轨入口。自定义形状迁移至统一回调。
- React、Vanilla 继续通过相同 Core 定义工作，不增加 adapter 专属能力，不改变 Source IR。
