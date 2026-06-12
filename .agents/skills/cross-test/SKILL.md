---
name: cross-test
description: retikz 交叉测试 / 缺陷挖掘技能。用于基于 packages 下现有实现和已有测试补充边缘场景测试，以找出现有实现缺陷为目标，不能凭空编造需求；同时从真实使用者角度评估 API、错误信息、文档契约、可诊断性与可改进点。适用于 alpha/beta 任意阶段的独立质量审计、回归测试补强、adversarial 测试、用户视角体验评估，以及把发现沉淀为测试、问题报告或 notes/decisions TODO。
---

# Cross Test：交叉测试与缺陷挖掘

本 skill 的目标不是证明实现正确，而是**尽可能用真实功能打破现有实现**。所有 case 必须从当前代码、公开 API、IR schema、文档或已有测试中推导出来；不允许为了制造失败而发明不存在的功能。

## 核心原则

1. **先读实现与测试，再写测试**
   - 先理解 `packages/core` / `packages/react` 的真实行为、现有测试覆盖和公开导出。
   - 不要只看文档猜功能；以实现和已有测试为准，必要时对照 `apps/docs` 判断用户预期。

2. **以找 bug 为目标，但不伪造 bug**
   - 可以构造极端输入、组合输入、错误输入、顺序敏感输入、重复调用输入。
   - 不能断言“我希望它支持”但代码 / schema / docs 从未承诺的行为。
   - 如果发现“行为不一定错，但使用者容易踩坑”，归为 WARNING / UX，而不是硬说 BLOCKING。

3. **测试要能被留下**
   - 对确认真实的 bug：补正式回归测试，优先写成当前会 fail 的测试。
   - 对不确定行为：可先写临时 exploratory test，验证后再决定是否转正式测试或改成计划 TODO。
   - 不要删除或弱化已有测试断言。

4. **用户视角必须进报告**
   - 不只问“代码有没有错”，也问“用户看错误信息能不能修”“API 默认值是否惊讶”“文档照着写会不会踩坑”“LLM 生成 IR 后能不能自我纠错”。

## 输入

- 目标范围：一个包、一个模块、一个 TODO、一个 ADR、一个 bug 线索，或整个 `packages/`。
- 现有实现：`packages/core/core/src/**`、`packages/core/render/src/**`、`packages/core/react/src/**`、`packages/core/vanilla/src/**`、`packages/plot/*/src/**`。
- 现有测试：`packages/*/*/tests/**`。
- 可选上下文：`notes/decisions/core/**`、`notes/decisions/core/**`、`apps/docs/**`。

若用户没有指定目标范围，默认从 `packages/` 做广义扫描，但先聚焦高风险区域：

- `@retikz/core`：IR schema、parser、compile、geometry、Scene primitive。
- `@retikz/react`：builder/unbuilder、Sugar 展开、renderer、marker/id、browser measurer。
- `@retikz/vanilla`：命令式 builder（figure/node/draw/coordinate/scope）、mountSvg/renderToSvgString/toCanvas、SSR 导入安全。

> **适配器对等必测**：react 与 vanilla 是两套对等 authoring 入口、共享同一 core IR。同一图元 / DSL 能力两套都要测，且要交叉验证**两套产出的 IR 一致**（如 `<Node>` props 与 `node(config)` 产同一 IRNode）——一致性漂移是高价值 bug。

## 工作流

### 1. 读取与建模

先快速建立覆盖图：

- 入口导出：`packages/*/*/src/index.ts`
- schema 与核心类型：`packages/core/core/src/ir/**`、`primitive/**`
- 编译链路：`packages/core/core/src/compile/**`
- React 链路：`packages/core/react/src/kernel/**`、`sugar/**`、`render/**`
- 测试分布：`packages/*/*/tests/**`

输出一个简短判断：

- 已覆盖的行为
- 明显缺口
- 最值得攻击的 3-5 个点

### 2. 构造攻击面

优先从以下维度找边缘场景：

| 攻击面 | 例子 |
|---|---|
| JSON/IR 契约 | `JSON.stringify` / `JSON.parse` 后 schema parse 是否等价；额外字段 / 缺字段 / 错类型报错是否可诊断 |
| 数值边界 | `0`、负数、`NaN`、`Infinity`、极小/极大值、角度跨 360、空数组 |
| 引用解析 | 未定义 id、自引用、引用顺序、coordinate 与 node 同名、anchor 拼写错误 |
| 顺序敏感 | path 首段不是 move、cycle 后继续画、多个 sub-path + arrow、多个 `<Layout>` 同页 |
| 组合行为 | label + sloped + arrow + bend；at/offset/polar 嵌套；scale/rotate/sep 叠加 |
| Sugar 等价 | `<Draw way={...}>` 是否等价于手写 `<Path><Step /></Path>` |
| Builder/Unbuilder | `convertIRToReactNode` → `convertReactNodeToIR` round-trip 是否保真 |
| Renderer 适配 | Scene primitive 到 SVG 的 id、marker、transform、path d、text line stacking |
| 错误信息 | throw / zod error 是否包含足够定位信息，而不是 silent no-op 或模糊错误 |
| 重复调用 | 模块级缓存、`useId`、marker dedup、browser measurer canvas 复用 |

### 3. 写测试策略

按确认度分三类处理：

| 类别 | 做法 |
|---|---|
| 确认 bug | 写正式测试，允许当前 fail；测试名说明用户场景与期望 |
| 疑似 bug | 先写最小 exploratory test 或用现有测试 helper 复现，再决定是否正式化 |
| 用户体验改进 | 不强行写 fail test；记录为 WARNING / TODO，必要时补“当前行为锁定”测试 |

测试落点遵循现有布局：

- core parser：`packages/core/core/tests/parsers/*.test.ts`
- core compile：`packages/core/core/tests/compile/*.test.ts`
- core geometry：`packages/core/core/tests/geometry/*.test.ts`
- React builder/unbuilder：`packages/core/react/tests/kernel/*.test.tsx`
- React render：`packages/core/react/tests/render/*.test.tsx`
- Sugar：`packages/core/react/tests/sugar/*.test.tsx`

命名建议：

- `describe('[cross-test] 模块名：攻击面', ...)`
- `it('用户场景：期望行为', ...)`

如果项目既有测试标题不用 `[cross-test]`，可省略前缀，但报告里必须标明哪些 case 是本轮新增。

### 4. 运行验证

优先小范围运行：

```bash
pnpm --filter @retikz/core exec vitest run <test-file>
pnpm --filter @retikz/react exec vitest run <test-file>
```

若测试稳定，再跑对应包：

```bash
pnpm --filter @retikz/core exec vitest run
pnpm --filter @retikz/react exec vitest run
pnpm --filter @retikz/core exec tsc --noEmit
pnpm --filter @retikz/react exec tsc --noEmit
```

如果写了代码或测试文件，按 `AGENTS.md` 要求跑对应包 ESLint 自动修复：

```bash
pnpm --filter @retikz/<pkg> exec eslint . --fix
```

不要用 `tsc` 不带 `--noEmit`，不要用 `tsc -b`。

### 5. 分类报告

每轮交叉测试最后必须输出一份测试报告。报告可以先在最终回复中给出；如果本轮发现了 BLOCKING / WARNING，或用户要求留档，则同时写入 `notes/reports/` 下的 Markdown 文件。

推荐路径：

```text
notes/reports/cross-test-YYYY-MM-DD-<scope>.md
```

其中 `<scope>` 使用简短 kebab-case，例如 `packages`、`core-compile-path`、`react-builder`。若 `notes/reports/` 不存在，可以创建。

报告必须包含三档：

#### BLOCKING

真实实现缺陷，满足任一条件：

- 公开 API / 已有文档 / 已有测试隐含承诺被打破。
- 生成错误 Scene / SVG，用户无法从输入推断原因。
- silent fail 导致图形缺失且没有可诊断信息。
- IR JSON 序列化、schema、discriminator、公开 parser 契约失稳。
- crash / hang / 非确定性结果。

每条包含：

- case 名
- 触发输入
- 期望行为
- 实际行为
- 新增测试文件与测试名
- 是否已转正式测试

#### WARNING

不一定是 bug，但会伤害用户体验或维护性：

- 错误信息太弱。
- 默认值惊讶但文档未说明。
- 行为合理但缺少锁定测试。
- API 命名、导出或文档让用户容易误用。
- 实现和测试职责边界不干净。

每条给建议：补测试 / 改实现 / 改文档 / 记入 plan。

#### INFO

实现比预期稳、已有测试已经覆盖、或发现低优先级清理点。

### 报告模板

```md
# Cross Test Report: <scope>

日期：YYYY-MM-DD
范围：<packages/core、packages/react、具体模块或 TODO>
测试目标：补充边缘场景 / 缺陷挖掘 / 用户视角评估

## 读取范围

- 实现文件：
- 测试文件：
- 参考文档 / plan：

## 新增 / 草拟测试

| 文件 | 测试名 | 目的 | 当前结果 |
|---|---|---|---|

## 运行结果

```bash
<实际运行的命令>
```

结果摘要：

- pass：
- fail：
- 未运行及原因：

## BLOCKING

| case | 触发输入 | 期望行为 | 实际行为 | 证据 | 后续动作 |
|---|---|---|---|---|---|

## WARNING

| case | 观察 | 用户影响 | 建议动作 |
|---|---|---|---|

## INFO

| case | 观察 |
|---|---|

## 用户视角评估

- API 易用性：
- 错误信息 / 可诊断性：
- 文档一致性：
- LLM / JSON IR 友好性：
- 可测试性 / 维护性：

## 后续沉淀

- 已转正式测试：
- 已追加 plan TODO：
- 建议进入 alpha 的破坏性候选：
- 暂不处理及原因：
```

若没有发现问题，也必须明确写：

```md
## BLOCKING

无。

## WARNING

无。
```

## 用户视角评估清单

对每个目标模块回答：

1. 用户照文档或类型提示能否写出正确代码？
2. 用户写错时，错误信息是否指向具体字段 / id / step / path？
3. 默认值是否符合 TikZ 或 SVG 用户直觉？
4. 多个功能组合时是否仍可预测？
5. LLM 生成 IR 时，schema description 是否足够自我修正？
6. 失败时是抛错、warning、silent no-op，哪一种更合适？
7. 当前测试是否覆盖了“用户真的会这么写”的路径，而不只是内部 happy path？

## 计划沉淀

如果发现的问题暂不适合立即修：

- beta 非破坏优化：追加到 `notes/decisions/core/v0/v0.1/beta.1/roadmap.md` 或当前 beta plan。
- 需要改 IR schema / public API：不要塞进 beta，登记为下次 alpha 候选。
- 文档不一致：登记 docs TODO；若当轮改了用户可见行为，必须同步 docs。

记录格式建议：

```md
## TODO-N — <短标题>

### 问题陈述

### 复现 / 证据

### 建议方案

### 测试建议

### 风险
```

## 禁止事项

- 不要为了让测试失败而编造未承诺功能。
- 不要把“我希望有这个功能”写成 BLOCKING。
- 不要弱化已有测试。
- 不要用 `it.skip` / `describe.skip` 留下无效测试。
- 不要用 `as any` / `@ts-ignore` 绕过测试类型问题。
- 不要自行 commit / push；按仓库规则等待用户授权。

## 完成标志

- 已读目标实现与相关测试。
- 已新增或草拟一组真实边缘 case。
- 已运行最小必要测试，并记录 pass/fail。
- BLOCKING / WARNING / INFO 分类清楚。
- 已输出测试报告；有 BLOCKING / WARNING 或用户要求留档时，已写入 `notes/reports/cross-test-YYYY-MM-DD-<scope>.md`。
- 所有确认 bug 都有可复现输入；所有暂不修的问题都沉淀到 plan 或报告。
