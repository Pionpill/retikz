# ADR-01：结构化 Target / Anchor（path target 对象唯一 + AnchorRef + parseNodeTarget 单一真源）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.6 plan §第一部分](./roadmap.md) · [alpha.3 ADR-01 Shape Registry](../v0.2-alpha.3/01-shape-registry.md)（anchor 接口先固化）· [alpha.1 ADR-02 nodeIndex/anchor 解析](../v0.2-alpha.1/02-node-index-anchor-resolution.md) · 本 milestone [ADR-02](./02-side-t-edge-point.md) / [ADR-03](./03-tikz-to-layout-rename.md)

> **范围**：把 path target 的节点引用从字符串小 DSL（`'A.north'` / `'A.30'`）升级为 schema 可校验的对象契约，字符串 shorthand 收敛为 React DSL 层 eager 解析的单一入口。

## 背景 / 约束

- 原 `TargetSchema` 节点引用走 `z.string()`：anchor 语义藏字符串里（schema 只见 `string`，无法约束 anchor 枚举 / 角度 / 边上比例点 / offset），LLM 只能盲拼、错了报"字符串解析失败"而非结构化诊断；`.` 分隔符把"id 不能含点"泄漏给用户；解析分散 compile（`parseNodeRef`）+ parsers 两处。
- 要表达"上边 25% 处"这类边上比例点、或 anchor 后再 offset，字符串小 DSL 只会继续膨胀。

## 决策：TargetSchema 对象唯一 + parseNodeTarget 在 parser 层 eager 转对象

删 `z.string()` 节点引用分支，核心数据结构（字面即决策，完整字段 + 英文 describe 见 `core/src/ir/path/target.ts`）：

- `AnchorRefSchema = union(命名 anchor 枚举 | 角度 number().finite() | { side, t })`——`{ side: 'north'|'south'|'east'|'west', t: 0..1 }` 边上比例点（几何见 ADR-02）。
- `NodeTargetSchema = { id, anchor?: AnchorRef, offset?: [dx,dy] finite }`——缺 anchor = 自动贴边界；offset 世界系平移。

字符串 shorthand 由 React DSL 层 eager 解析成对象（`core/src/parsers/parseNodeTarget.ts`，单一真源）后才入 core；core ir / compile / 诊断永远拿对象，序列化 IR 即对象。

理由：

1. **schema 可校验 + 结构化诊断**——anchor 枚举 / `t∈[0,1]` / offset finite 都能在 schema 报错（`anchor.t must be between 0 and 1`），不再"字符串解析失败"。
2. **单一真源、无双轨**——用户拍板不留 `z.string()` 兼容分支，alpha.6 即删；序列化 IR 唯一形态是对象。
3. **消费 alpha.3 anchor 接口**——命名 anchor 走 `ShapeDefinition.anchor`、角度走 `boundaryPoint` generic，内置 / 注册 shape 同源。

设计细节（具体决策）：

- `parseNodeRef` 搬出 compile → `core/src/parsers/parseNodeTarget.ts`（与 `parseTargetSugar` 同层）：放 compile 会让 react adapter 复用时形成 parser/adapter 反向依赖 compile。
- **dotted-id 限制**：`parseNodeTarget` 按第一个点切分（`'A.north'`→id `'A'`+anchor），故含 `.` 的 id **不能用字符串 shorthand**，必须写对象 `{ id:'a.b', anchor:'north' }`（沿用旧 `parseNodeRef` 行为，文档须声明）。`{ side, t }` 刻意只有对象形态（不扩 `'A.north:0.25'`，避免字符串 DSL 膨胀）。
- **offset 世界系**：先把 anchor / `{side,t}` 解析到最终点再加 `[dx,dy]`；节点 rotate 只影响 anchor 点位置、**不旋转 offset**（未来要局部偏移另加显式字段，不让 offset 双语义）。
- schema 禁非有限数值（角度 / offset `.finite()`，与 JSON 可序列化 IR 一致）；arc step `center?` / rectangle step `from`/`to` 共用 `TargetSchema`，自动对象化。
- **Coordinate 带 anchor 退化**：零尺寸 → 命名 / 角度 anchor 退化为中心（兼容旧行为）；`{ side, t }` 对零尺寸 Coordinate **显式报错**（边上比例点对一个点无意义，报错比静默返回中心更可诊断）。

### 被否决的选项

- **B：对象 + `z.string()` 兼容分支并存（core 仍 parseNodeRef 兜底）**——双轨：序列化 IR 可能字符串可能对象，LLM / patch / 诊断要处理两形态，与"IR 主契约对象化"相悖。用户拍板直接去除。
- **C：继续扩字符串小 DSL（`'A.north:0.25'`）**——正是对象化要消灭的字符串膨胀，`t` 无法 schema 约束。

## 不在本 ADR 范围

- `{ side, t }` 的几何实现（真实边界 / `edgePoint` / `resolveEdgePoint`）→ [ADR-02](./02-side-t-edge-point.md)，本篇只纳入 schema + compile 分发。
- `<TikZ>`→`<Layout>` 改名 → [ADR-03](./03-tikz-to-layout-rename.md)；命名 / 角度 anchor 的 `resolveAnchor` 缓存沿用 alpha.3。

---

> **实现指针**：level `red`（动 IR target schema + compile + parsers + core/react 公开导出）、⚠️ BREAKING（core `TargetSchema` 不再接受字符串节点引用；React JSX / Draw way 字符串写法不变——eager 解析，直接手写 IR 改对象，pre-rc 允许）。真源以代码为准——`AnchorRefSchema`/`NodeTargetSchema`/`IRNodeTarget`/`IRAnchorRef`（`core/src/ir/path/target.ts`）、`parseNodeTarget`（`core/src/parsers/parseNodeTarget.ts`，原 `compile/parseTarget.ts` 已删）、对象唯一路径（`core/src/compile/path/anchor.ts` 的 `refPointOfTarget`/`clipForTarget`）、`parseTargetSugar`/`parseWay` eager 归一、core+react `index.ts` 导出。测试在 `core/tests/{ir/path,parsers,compile/path}/` 与 `react/tests/kernel/`。完整施工契约（Schema 表 / 文件 scope / 测试象限 / dotted-id 规则）见本文件 git 历史。
