# ADR-04: arrow shrink 几何中性化

- 状态：Accepted（已实现）
- 决策日期：2026-05-14
- 关联： · [beta.1 ADR-01 renderer-neutral core](../beta.1/01-core-comments-renderer-neutral.md)

> **目标**：把 core 箭头 shrink 几何从依赖 SVG marker 的 `viewBox` / `refX` 术语，改为 renderer-neutral 的形状几何单一来源，core shrink 与 React/SVG marker renderer 共消费同一份定义。

## 背景 / 约束

- core shrink 公式原用 SVG marker 的 `viewBox` / `refX` 描述，并要求与 React/SVG renderer 的 marker 几何保持一致——core 几何虽不直接调 SVG API，概念上却依赖了 React/SVG renderer 的 marker 坐标系。
- 后续若新增 Canvas / PDF renderer，core shrink 应只依赖「箭头尖端」「路径端点接触位置」这类中性几何概念，而非 `viewBox` / `refX`。
- shrink 必须由 core 统一计算才能让各 renderer 输出稳定一致的路径端点；交给 renderer 会让 Scene primitive 端点不稳定。

## 决策：抽出 renderer-neutral 箭头形状几何单一来源

core 定义箭头形状几何的单一来源（中性字段命名），core shrink 与 React/SVG marker renderer 都消费它。

中性几何字段（字面命名即决策，避免 SVG 术语泄漏）：

- `tipX`：箭头尖端在标准局部坐标中的 x 位置。
- `lineContactX`：路径线段应接触箭头尾部 / 凹口的位置（存静态 base，不含 lineWidth 调整）。
- `defaultLength` / `defaultWidth`：默认尺寸；`hollow` 标志：空心箭头丢 fill、描边主导、启用 lineWidth，并对 `lineContactX` 减 `lineWidth/2`。

core 的 shrink 以 `(tipX - lineContactX) * effectiveLength / baseSize` 为几何基准，并保留半个主路径描边宽度的 marker 内覆盖，避免相切边界分别抗锯齿后出现缝隙；React/SVG renderer 把同一份几何映射到 SVG marker 的 `viewBox` / `refX` / path data

理由：

1. shrink 是跨 renderer 的几何语义，应由 core 统一计算。
2. 抽出几何常量让 React/SVG marker 与 core shrink 共享同一份形状参数，降低漂移风险。
3. beta 允许内部重构，且不新增用户功能。

## 长期边界

- 本能力保持内部几何组织，不新增公共 export 或 schema 字段；若需新增字段应 halt 重评范围
- Definition 字段、marker 尺寸以及 `tipX` / `lineContactX` 的接触语义保持不变；core shrink 在几何基准上扣除半个主路径描边宽度，使路径进入 marker 内部并由 marker 覆盖接头

---

## 最终实现结果

已实现本 ADR 的核心决策。Definition 与 marker 几何契约保持不变；core shrink 在既有接触几何上增加半个主路径描边宽度的覆盖，以消除 renderer 抗锯齿产生的可见接缝
