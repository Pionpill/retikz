# ADR-05：Node label 视觉盒间距

- 状态：Accepted
- 决策日期：2026-07-23
- 接受日期：2026-07-26
- 关联：[alpha.1 roadmap](./roadmap.md) · [v0.5 roadmap](../roadmap.md) · [Drawing Complete](../../../../architecture/core-drawing-complete.md)

## 背景

当前 `NodeLabel.distance` 是节点边界到 label 中心的距离。长文本在左右位置会穿入节点，上下位置的可见净距随字体高度变化；pin、Scene measured height、bbox 和 auto viewBox 又分别用 `fontSize / 2` 等近似，无法保证同一视觉几何。

本 ADR 不增加新字段，而是让一次测量得到的 label 视觉盒成为 center、pin、emit、bbox 与 viewBox 的单一真源。

## 决策

### distance 语义

`distance` 表示节点边界与旋转后 label 视觉盒沿放置方向的净间距：

- 缺省链不变：`label.distance ?? CompileOptions.labelDistance ?? 12`。
- `position` 缺省 `top`，`placement` 缺省 `outside`，`rotate` 缺省 `none`，`keepUpright` 缺省 `false`。
- `center` 忽略 distance，始终位于 Node center。
- outside center offset = `distance + projectedHalfExtent`。
- inside center offset = `-(distance + projectedHalfExtent)`；超大 label 可越过 Node center，不 clamp、不做碰撞求解。

先从 attachment 直接得到无环的 placement unit vector：

- 八方向使用 `AnchorUnitVectorByAnchor`。
- 数字角使用 `[cos(angle), sin(angle)]`。
- `{ boundary, fraction }` 使用对应 side 的外法向，与 fraction 无关。
- center 为 `[1,0]`，只用于 radial / tangent 的确定性角度；center 本身仍不计算 spacing。

radial angle 等于该向量角，tangent 等于 radial + 90°；explicit angle 直接使用。随后在 Node 未旋转的局部 y-down 坐标系应用 keepUpright。该过程不读取尚未求出的 label center，因此没有循环。用最终 label 自旋角 `θ` 和同一 placement vector `(ux, uy)` 计算 OBB 投影半径：

```text
extent =
  |ux cosθ + uy sinθ| × width / 2
  + |ux (-sinθ) + uy cosθ| × height / 2
```

Node 自身 rotate 只在最终 layout 投影阶段应用一次，不重复进入 label 自旋公式。

### 测量与统一几何

新增内部 `normalizeTextMetrics`。本 ADR 只在 Node label 路径包装注入的 `measureText`：plain label 与 Node label mixed line 中的每个 text run 都只调用底层 measurer 一次，再共用以下规范化。Node 正文、edge / step / ribbon label 继续沿用既有度量语义，不消费该包装器：

1. width / height 必须 finite 且 nonnegative，否则 fail-loud。
2. ascent / descent 若提供，也必须 finite 且 nonnegative。
3. 两者都有时，`visualHeight = max(height, ascent + descent)`；额外 leading 在上下各分一半。
4. 只提供 ascent 时，`visualHeight = max(height, ascent)`、descent = visualHeight - ascent；只提供 descent 时对称处理。
5. 两者都缺时 ascent = descent = height / 2。
6. 最终 normalized ascent + descent 恒等于 visualHeight；alphabetic baseline 为 `centerY + (ascent - descent) / 2`。

Node label 路径同样包装注入的 `lowerTex`：`LoweredTex` 的 width / height / depth 必须 finite 且 nonnegative，并满足 `depth <= height`；不合法结果按既有 `TEX_INVALID` warning 跳过该 math run，不进入 Node label 的 `LaidLine`。合法 Node label mixed / TeX line 由规范化后的 text run metrics 与 TeX metrics 汇总唯一 `laid.width/ascent/descent`。其它文本宿主的 `LoweredTex` 校验与布局行为不在本 ADR 改动范围。

label 布局固定为两个阶段：

1. `measureNodeLabels` 只解析内容、样式与默认值，产出内部 `MeasuredNodeLabel`；它不读取 Node rect，也不计算 center。
2. Node 内容盒、padding、shape circumscribe 与 `circumscribeOffset` 已确定最终 provisional rect 后，`layoutNodeLabels` 才根据该 rect、shape geometry 与 measured label 解析 attachment、`centerOffset` 和 `rotateDeg`，产出最终 `NodeLabelLayout`。

`NodeLabelLayout` 保存 Node 未旋转局部帧中的最终相对几何：

```ts
type NodeLabelLayout = {
  measuredWidth: number;
  measuredHeight: number;
  ascent: number;
  descent: number;
  rotateDeg: number;
  centerOffset: IRPosition;
  // existing style/content/pin fields
};
```

- `centerOffset` 相对最终 `NodeLayout.rect` 的几何中心，避免 anchor-position 平移后绝对 center 失效；不使用原始 `Node.position` 或 contentCenter。
- mixed runs / TeX 使用 `laid.width`、`laid.ascent + laid.descent`；fallback 同样通过现有 measurer。
- plain Node label TextPrim 使用 normalized alphabetic baseline，`measuredWidth/Height` 等于 resolved label box。
- mixed / TeX 仍 emit 既有 Group + 子 primitives；Group 不新增 measured fields，整体 label box 只存在于内部 resolved geometry，子 primitive 保留各自 metrics。
- center、pin 终点、Scene emit、label extent / bbox 和 auto viewBox 全部读取这份 resolved geometry。
- pin 从 Node border 指向最终旋转 OBB 朝向 border 的精确交点，不使用独立 pin padding；outside label 才允许 pin。
- 本 ADR 不先增加公开 observer label bbox。若后续 interaction manifest 需要 label region，应消费同一内部 resolved geometry；不能建立另一个估算 DTO。

Node rotate 在局部 label geometry 完成后应用一次；Scope transform 由 Group chain 再应用。这里的 bbox 只指 automatic Scene layout / viewBox bounds：必须把 label OBB 四角经过 Node rotate 和完整 Scope transform chain 投影，不能只依赖 `projectLayoutToGlobal` 的 AABB width / height。`scope.id` 的 synthetic rectangle / circle bbox 仍只收集 child `outerRect`，明确排除 label / pin，不改变 Scope target anchors。anchor-position 只移动 Node rect center，centerOffset 不变。

缩放语义分开冻结：

- Scope uniform / non-uniform scale 继续作为完整局部几何 transform，对 Node、label、pin 和 gap 一起应用一次；bbox 投影变换 label OBB 四角。
- `Node.scale` 保持既有非仿射文字语义：Node box 仍按 x / y 各轴缩放，label font 仍按 `min(sx, sy)` 缩放并重新测量，`label.distance` 保持未缩放的 user-units；attachment 使用缩放后的 Node rect，pin 再由最终 label geometry 派生。

### Schema

`NodeLabelSchema.distance` 是 nonnegative number，describe 为“node border 与 label visual box 的 gap”。v0.5 直接采用视觉盒间距语义，不增加额外模式字段。

`CompileOptions.labelDistance` 同样必须 finite 且 nonnegative；在 compile context 创建时 fail-loud。`0` 合法，NaN / Infinity / negative 均在任何布局前抛错。

React / Vanilla 无新 authoring 字段，继续传递同一 IR。

## DSL

```tsx
<Node
  position={[80, 60]}
  label={{
    text: 'Long label',
    position: 'right',
    distance: 8,
    rotate: 'tangent',
    keepUpright: true,
    pin: true,
  }}
>
  A
</Node>
```

这里 `8` 始终表示两个视觉盒沿右方向的 8 user-units 净距。

## 被否决的方案

- 保留中心距离并另加 `boxDistance`：会形成永久平行字段与默认值。
- 用 `fontSize` 近似高度：对自定义 measurer、多行、mixed runs 和 TeX 都不成立。
- renderer 在 DOM / Canvas 测量后修正：会让 Scene、pin、bbox 和后端结果漂移。
- inside label clamp 到 Node 内：属于碰撞 / fit 策略，会掩盖调用方给出的明确间距。
- 新建 geometry registry：测量已由 `measureText` / `lowerTex` 注入；OBB 投影是闭合纯计算。

## 公开影响

- IR 和 authoring 继续使用数值 `distance`；其语义是 node border 与 label visual box 的 gap。
- center placement 与默认值链不变。
- Scene TextPrim 的 measured height、pin 和 auto viewBox 与实际 layout 使用同一 resolved geometry。
- plain Node label TextPrim 更新 measured height / alphabetic baseline；Node label mixed / TeX Scene Group 形态不变。
- Node 正文、edge / step / ribbon label 的 metrics、baseline、定位与 bbox 行为保持不变。
- pin 终点精确落在 label 视觉盒边缘。

## 最终实现与验证摘要

- Core 在 Node rectangle 求解前完成 label metrics，并以旋转后视觉盒在放置方向上的投影半径解释 `distance`。
- plain、multiline、mixed 与 TeX label 的 center、baseline、pin、Scene bounds 与自动 viewBox 共用同一 resolved geometry，不再二次测量。
- React / Vanilla 产品入口保持同一 IR；renderer 不参与重新布局。
- Node overview、controls、schema entity、runtime compile reference 与 changelog 已完成 zh / en 同步。
- 正式验证覆盖 label metrics、定位、pin、Scene bounds、adapter 与 docs；ascent + descent 聚合溢出已修复并加入回归测试，最终无 BLOCKING。

## 遗留边界

- 不提供全局 label 碰撞避让、自动 fit 或领域标注布局。
- Node 正文、edge / step / ribbon label 的独立 metrics 与定位语义保持不变。
- 不单独公开 label observer / manifest；未来需要时应复用 compile artifacts。
