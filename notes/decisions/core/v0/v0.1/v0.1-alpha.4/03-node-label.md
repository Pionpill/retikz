# ADR-03：Node `label` 边挂标签

- 状态：Accepted（已实现）
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../roadmap.md) · [tikz-gap-analysis §1 P2](../../../../../analysis/tikz-gap-analysis.md)

> **范围**：补 TikZ `[label=above:foo]`（节点边界外挂额外文字，支持多 label / 方向 / 距离 / 样式），用于节点编号、引脚标记、UML 多重性等。

## 背景 / 约束

- alpha.3 想"节点旁加标签"得拆成本节点 + fake 文本节点：标签与原节点失关联，原节点 rotate/scale 时标签不跟随；AI / codec 无法识别"这是 label"；标签锚点要手算。

## 决策：嵌入 `Node.label?: NodeLabel | Array<NodeLabel>`

label 是 node 的视觉附属，嵌入字段而非平级 child，在 IR 上明确从属关系。编译期 layoutNode 标准化（单对象 → 数组）+ 样式继承，emitNodePrimitives 末尾追加 TextPrim 到 inner 列表——故 node rotate≠0 时整组 wrap 进 group、label 随之旋转。与 alpha.3 边标注（嵌入 `Step.label`）命名 / 形态对称。代码：`core/src/ir/node.ts`（`NodeLabelSchema`）、`core/src/compile/node.ts`（`NodeLabelLayout` + emit）、`react/src/kernel/Node.tsx`。

设计细节（具体决策）：

- **position 表达**：8 方向枚举（同 ADR-01 `AT_DIRECTIONS`）∪ 数字角度（`z.union([nativeEnum, z.number()])`，对应 `label=30:foo`）。角度约定同 polar（0°=+x，90°=screen-down）；数字角度走 `angleBoundaryOf` 取边界点再沿单位向量外推 distance。缺省 position = `'above'`。
- **默认 distance = 4** user units——TikZ 默认 0pt（紧贴 border）视觉太挤，给一个小气孔，`label.distance` 可覆盖。容器不设 `labelDistance` 全局 prop（暂无诉求）。
- **样式继承**（layoutNode 阶段完成，emit 端只吃算好的 layout）：`font.*` / `textColor` 缺省继承 node 同名；`opacity` 不继承（label 独立透明度）；`distance` 不继承（node 无此语义），缺省 4。

理由：

1. **从属关系正确**——label 是视觉附属，IR 明确表达从属，避免"孤儿 label"。
2. **transform 自动跟随**——label TextPrim 进 inner 列表，与 node 同 group 旋转。
3. **样式继承自然**——layoutNode 已知 node.font / textColor，缺字段就近继承。
4. **与 alpha.3 边标注对齐**——`Step.label` / `Node.label` 命名形态对称。

### 被否决的选项

- **B：平级 IRChild kind `'node-label'`（靠 `nodeId` ref 绑定）**——从属关系靠字符串维持，AI 易写出孤儿 label；且丢失"label 随 node transform"的天然性。
- **C：`<Label>` sugar 子组件**——DSL 直观，但 IR 仍要决定怎么存（回到 A/B）；可作后续 sugar 增强，本版先做底层 prop 形态。

## 不在本 ADR 范围

- **label 参与 viewBox 扩展**：本版不做——labelLayout 阶段不调 measureText（避免与 node text measurement 耦合），故 label 文字宽度未知、不扩 bbox；极端 distance 需手动加 padding。下版可补精确 measurement + bbox 扩展。
- TikZ `pin`（label 的路径风格孪生）；label 复杂 anchor（`label.anchor=south west`，本版用居中）；multi-line label（text 限 string）；label of label（YAGNI）。

---

> **实现指针**：level `red`（动 node IR + compile）、additive，不影响 path label / 其它节点字段 / viewBox 算法。真源以代码为准——`NodeLabelSchema`（`core/src/ir/node.ts`）、`NodeLabelLayout` + emit（`core/src/compile/node.ts`）、`NodeProps.label`（`react/src/kernel/Node.tsx`）；测试在 `core/tests/`。完整原文（背景 / 选项 / 继承表 / 测试清单）见本文件 git 历史。

> 🔖 封板压缩 commit `70d471b5`；压缩前完整施工蓝图 = `git show 70d471b5^:notes/decisions/core/v0/v0.1/v0.1-alpha.4/03-node-label.md`。
