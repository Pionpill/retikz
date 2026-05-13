# ADR-08：`CompileOptions.onWarn` 收集器——路径解析 silent fail → 显式 warning

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-14](../../../plans/v0/v0.1-beta.1.md) · [DESIGN.md "core 错误信息原则"](../../../architecture/DESIGN.md)

## 背景

`packages/core/src/compile/path.ts` 在路径解析失败时存在 **20+ 处 silent `return null`**：

| 位置 | silent fail 触发条件 |
|---|---|
| `compile/path.ts:132/144` `refPointOfTarget` | 引用未定义的节点 id |
| `compile/path.ts:169/181` `clipForTarget` | 同上 |
| `compile/path.ts:399/448/451/462` `emitPathPrimitive` 入口 | step < 2 / anchor 解析失败 / `findPrev` 找不到前驱 |
| `compile/path.ts:582-588/601` `cycle / arc / circle / ellipse` 段 | 各自前驱缺失 / boundary 解析失败 |
| `compile/path.ts:667/677/687/696/709/720` 各 step kind 主循环 | line / curve / cubic / bend / step (fold) 各自的 fromClip / toClip 解析失败 |
| `compile/path.ts:775` `endpointOf` | path command 无 endpoint（如纯 close）|
| `compile/position.ts` 3 处 | OffsetPosition / AtPosition / nested polar 解析失败 |
| `react/src/kernel/_builder.ts:42` | non-string `<Text>` children 静默跳过 |
| `react/src/kernel/_builder.ts:154` | 多个 `<EdgeLabel>` 取首个其余静默丢 |

`compile.ts:96` 调用方只 `if (result) push(...)` —— 任一失败 path 静默从 Scene 消失、控制台零信息。用户写 `<Path><Step to="bogusId"/></Path>` 整条 path 消失，调试体验最差点之一。

DESIGN.md 已有错误信息原则——"AI / LLM 一等公民、错误信息必须可调试"。silent fail 直接违背。

## 选项

### A. 引入 `CompileOptions.onWarn` 可选 callback + 默认 dev `console.warn`（**推荐**）

```ts
// 公开 API 扩张
export type CompileWarning = {
  /** 警告类型代码（机器可读，未来扩字段集）*/
  code:
    | 'UNRESOLVED_NODE_REFERENCE'    // 引用未定义节点 id
    | 'PATH_TOO_SHORT'               // step < 2
    | 'ANCHOR_RESOLUTION_FAILED'     // 节点 anchor 解析失败
    | 'OFFSET_BASE_UNRESOLVED'       // OffsetPosition.of 解析失败
    | 'POLAR_ORIGIN_UNRESOLVED'      // PolarPosition.origin 解析失败
    | 'AT_TARGET_UNRESOLVED'         // AtPosition.of 解析失败
    | 'RELATIVE_INITIAL_NO_PREV_END' // 首步 relative 但无 prevEnd（fallback 到 [0, 0]）
    | 'TEXT_CHILD_NON_STRING'        // <Text> children 非字符串
    | 'MULTIPLE_EDGE_LABELS'         // 多个 <EdgeLabel> 仅首个生效
    | string;  // 允许未来扩
  /** 人类可读消息 */
  message: string;
  /** IR locator path（如 'children[3].path.children[1].to'） */
  path: string;
};

export type CompileOptions = {
  // ... 既有字段
  /** 编译期收集警告的回调；不传时 dev 默认 console.warn，生产默认静默 */
  onWarn?: (warning: CompileWarning) => void;
};
```

实现：
- 所有 silent `return null` 点前先调 `options.onWarn?.(...)`
- 默认 fallback：`onWarn` 不传时 dev 模式（`process.env.NODE_ENV !== 'production'`）`console.warn(...)`；生产静默
- 用户可注入自己的 logger（如错误上报到 Sentry）
- 测试可注入空 callback 静默

**完全非破坏性**：
- 不传 `onWarn` 默认行为与旧版基本等价（控制台 dev 警告 vs 旧的零警告——但 dev 警告等同于"暴露 silent fail"，是改善）
- 生产环境 `process.env.NODE_ENV === 'production'` 自动静默，避免污染用户 console

### B. 默认 throw / 默认 console.warn 不可关

代价：可能破坏现有依赖"silent fail = 路径就该消失"的用户代码（极少见，但不能完全排除）。

### C. 不动，保留 silent fail

代价：调试体验持续最差点；DESIGN.md 原则被违背。

## 决策：A

理由：
1. 可选 callback = 完全非破坏（不传时行为等价 + dev 控制台暴露问题，这是改善）
2. `CompileWarning.code` 机器可读 = 用户可写 "if code === 'UNRESOLVED_NODE_REFERENCE' show toast"
3. `path` 字段用 IR locator 让用户能定位到具体 JSX child（结合 DSL 表面位置反推）
4. 不引入 throw 路径，保留"path 解析失败 path 消失"的现状行为，仅在沉默处补一道可观察通道

## 待决策点

- **`CompileWarning.code` 是 enum 还是 string union**：`string union` + `string` fallback（保留扩展）。alpha.6+ 加新 code 不破坏调用方
- **`path` 字段 IR locator 格式**：`'children[3].path.children[1].to'` 形式（jq-like）；不同字段类型不同前缀，例如 `step.to` / `node.position.of`
- **dev 默认是否带 stack trace**：不带——`console.warn` 默认输出 `[retikz] <code> at <path>: <message>` 一行；用户要 stack 自己写 `onWarn: (w) => console.warn(w); console.trace()`
- **是否给 production 加 `globalThis.__RETIKZ_WARN__` hook**：不加——保持 API 表面最小，用户需要 production 警告自己传 `onWarn`
- **`compileToScene` 缺省 options 是否触发 warn**：默认 `undefined` 即按 dev / production 自动决定，与传 `{}` 等价
- **`onWarn` 在 sync vs async path 中的次序**：`compileToScene` 是 sync，`onWarn` 同步调用，按发生顺序

## DSL 表面

```ts
import { compileToScene, type CompileWarning } from '@retikz/core';

const warnings: CompileWarning[] = [];
const scene = compileToScene(ir, {
  onWarn: (w) => warnings.push(w),
});

// 用户可断言期望的 warning
expect(warnings).toContainEqual({
  code: 'UNRESOLVED_NODE_REFERENCE',
  message: expect.stringContaining('bogusId'),
  path: 'children[0].children[1].to',
});
```

或最简调试用法：

```ts
compileToScene(ir);  // dev 默认 console.warn
```

## 测试设计

新增 `packages/core/tests/compile/compile-warnings.test.ts`：

**Happy path（≥ 4）**：
- 引用未定义节点 id → 收到 `UNRESOLVED_NODE_REFERENCE` warning + `path` 字段指向正确 IR locator
- step < 2 → `PATH_TOO_SHORT`
- OffsetPosition.of 字符串引用未定义节点 → `OFFSET_BASE_UNRESOLVED`
- 首步 relative 但无 prevEnd → `RELATIVE_INITIAL_NO_PREV_END`

**边界（≥ 2）**：
- 不传 `onWarn` + production env → 静默（无 console.warn 触发）
- 不传 `onWarn` + dev env → 触发 console.warn（mock console）

**交互（≥ 1）**：
- 同 IR 多个 silent fail → 多个 warning 按发生顺序收到

≥ 7 case。

## 影响

- **公开 API surface**：新增 `CompileWarning` type + `CompileOptions.onWarn` 字段（superset 扩张）
- **运行时**：silent fail 现在会调一次 `options.onWarn?.()` —— 微小开销（callback 不传时无 cost）
- **dev 体验**：用户看到控制台警告，调试体验大幅改善
- **用户既有代码**：不传 `onWarn` 默认行为与旧版等价（生产静默 / dev 多一些 console.warn）

## 不在本 ADR 范围

- `compileToScene` 主入口外的其他 silent fail（如 `parseTargetSugar` 返回原 input 而非 throw）—— 那些是合法的 fallback 行为，不属"silent fail"范畴
- 错误信息 i18n —— 现阶段 message 仅英文，i18n 留 v0.2+

---

## 实现契约

### Level

`red`（动 `packages/core/src/compile/compile.ts` + `packages/core/src/index.ts` 公开 API；新增 type export + Option 字段）

### Schema 改动

无 zod schema 改动。`CompileOptions` 是 TS 类型不是 zod schema（运行时不验证）。

### 文件 scope

- `packages/core/src/compile/compile.ts` —— 加 `CompileWarning` type + `CompileOptions.onWarn` 字段 + default warn dispatcher
- `packages/core/src/compile/path.ts`（或 ADR-05 之后的 `compile/path/index.ts`）—— 20+ 处 `return null` 加 `options.onWarn?.()` 调用
- `packages/core/src/compile/position.ts` —— 3 处 silent fail 同上
- `packages/core/src/index.ts` —— export `CompileWarning`
- `packages/react/src/kernel/_builder.ts` —— 2 处 silent skip 怎么处理：**本 ADR 不动**——builder 不在 compileToScene 链路内（builder 跑在 compile 之前），onWarn 不适用。builder 的 silent skip 另开 ADR / 改成 dev console.warn
- `packages/core/tests/compile/compile-warnings.test.ts`（新建）

### 测试象限

见"测试设计"段（≥ 7 case：4 happy + 2 边界 + 1 交互）

### 依赖的现有元素

- `compile/compile.ts` `CompileOptions` —— **扩展**：加 `onWarn`
- `compile/path.ts` / `compile/position.ts` —— **修改**：silent fail 点加 onWarn 调用
- `packages/core/src/index.ts` —— **修改**：新增 `CompileWarning` export
