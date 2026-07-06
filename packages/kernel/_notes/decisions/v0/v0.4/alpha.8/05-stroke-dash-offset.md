# ADR-05: Stroke dash offset

- 状态：Accepted
- 决策日期：2026-07-04
- 关联：[v0.4-alpha.8 roadmap](./roadmap.md) · [v0.4 roadmap](../roadmap.md) · [path dash pattern naming](../../v0.1/beta.2/05-path-dash-pattern-naming.md)

## 背景

core 已经把虚线建模为 `dashPattern?: Array<number>`，并贯通 Path IR、Scene primitive、SVG / Canvas renderer、React / Vanilla adapter 与文档。这个字段不只是 Path 专用：Node 边框、shape outline、marker 内部 primitive、label pin leader 等也会复用同一套描边语义。

plot 的 axis domain line、grid line、reference line 等图表 guide 在使用虚线时，除了 dash / gap 长度，还需要控制虚线节奏从哪里开始。常见图表库把 dash offset 作为线条样式的一部分，用来让多条线的虚线 phase 对齐，或避免端点处出现不完整短 dash。

当前 Canvas animation 内部会为 pathDraw 使用 `ctx.lineDashOffset`，SVG animation 也会生成 `stroke-dashoffset`，但这只是 renderer 的动画实现细节，不是 IR / Scene 的稳定契约。上层包不能依赖它表达静态线条样式，否则 plot 会被迫发明 plot-only 的 dash phase 字段。

## 决策：给 core 通用描边能力补齐 `dashOffset`

core 在已有 `dashPattern` 覆盖面上新增 `dashOffset?: number`。字段语义是描边虚线相位，单位与当前 path user units 一致；字段是 JSON-safe finite number，允许正数、0 和负数。没有 `dashPattern` 时字段仍可保留在 IR / Scene 中，但没有可见效果。

```ts
type StrokeDashStyle = {
  dashPattern?: Array<number>;
  dashOffset?: number;
};
```

renderer 映射规则：

- SVG：`dashOffset` 映射为 `stroke-dashoffset`。
- Canvas：stroke 前设置 `ctx.lineDashOffset = dashOffset ?? 0`，并在每个 primitive / marker-local stroke 的 save / restore 作用域内隔离状态。
- pathDraw 动画仍可临时覆盖 dash pattern / dash offset；动画有效帧使用动画揭示语义，非动画或动画 settled base render 使用静态 `dashOffset`。

理由：

1. `dashOffset` 与 `dashPattern` 是同一类描边能力，字段命名保持并列，避免 `strokeDashoffset` 这类 renderer 细节泄漏到 core IR。
2. 允许有限负数可以对齐 SVG / Canvas 原生 dash phase 行为；schema 只拦截 NaN / Infinity，保证 JSON round-trip 不失真。
3. 覆盖范围跟 `dashPattern` 对齐，plot axis / grid / legend 等后续只需要消费 core 通用 line style，不需要 plot-only 平行语义。

## 不在本 ADR 范围

- 不在 plot guide line / axis line / theme line style 中新增字段；plot 在 core 实现落地后单独消费。
- 不新增 `dashedOffset`、`strokeDashoffset`、CSS 字符串 dash shorthand 或 dotted shorthand。
- 不改变 `dashPattern` 的数组语义，也不改变 `dashed` / `dotted` 的优先级。
- 不把 pathDraw 动画的内部 offset 变成独立动画属性；本 ADR 只处理静态描边样式字段。

---

> **实现指针**：本 ADR 已随 kernel v0.4-alpha.8 发布落地；当前真源以代码、文档站和 changelog 为准。完整实现期契约、文件 scope、测试象限和 DSL 示例保留在发布 tag 历史中。

> 🔖 发布后压缩；压缩前完整施工蓝图 = `git show v0.4.0-alpha.8:packages/kernel/_notes/decisions/v0/v0.4/alpha.8/05-stroke-dash-offset.md`。
