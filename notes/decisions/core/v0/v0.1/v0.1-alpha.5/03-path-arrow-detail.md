# ADR-03：Path 箭头重设计（删 `arrowShape`，加 `arrowDetail` 对象 + 起末分别配置）

- 状态：Accepted（已实现）
- 决策日期：2026-05-12
- 关联：[v0 roadmap §v0.1.0-alpha.5](../../roadmap.md) · [core-design.md §4.5](../../../../../architecture/core-design.md)

> **范围**：把箭头从"形状一个扁平字段 + 视觉全锁死等于 path"升级为可独立控制颜色 / 尺寸 / 透明度、且起末两端可异形异色的 `arrowDetail` 对象。

## 背景 / 约束

- 原箭头只有 `arrow`（方向）+ `arrowShape`（7 形状）两个扁平字段，视觉全锁死 path：颜色硬编码 `context-stroke`、尺寸硬编码 6、透明度跟随 path、起末共用一个 shape。
- 用户刚需"线浅箭头深"、"半透明箭头"、"密集图放大箭头"、"UML 起末异形"全做不到。对照 TikZ `arrows.meta`：纳入 scale/length/width/color/fill/opacity/lineWidth + 起末分配置；不纳入 harpoon/reversed/inset/slant/bend/sep。

## 决策：`arrowDetail` 单字段对象 + start/end 子对象逐字段 merge

**删** `arrowShape`（搬进 `arrowDetail.shape`），**保留** `arrow`（含义不变：控制哪端出箭头），**加** `arrowDetail?`：顶层默认（`shape`/`scale`/`length`/`width`/`color`/`fill`/`opacity`/`lineWidth`，起末共享）+ `start`/`end` 子对象（与顶层逐字段 merge：缺省继承、已填 override；子对象字段集 = 顶层减 start/end，不递归）。代码：`core/src/ir/path/arrow.ts`（`ArrowDetailSchema`/`ArrowEndDetailSchema`）、`core/src/ir/path/path.ts`、`core/src/compile/path.ts`（resolve 起末实际视觉规格）、`react/src/render/arrowMarkers.tsx`。

理由：

1. **支持起末异形/异色**（UML/关系图刚需）。
2. **常见场景写起来短**——起末同形只写顶层、不用写两遍。
3. **start/end 与顶层 merge 语义清晰**——缺省继承，符合直觉（同 `NodeLabel.font` 继承块级 font）。
4. **schema 结构稳定**——未来加 harpoon/reversed 只在 `arrowDetail` 内加，path 层级不动。

设计细节（具体决策）：

- 字段名 `arrowDetail`（直白、不撞 TikZ "style" 复杂语义，优于 `arrowStyle`/`arrowOptions`）；start/end **逐字段 merge** 非"完全替换"。
- `scale` 乘到 `length`/`width` **之后**（`length=10, scale=1.5` → 渲染 15，纯乘子，同 SVG transform scale 直觉）。
- **空心 shape（open/openDiamond/openCircle）上 `fill` 完全无效**（silent no-op，schema 不拒绝、compile/render 直接忽略）；实心 shape `fill` 主导、`color` 作 stroke 备用。文档须白纸黑字写这条 silent ignore 规则，避免用户困惑。

### 被否决的选项

- **B：扁平字段（`arrowColor`/`arrowScale`… path-level，起末共用）**——无法表达起末异形/异色（UML 刚需）；字段散落 path 层、未来越发膨胀。
- **C：顶层 `arrowStart`/`arrowEnd` 两字段对（无共享默认）**——常见"起末同形"要写两遍重复字段，没有"默认 + override"分层。

## 不在本 ADR 范围

- harpoon / reversed / inset（用 length/width 已可绕）：留 v0.2+；slant / bend / sep（多 tip 间距）：长期不做（niche）。

---

> **实现指针**：level `red`、⚠️ BREAKING（`arrowShape` IR 写法不再合法，alpha 期直接断）。真源以代码为准——`ArrowDetailSchema`/`IRArrowDetail`（`core/src/ir/path/arrow.ts`，复用 `ARROW_SHAPES`）、`PathSchema.arrowDetail`（`core/src/ir/path/path.ts`）、resolve（`core/src/compile/path.ts`）、`react/src/render/arrowMarkers.tsx`（接收 color/fill/opacity/scale/length/width/lineWidth）、`renderPrim.tsx`（marker id 纳入 detail hash 避免 defs 复用错配）。测试在 `core/tests/` 与 `react/tests/render/`。完整原文（字段全表 / DSL 示例 / 测试象限）见本文件 git 历史。
