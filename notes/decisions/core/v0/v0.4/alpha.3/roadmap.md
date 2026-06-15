# v0.4.0-alpha.3 路线：路径补强（B）+ 任意轮廓 contour shape

> 写于 2026-06-15。承接 [v0.4 roadmap 候选 B「路径补强」](../roadmap.md#b--路径补强2026-06-12-拍板)（2026-06-12 拍板「首切 = B1 圆角 + B2 平滑曲线一块做」）；2026-06-15 并入一项 plot → core 跨包能力请求（contour shape，ADR-03）。
>
> 关联：[`v0.4 roadmap`](../roadmap.md) · [`alpha.1 math 底座`](../alpha.1/roadmap.md)（B 消费 A）· [`ADR-01 任意折线圆角`](./01-polyline-rounded-corners.md) · [`ADR-02 过点平滑曲线`](./02-smooth-curve-through-points.md) · [`ADR-03 任意轮廓 contour shape`](./03-core-contour-shape.md)

## 定位

alpha.3 是 v0.4「纵向底座深化」的 **core 几何 / 路径能力增量**，两条线：

1. **路径补强（B，ADR-01/02）**：把 `<Path>` 的 step 词汇补两块通用 Kernel 能力——任意折线的几何圆角、穿过点列的平滑曲线。
2. **任意轮廓 contour shape（ADR-03）**：补一个吃任意闭合顶点环的注册 shape，让曲线坐标系正交投影出的「曲边块」仍是**可连接 Node**（plot alpha.11 的 core 使能图元）。

三者都是 **纵向底座**（机制 / 引擎，非具体成品）、renderer-agnostic（只产既有 `PathCommand` / `PathPrim`），且共享 core `geometry/contour.ts` 轮廓引擎。横向装饰（花括号 / 波浪 / 弹簧 motif）按 roadmap B4 归 extension，不在本轮。

衡量标准：补强后的 path IR / 新 shape 经 `compileToScene` 仍只产既有 `PathCommand` / `PathPrim`，SVG 与 Canvas 两条 renderer 路径零改动即可消费；新写法与等价手写 Kernel IR 行为一致；contour Node 与 rectangle/sector 同等可连接。

## 子项

| # | 子项 | 代号 / 来源 | ADR | 状态 |
|---|---|---|---|---|
| B1 | 任意折线圆角 `roundedCorners` | B1 | [ADR-01](./01-polyline-rounded-corners.md) | **已实现 + 文档同步**（spec 17 例 + 实现全绿；待人工 review / wrapup 翻 Accepted） |
| B2 | 过点平滑曲线 `smooth` step | B2 | [ADR-02](./02-smooth-curve-through-points.md) | **已实现 + 文档同步**（math curve 5 例 + compile 15 例全绿；待人工 review / wrapup） |
| S | 任意轮廓 `contour` shape | plot → core 跨包请求 | [ADR-03](./03-core-contour-shape.md) | **已实现 + 文档同步**（shape 14 例全绿；plot 侧消费归 plot alpha.11；待人工 review / wrapup） |

> 进度（2026-06-16）：三 ADR 均按 develop-implement Spec-First TDD 落地——每项「🚧 spec 测试 → ✨ 实现」两段提交，core/math/react/vanilla 全套测试 + 全包 tsc + 全仓 lint 全绿，docs（zh/en + demo + i18n）已同步。剩余：可选 develop-test 对抗加固；develop-wrapup（封板翻 Accepted + ADR 压缩）留发布前。**未 push**。

三子项相对独立、可并行实现，但都触 / 复用 `geometry/contour.ts`：**B1 修改**它（加开放折线 seam 支持），**B2 不碰**它（曲线走 math `curve/`），**S 只读**它（闭合顶点环走现有闭合路径）。并行时 B1 的 contour.ts 改动须保证闭合 seam 语义不回退（S 与现有 polygon/rectangle 依赖之）。B2 的纯曲线算法（Catmull-Rom → cubic）落 `@retikz/math` 的 `curve/` 子模块（roadmap A 原列「后置」，2026-06-15 人工拍板提前；见 ADR-02）。

## 依赖与边界

- **B 消费 A**：B1 直接复用 core `contour.ts`（fillet 已在 core，alpha.1 未下沉，故就地复用）；B2 的曲线数学建议进 `@retikz/math`（opening `curve/`，roadmap A 已列「后置」）。
- **不在 alpha.3**（沿用 roadmap B 切分）：
  - **B3 path-path 含曲线交点**：依赖 A 的曲线求交，A 首切未做曲线，留后。
  - **B4 装饰 motif**：归 extension，「装饰引擎是否进 core」单独议。
  - **B5 连接器 / 沿路径放节点 markings**：看实际痛点再排（`<Path marks>` 已有 arrow mark 雏形）。

## 验收（alpha.3 整体）

- B1 / B2 / S 各自 ADR 的验收条款全过；core + 下游 `tsc --noEmit` + 全仓 `pnpm lint` 全绿。
- 新增 IR 字段 / step / shape 全部 optional / additive（contour 经开放 `ShapeRefSchema.type`，IR 零 schema 改动），现有 path / shape 测试逐字不变（向后兼容）。
- `apps/docs` 同步：`<Path>` 圆角 prop + `smooth` step + `contour` shape 双语文档与必要 demo（用户可见 IR / DSL 改动，按 `docs-doc-principle` skill）。
- Sugar 等价性：若 react 侧加便捷写法，须配「展开 == 手写 Kernel IR」等价测试。
