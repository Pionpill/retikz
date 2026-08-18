# ADR-06：字段表互锁通用做法 + 两处应用（builder/unbuilder + `stableArrowKey`）

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：

> **目标**：把"硬编码字段表与对应 zod schema / type 的 key 集合保持完备一致"这件事确立为通用 idiom（`as const satisfies` + `AssertEqual` 双约束），并覆盖 builder/unbuilder 的 `NODE_FIELDS`、marker `stableArrowKey` 两处应用。ADR-05 的 `THICKNESS_TO_WIDTH` 是同一主题先例。

## 背景 / 约束

内部有若干"字段表"（硬编码字段名列表 / map）期望与对应类型 key 集合完备一致，但手写、与类型脱钩，**新加字段时容易漏写**：TS 不抓、运行时不报错、只在用户命中漏字段时暴露。三处典型：builder `buildNode` 30+ 个 `props.X as …`（漏写 → 新字段不入 IR）、unbuilder `nodePropsFromIR` 30+ 个 `if (n.X !== undefined)`（漏写 → unbuilder 不可逆）、`stableArrowKey` 拼 key 的 8 字段（漏写 → 两个视觉不同的 arrow 复用同一 marker id）。

## 决策：`as const satisfies` + `AssertEqual` 双约束 idiom

字段表用 `as const satisfies ReadonlyArray<keyof T>` 强制元素必为类型 key + 一条 `AssertEqual<typeof FIELDS[number], Exclude<keyof T, …>>` 完备性互锁，漏写 / 多写都编译期报错；使用方遍历字段表。

理由：三处同类、统一 idiom 让未来加字段表无须重新决策；通用 `AssertEqual` helper 可作公共 internal 工具；builder / unbuilder 共用同一份 `NODE_FIELDS` 是天然的（两边字段必须对称）。

### 三处应用 + 决策细节

- **builder / unbuilder 共用 `NODE_FIELDS`**（类型基准 `IRNode`）——两边对照天然对称、共用常量是正解。
- **marker `ARROW_END_SPEC_KEY_FIELDS`**（类型基准 `ResolvedArrowEnd`，排除必填 `shape` 单独头部处理），`stableArrowKey` 遍历字段表拼 key。
- **特化字段不进字段表**：`text` / `position` / `label` 等"读取来源不止 props"的字段保留独立处理路径，`Exclude<keyof IRNode, 'type' | 'text' | 'position' | 'label'>` 显式排除并在字段表上方 JSDoc 写清。
- **`AssertEqual<A, B>` 加到 **（与 `ValueOf<T>` 同级），不公开 export——仅 internal idiom。

## 长期边界

- `Step` 10-kind discriminated union 的字段表——需 per-kind 分开、工作量大，留单独 ADR。
- `Path` props 字段表（有 `children` 特化）。
- 其他可能存在的字段表（grep `props.X as Y` / `if (x !== undefined) y[key] = x` 模式）。

---

## 最终实现结果

已实现本 ADR 的核心决策。兼容性：非 breaking（仅内部实现 + 类型层）；其余默认行为、失败语义与公开契约以正文为准。
