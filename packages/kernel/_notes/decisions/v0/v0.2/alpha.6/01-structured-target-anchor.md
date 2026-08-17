# ADR-01：结构化 Target / Anchor（path target 对象唯一 + AnchorRef + parseNodeTarget 单一真源）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联： · [alpha.3 ADR-01 Shape Registry](../alpha.3/01-shape-registry.md)（anchor 接口先固化）· [alpha.1 ADR-02 nodeIndex/anchor 解析](../alpha.1/02-node-index-anchor-resolution.md) · 本 milestone [ADR-02](./02-side-t-edge-point.md) / [ADR-03](./03-tikz-to-layout-rename.md)

> **目标**：把 path target 的节点引用从字符串小 DSL（`'A.north'` / `'A.30'`）升级为 schema 可校验的对象契约，字符串 shorthand 收敛为 React DSL 层 eager 解析的单一入口。

## 背景 / 约束

- 原 `TargetSchema` 节点引用走 `z.string()`：anchor 语义藏字符串里（schema 只见 `string`，无法约束 anchor 枚举 / 角度 / 边上比例点 / offset），LLM 只能盲拼、错了报"字符串解析失败"而非结构化诊断；`.` 分隔符把"id 不能含点"泄漏给用户；解析分散 compile（`parseNodeRef`）+ parsers 两处。
- 要表达"上边 25% 处"这类边上比例点、或 anchor 后再 offset，字符串小 DSL 只会继续膨胀。

## 决策：TargetSchema 对象唯一 + parseNodeTarget 在 parser 层 eager 转对象

删 `z.string()` 节点引用分支，核心数据结构（字面即决策，完整字段 + 英文 describe 见 ）：

- `AnchorRefSchema = union(命名 anchor 枚举 | 角度 number().finite() | { side, t })`——`{ side: 'north'|'south'|'east'|'west', t: 0..1 }` 边上比例点（几何见 ADR-02）。
- `NodeTargetSchema = { id, anchor?: AnchorRef, offset?: [dx,dy] finite }`——缺 anchor = 自动贴边界；offset 世界系平移。

字符串 shorthand 由 React DSL 层 eager 解析成对象（，单一真源）后才入 core；core ir / compile / 诊断永远拿对象，序列化 IR 即对象。

理由：

1. **schema 可校验 + 结构化诊断**——anchor 枚举 / `t∈[0,1]` / offset finite 都能在 schema 报错（`anchor.t must be between 0 and 1`），不再"字符串解析失败"。
2. **单一真源、无双轨**——用户拍板不留 `z.string()` 兼容分支，alpha.6 即删；序列化 IR 唯一形态是对象。
3. **消费 alpha.3 anchor 接口**——命名 anchor 走 `ShapeDefinition.anchor`、角度走 `boundaryPoint` generic，内置 / 注册 shape 同源。

设计细节（具体决策）：

- `parseNodeRef` 搬出 compile → （与 `parseTargetSugar` 同层）：放 compile 会让 react adapter 复用时形成 parser/adapter 反向依赖 compile。
- **dotted-id 限制**：`parseNodeTarget` 按第一个点切分（`'A.north'`→id `'A'`+anchor），故含 `.` 的 id **不能用字符串 shorthand**，必须写对象 `{ id:'a.b', anchor:'north' }`（沿用旧 `parseNodeRef` 行为，文档须声明）。`{ side, t }` 刻意只有对象形态（不扩 `'A.north:0.25'`，避免字符串 DSL 膨胀）。
- **offset 世界系**：先把 anchor / `{side,t}` 解析到最终点再加 `[dx,dy]`；节点 rotate 只影响 anchor 点位置、**不旋转 offset**（未来要局部偏移另加显式字段，不让 offset 双语义）。
- schema 禁非有限数值（角度 / offset `.finite()`，与 JSON 可序列化 IR 一致）；arc step `center?` / rectangle step `from`/`to` 共用 `TargetSchema`，自动对象化。
- **Coordinate 带 anchor 退化**：零尺寸 → 命名 / 角度 anchor 退化为中心（兼容旧行为）；`{ side, t }` 对零尺寸 Coordinate **显式报错**（边上比例点对一个点无意义，报错比静默返回中心更可诊断）。

## 长期边界

- `{ side, t }` 的几何实现（真实边界 / `edgePoint` / `resolveEdgePoint`）→ [ADR-02](./02-side-t-edge-point.md)，本篇只纳入 schema + compile 分发。
- `<TikZ>`→`<Layout>` 改名 → [ADR-03](./03-tikz-to-layout-rename.md)；命名 / 角度 anchor 的 `resolveAnchor` 缓存沿用 alpha.3。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：⚠️ BREAKING（core `TargetSchema` 不再接受字符串节点引用；React JSX / Draw way 字符串写法不变——eager 解析，直接手写 IR 改对象，pre-rc 允许）；其余默认行为、失败语义与公开契约以正文为准。
