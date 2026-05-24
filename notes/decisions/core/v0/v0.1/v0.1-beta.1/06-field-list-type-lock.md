# ADR-06：字段表互锁通用做法 + 两处应用（builder/unbuilder + `stableSpecKey`）

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-12 + TODO-17](./roadmap.md)

## 背景

retikz 内部有若干"字段表"——硬编码的字段名列表 / map，期望与对应 zod schema 或 type 的 key 集合保持完备一致。这些字段表手写、与类型脱钩，**新加字段时容易漏写**，TS 不抓、运行时不报错、只在用户场景命中漏字段时暴露：

| 位置 | 字段表 | 期望与之一致的类型 | 漏写后果 |
|---|---|---|---|
| `react/src/kernel/_builder.ts` `buildNode` | 30+ 个 `id: props.id as ..., shape: props.shape as ..., ...` | `NodeSchema` 字段集 | 新 IR 字段不入 IR、Node 渲染不带新字段 |
| `react/src/kernel/_unbuilder.ts` `nodePropsFromIR` | 30+ 个 `if (n.id !== undefined) props.id = n.id` | `IRNode` 字段集 | IR → React JSX 转换漏字段、unbuilder 不可逆 |
| `react/src/kernel/Tikz.tsx:49` `stableSpecKey` | 8 字段（shape / scale / length / width / color / fill / opacity / lineWidth）| `ArrowEndSpec` 字段集 | 两个视觉不同的 arrow 复用同一 marker id |

ADR-05 已经把 `compile/path.ts` 的 `THICKNESS_TO_WIDTH` 与 enum 互锁了，是同一主题的应用——本 ADR 把"字段表互锁"作为**通用 idiom**写清楚，并覆盖另外两处应用（builder/unbuilder + stableSpecKey）。

## 选项

### A. `as const satisfies` + `AssertEqual` 双约束 idiom（**推荐**）

通用做法：

```ts
// 1. 字段表用 as const + satisfies 强制元素必为类型的 key
const NODE_FIELDS = [
  'id', 'shape', 'rotate', 'fill', 'stroke', ...
] as const satisfies ReadonlyArray<keyof IRNode>;

// 2. 完备性互锁——字段表覆盖类型所有 key
type _NodeFieldsCheck = AssertEqual<
  typeof NODE_FIELDS[number],
  Exclude<keyof IRNode, 'type' | '<特化字段>'>  // 特化字段从对照中排除
>;

// 3. 使用方遍历字段表
const buildNodeIR = (props: NodeProps): IRNode => {
  const ir: Partial<IRNode> = { type: 'node' };
  for (const key of NODE_FIELDS) {
    if (props[key] !== undefined) (ir as any)[key] = props[key];
  }
  return ir as IRNode;
};
```

`AssertEqual<A, B>` 是 type-level 等价检查工具（如 `[A, B] extends [B, A] ? true : never`）。漏写 / 多写字段都 TS 编译期报错。

**特化字段处理**：少数字段"读取来源不止 props"（`text` / `position` / `label` 等需读 children / props 二选一）—— 这些不进字段表，保留独立处理路径；字段表里 `Exclude<...>` 把它们排除即可。

### 三处应用点

**应用 1：builder `NODE_FIELDS`**（`_builder.ts`）
- 类型基准：`IRNode`
- 排除特化：`text` / `position` / `label`（这些读 children / 嵌套对象 / 数组）
- 字段表：~25 个纯透传字段

**应用 2：unbuilder `NODE_FIELDS`**（`_unbuilder.ts`）
- 与 builder 共用同一份 `NODE_FIELDS` 常量（builder 与 unbuilder 字段对照天然对称）
- 同样特化字段独立处理

**应用 3：marker `ARROW_END_SPEC_KEY_FIELDS`**（`Tikz.tsx`）
- 类型基准：`ArrowEndSpec`
- 排除特化：`shape`（必填，单独头部处理）
- 字段表：7 个 optional 字段（scale / length / width / color / fill / opacity / lineWidth）
- `stableSpecKey` 遍历字段表拼 key 字符串

### B. 不抽通用 idiom，三处分别独立修

代价：未来发现第 4 / 第 5 处字段表（如 `step.ts` 的 10-kind builder switch、`Path` props 的字段集）时无统一做法可循。

## 决策：A

理由：
1. 三处问题同类，统一 idiom 让未来加新字段表时无须重新决策
2. 通用 `AssertEqual` helper 可作为公共 internal 工具（位于 `packages/core/src/types.ts` 或新 `packages/core/src/_internal/type-utils.ts`）
3. builder/unbuilder 共用 `NODE_FIELDS` 是天然的——两边字段必须对称，共用常量是正解

## 决策细节

- ✓ **`AssertEqual<A, B>` 加到 `packages/core/src/types.ts`**（与 `ValueOf<T>` 同级），不公开 export——仅 internal idiom
- ✓ **`Step` 字段表本 ADR 不做**：`Step` 是 10-kind discriminated union，字段表需 per-kind 分开做、工作量大；留待 plan 评估后单独 ADR
- ✓ **`Path` props 字段表本 ADR 不做**：`Path` 有 `children` 特化（读 Step 子节点）；留下次
- ✓ **特化字段用 `Exclude<keyof IRNode, 'type' | 'text' | 'position' | 'label'>` 显式排除**，并在 `NODE_FIELDS` 常量上方 JSDoc 写清"特化字段：text / position / label，由独立路径处理"

## DSL 表面

无变化（仅内部实现重构）。

## 测试设计

**类型互锁测试**：
- 漏写一个字段 → TS 编译失败（手动验证：临时删 `NODE_FIELDS` 中一个字段、看 `tsc --noEmit` 报错；提交前恢复）
- 加多余字段（不在 `IRNode` 中）→ TS 编译失败（同上）

**行为等价测试（既有）**：
- 既有 `_builder.test.tsx` / `_unbuilder.test.tsx` / `Tikz-arrow-hash.test.tsx` 全过
- ADR-04 补的 alpha.5 round-trip 测试一并守门

**marker 数量分离测试**（既有，确保不退化）：
- 不同 `ArrowEndSpec`（任一字段不同）→ 不同 marker id
- 完全相同 `ArrowEndSpec` → 同 marker id
- 字段顺序无关（已测）

不强凑测试象限——纯类型层 + 行为等价。

## 影响

- **代码量**：3 处手写枚举 → 3 份字段表 + 3 处遍历；总行数略减
- **公开 API**：无变化
- **未来体验**：加新 `Node` / `Path` / `ArrowEnd` 字段时 TS 强制提示更新字段表，零漏字段事故
- **运行时**：遍历字段表 vs 直读字段——性能可忽略（n=25 字段）

## 不在本 ADR 范围

- `Step` 10-kind 的字段表（per-kind 分开，独立 ADR 或推到 ADR-07）
- `Path` props 字段表
- 其他可能存在的字段表（grep `props.X as Y` / `if (x !== undefined) y[key] = x` 模式）

---

## 实现契约

### Level

`yellow`（动 `packages/react/src/kernel/`，但仅内部实现 + 类型层；零行为 / 零公开 API 变化）

### Schema 改动

无 zod schema 改动。

### 文件 scope

- `packages/core/src/types.ts`（加 `AssertEqual` type util）
- `packages/react/src/kernel/_builder.ts` —— `NODE_FIELDS` 字段表 + 遍历替换 30+ 行 cast
- `packages/react/src/kernel/_unbuilder.ts` —— 共用 `NODE_FIELDS` 字段表 + 遍历替换 30+ 行 if-undefined-then-set
- `packages/react/src/kernel/Tikz.tsx` —— `ARROW_END_SPEC_KEY_FIELDS` 字段表 + `stableSpecKey` 遍历替换
- `packages/react/tests/kernel/Tikz-arrow-hash.test.tsx` —— 补 1 条"全部 spec 字段参与 hash"测试

### 测试象限

**类型互锁（手动验证）**：删 / 加字段触发 TS 报错（不进 CI，但 PR review 时演示一次）

**Hash 守门（≥ 2）**：
- 全部 `ArrowEndSpec` 可能字段每个改一次产出不同 marker id
- 字段顺序无关（已有，保留）

**Round-trip 守门（既有）**：
- `_builder.test.tsx` / `_unbuilder.test.tsx` 全过

### 依赖的现有元素

- `packages/core/src/types.ts` `ValueOf<T>` —— 引用（同文件 type util 风格）
- `packages/core/src/ir/node.ts` `IRNode` —— 引用（NODE_FIELDS 类型基准）
- `packages/core/src/primitive/path.ts` `ArrowEndSpec` —— 引用（ARROW_END_SPEC_KEY_FIELDS 类型基准）
