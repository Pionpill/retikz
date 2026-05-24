# ADR-04：pattern / image 填充（顺延占位，本段不实现）

- 状态：Deferred（顺延——形态预留，alpha.7 不实现）
- 决策日期：2026-05-24
- 关联：[v0.2-alpha.7 plan §第一部分 分阶段](../../../plans/v0/v0.2-alpha.7.md) · [ADR-01 Paint 基础](./01-paint-basics.md)（pattern / image 复用其 `PaintValue` / `SceneResource` / `<defs>` 基建）

> 本篇是**占位 ADR**：记录 pattern / image 填充的形态预留与待定项，明确**不在 alpha.7 实现**。待立项时升级为完整 ADR（含选项 / 测试象限）。

## 背景

填充服务（[ADR-01](./01-paint-basics.md)）首批只做 **gradient**。pattern（斜线 / 网点）与 image（node 塞 logo / 头像）在 SVG 同样靠 `fill="url(#id)"` 引用 `<defs>` 里的 `<pattern>`（image 即 `<pattern>` 套 `<image>`）——与 gradient **共用** ADR-01 的 `PaintValue` / `SceneResource` / `<defs>` 物化基建。

## 为什么顺延（评审 P2#1）

alpha.7 已叠 Paint 基础 + maxTextWidth + pin，是 red 级跨 core / schema / render / docs 的大段。pattern / image 各自带额外待定（image 的 href 来源 / 坐标系 / SSR 内联；pattern 的 tile 参数），再塞进 alpha.7 易失控。**故首批只做 gradient，pattern / image 顺延**——但 ADR-01 的 `PaintSpecSchema` 是 `discriminatedUnion('type', ...)`，加 `'pattern'` / `'image'` 分支即可扩展，**不破已定契约**。

## 形态预留（不实现，仅记方向）

```ts
// 未来追加到 PaintSpecSchema 的 discriminatedUnion（草案，立项时定）
// { type: 'pattern', ... }   —— 斜线 / 网点：tile 几何 + size + 间距 + 旋转
// { type: 'image', href, ... } —— 图片：href（URL / dataURI）+ 坐标系 + fit
```

`PaintValue` / `SceneResource`（ADR-01）无需改——pattern / image 同样是 `{ kind:'paint', spec }` 资源 + primitive `{ kind:'resourceRef', id }`，adapter 物化成 `<pattern>` 而非 `<linearGradient>`。

## 待定（立项时敲定）

- **image href 来源**：URL vs dataURI；跨域；SSR / 导出 PNG 时图片能否内联（外链在静态导出会丢）。
- **image 坐标系 / fit**：`objectBoundingBox`（铺满形状）vs `userSpaceOnUse`（固定尺寸平铺）；contain / cover / stretch。
- **pattern 参数**：tile size / 间距 / 旋转（画斜线、网点、交叉线）；前景 / 背景色；是否随形状缩放。
- **是否值得进 core vs 交扩展包**：image 填充偏装饰，可能更适合 `@retikz/shape` 或单独包；立项时按定位再判。

## 不在本 ADR 范围（= 本段不做任何实现）

- 不动 `PaintSpecSchema`（gradient 之外不加分支）。
- 不动 `PaintValue` / `SceneResource` / adapter 物化（gradient 已覆盖路径）。
- 不写 pattern / image 的 compile / render / 测试。

---

## 实现契约（必填）

### Level

`green`（本段**零实现**——仅占位文档；无代码改动、无测试）

> 立项实现时本 ADR 升级：补选项 / 决策 / 测试象限（Happy / 边界 / 错误 / 交互），Level 届时定（预计 `red`，动 ir/paint.ts + compile/paint.ts + render/defs.tsx）。

### 文件 scope

- 本段：仅本 ADR 文档。无 src / test 改动。

### 依赖的现有元素

- [ADR-01](./01-paint-basics.md) 的 `PaintSpecSchema`（discriminatedUnion，扩 `pattern` / `image` 分支）/ `PaintValue` / `SceneResource` / `render/defs.tsx` —— **未来引用**：pattern / image 复用此基建，立项时只加分支 + 物化。
