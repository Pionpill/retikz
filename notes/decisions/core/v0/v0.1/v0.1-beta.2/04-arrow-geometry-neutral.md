# ADR-04: arrow shrink 几何中性化

- 状态：Accepted
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-4](./roadmap.md) · [beta.1 ADR-01 renderer-neutral core](../v0.1-beta.1/01-core-comments-renderer-neutral.md)

## 背景

`packages/core/src/compile/path/shrink.ts` 当前用 SVG marker 的 `viewBox` / `refX` 描述箭头 shrink 公式，并要求和 `packages/react/src/render/arrowMarkers.tsx` 的 `renderInner` 几何保持一致。

这说明 core 的几何计算虽然没有直接依赖 SVG API，但概念上依赖了 React/SVG renderer 的 marker 坐标系。后续如果新增 Canvas / PDF renderer，core shrink 仍应只依赖“箭头尖端”和“路径端点接触位置”这类中性几何概念，而不是 `viewBox` / `refX`。

## 选项

### A. 抽出 renderer-neutral arrow shape geometry（推荐）

在 core 中定义箭头形状几何的单一来源，例如 `arrowShapeGeometry`。core shrink 和 React/SVG marker renderer 都消费这份定义。

### B. 只改注释，不抽 helper

成本低，但无法防止 core shrink 和 React/SVG renderer 的几何继续漂移。

### C. 把 shrink 交给 renderer

会让 Scene primitive 的路径端点不再稳定，Canvas / SVG / PDF renderer 可能输出不同视觉结果，不符合 core compile 产稳定 Scene 的设计。

## 决策：A

理由：

1. shrink 是跨 renderer 的几何语义，应由 core 统一计算。
2. 抽出几何常量可以让 React/SVG marker 和 core shrink 共享同一份形状参数，降低漂移风险。
3. beta 阶段允许内部重构，且不需要新增用户功能。

## 决策细节

- 新增 renderer-neutral helper 或常量，例如 `arrowShapeGeometry`。
- 几何字段使用中性命名，例如：
  - `tipX`：箭头尖端在标准局部坐标中的 x 位置。
  - `lineContactX`：路径线段应接触箭头尾部 / 凹口的位置。
  - `defaultLength` / `defaultWidth`：默认尺寸。
  - `hollowLineWidth`：空心箭头默认描边宽度。
- core `computeShrink` 通过 `(tipX - lineContactX) * effectiveLength / baseSize` 计算，不再在注释中使用 SVG `refX` 解释。
- React/SVG renderer 将同一份几何定义映射到 SVG marker 的 `viewBox` / `refX` / path data。
- 如果 React/SVG renderer 暂时还需要保留 SVG-specific 常量名，只允许出现在 `packages/react/src/render/**`。

## 影响

- **公开 API**：无。
- **运行时行为**：目标是不变；现有箭头 shrink 数值必须保持。
- **renderer 边界**：core 不再引用 React renderer 内部函数名或 SVG marker 坐标术语。

## 实现契约

### Level

`internal`。只改内部几何组织和注释。

### 文件 scope

- `packages/core/src/ir/path/arrow.ts` 或新增 `packages/core/src/compile/path/arrow-geometry.ts`
- `packages/core/src/compile/path/shrink.ts`
- `packages/react/src/render/arrowMarkers.tsx`
- `packages/core/tests/compile/path-arrow-detail.test.ts`
- `packages/core/tests/compile/path-arrow-detail-adversarial.test.ts`
- 视实现需要新增 renderer 几何一致性测试

### 测试象限

1. `normal` 默认 shrink 仍为 `length * scale`。
2. `diamond` 默认 shrink 仍与现有行为一致。
3. `circle` 默认 shrink 仍与现有行为一致。
4. `stealth` 默认 shrink 仍为 `0.7 * length * scale`。
5. `open` 默认 shrink 保持现有数值。
6. `openDiamond` 默认 shrink 保持现有数值。
7. `openCircle` 默认 shrink 保持现有数值。
8. 自定义 `lineWidth` 仍影响空心箭头 shrink。
9. React/SVG renderer 的 marker 几何与 core shrink 共享同一份中性定义或通过测试证明一致。

## 多 LLM 评估关注点

- 是否真的移除了 core 对 `viewBox` / `refX` / React renderer 内部实现的概念依赖。
- 是否引入了新的公共 export 或 schema 字段；若有，应 halt 并重新评估范围。
- 箭头视觉是否保持等价，尤其是 hollow shape 低透明度下是否仍不透出路径线段。
