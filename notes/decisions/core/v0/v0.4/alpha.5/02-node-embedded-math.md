# ADR-02：带框公式

- 状态：Accepted（2026-06-17 完工；最终随 ADR-03 收敛）
- 决策日期：2026-06-16
- 关联：[v0.4-alpha.5 roadmap](./roadmap.md) · [ADR-01 tex 包](./01-tex-package-and-node-math.md) · [ADR-03 行内混排](./03-inline-math-runs.md) · `packages/core/core/src/compile/node.ts`

## 背景

用户经常需要 TikZ 风格的带框公式，例如矩形、圆形或其他 shape 内放一段数学表达式。retikz 已有「node 内容 -> 测量 -> shape circumscribe -> emit 容器和内容」链路，纯文本节点已经靠这条链路实现自动尺寸和常规边框。

公式能力最初设计为独立 node 内容字段；但 alpha.5 最终把公式统一收敛为文本 run。带框公式不需要额外 schema：一个带 `shape` 的节点，其文本内容是单个 `$$...$$` display 公式，编译时由文本布局得到 glyph bbox，再交给既有 shape 包裹逻辑。

## 决策

带框公式复用 Node 的常规容器模型：

- 公式写在 node `text` 中，使用 `$$...$$` 或显式 `{ runs }`。
- 节点有 `shape` 时，shape 按公式 glyph bbox 和 padding 自动 circumscribe。
- 容器的 `fill`、`stroke`、`cornerRadius`、shadow、blend、zIndex 等都走普通 Node 视觉语义。
- 公式 glyph 仍 emit 为 `PathPrim`，容器仍 emit 为现有 shape primitive；renderer 不新增公式专用 primitive。

未注入 `lowerTex` 或 tex 无效时，公式段按 ADR-01/03 的 warn 语义降级；容器仍按已有节点规则处理，不把错误扩散成 renderer 崩溃。

## 理由

1. 带框公式本质上是「文本内容 + shape 容器」，不应引入 `shape:'math'` 或 `<TexNode>` 双轨模型。
2. 复用 Node shape 系统后，rectangle / circle / ellipse / star / contour shape 都自然支持公式内容。
3. renderer 只看到普通 shape primitive + glyph path，三端输出一致。
4. 用户心智与 TikZ `\node[draw] {$E=mc^2$}` 接近：框是节点样式，公式是节点文本。

## 影响

- core 的内容测量路径由普通文本扩展到 text runs 中的 tex glyph bbox。
- Node shape 包裹逻辑无需新增公式字段，只消费文本布局产出的内容 bbox。
- React / Vanilla 不提供独立 TexNode；用户通过 `<Node shape="rectangle">{"$$E=mc^2$$"}</Node>` 或等价 text/runs 写法表达。
- 文档在 `@retikz/tex` 包页和 Node 示例中展示带框公式。

## 不在本 ADR 范围

- 多个内容块在一个节点内上下堆叠。
- 自动换行、公式 reflow 或公式内部断行。
- 非矩形容器内的高级排版约束，例如贴合星形内切区域。

## 实现指针

实现以当前代码和测试为准，重点见：

- `packages/core/core/src/compile/node.ts`
- `packages/core/core/src/compile/text-layout.ts`
- `packages/core/core/tests/compile/inline-tex.test.ts`
- `packages/core/react/src/kernel/Node.tsx`
- `apps/docs/src/contents/core/packages/tex/tex-framed.demo.tsx`

> 压缩前完整施工蓝图：`git show 63220f823d012744b29551f0a4bf38ff269b0c7e:notes/decisions/core/v0/v0.4/alpha.5/02-node-embedded-math.md`
