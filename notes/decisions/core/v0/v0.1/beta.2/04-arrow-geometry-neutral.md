# ADR-04: arrow shrink 几何中性化

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-4](./roadmap.md) · [beta.1 ADR-01 renderer-neutral core](../beta.1/01-core-comments-renderer-neutral.md)

> **范围**：把 core 箭头 shrink 几何从依赖 SVG marker 的 `viewBox` / `refX` 术语，改为 renderer-neutral 的形状几何单一来源，core shrink 与 React/SVG marker renderer 共消费同一份定义。

## 背景 / 约束

- core shrink 公式原用 SVG marker 的 `viewBox` / `refX` 描述，并要求与 React/SVG renderer 的 marker 几何保持一致——core 几何虽不直接调 SVG API，概念上却依赖了 React/SVG renderer 的 marker 坐标系。
- 后续若新增 Canvas / PDF renderer，core shrink 应只依赖「箭头尖端」「路径端点接触位置」这类中性几何概念，而非 `viewBox` / `refX`。
- shrink 必须由 core 统一计算才能让各 renderer 输出稳定一致的路径端点；交给 renderer 会让 Scene primitive 端点不稳定。

## 决策：抽出 renderer-neutral 箭头形状几何单一来源

core 定义箭头形状几何的单一来源（中性字段命名），core shrink 与 React/SVG marker renderer 都消费它。代码：`core/src/arrows/`（几何注册表 `index.ts` + 契约类型 `types.ts`）、`core/src/compile/path/shrink.ts`。

中性几何字段（字面命名即决策，避免 SVG 术语泄漏）：

- `tipX`：箭头尖端在标准局部坐标中的 x 位置。
- `lineContactX`：路径线段应接触箭头尾部 / 凹口的位置（存静态 base，不含 lineWidth 调整）。
- `defaultLength` / `defaultWidth`：默认尺寸；`hollow` 标志：空心箭头丢 fill、描边主导、启用 lineWidth，并对 `lineContactX` 减 `lineWidth/2`。

core `computeShrink` 由 `(tipX - lineContactX) * effectiveLength / baseSize` 计算，注释不再用 SVG `refX`；React/SVG renderer 把同一份几何映射到 SVG marker 的 `viewBox` / `refX` / path data，SVG-specific 常量名只允许出现在 `react/src/render/**`。

理由：

1. shrink 是跨 renderer 的几何语义，应由 core 统一计算。
2. 抽出几何常量让 React/SVG marker 与 core shrink 共享同一份形状参数，降低漂移风险。
3. beta 允许内部重构，且不新增用户功能。

### 被否决的选项

- **B：只改注释、不抽 helper** —— 成本低，但无法防止 core shrink 与 React/SVG renderer 几何继续漂移。
- **C：把 shrink 交给 renderer** —— Scene primitive 路径端点不再稳定，Canvas / SVG / PDF 可能输出不同视觉结果，违背 core compile 产稳定 Scene 的设计。

## 不在本 ADR 范围

- 新增公共 export 或 schema 字段（本 ADR 为内部几何组织，若需新增字段应 halt 重评范围）。
- 改变现有箭头 shrink 数值（目标是运行时等价）。

---

> **实现指针**：level `green`（内部几何组织 + 注释，无公开 API / schema 变更，箭头 shrink 数值保持等价）。真源以代码为准——箭头几何注册表与契约类型 `core/src/arrows/{index,types}.ts`、`computeShrink`（`core/src/compile/path/shrink.ts`）、React/SVG 映射 `react/src/render/arrowMarkers.tsx`。测试在 `core/tests/compile/`（`path-arrow-detail.test.ts` / `path-arrow-detail-adversarial.test.ts`）与 `react/tests/render/`（`renderPrim-arrow-detail.test.tsx`）。完整原文（实现契约 / 测试象限 9 case）见本文件 git 历史。

> 🔖 封板压缩 commit `f3282d91`；压缩前完整施工蓝图 = `git show f3282d91^:notes/decisions/core/v0/v0.1/beta.2/04-arrow-geometry-neutral.md`。
