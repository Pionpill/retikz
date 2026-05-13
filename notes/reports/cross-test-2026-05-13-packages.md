# Cross Test Report: packages

日期：2026-05-13
范围：`packages/core` / `packages/react` 高风险路径抽样
测试目标：补充边缘场景 / 缺陷挖掘 / 用户视角评估

## 读取范围

- 实现文件：
  - `packages/core/src/ir/position/position.ts`
  - `packages/core/src/ir/position/polar-position.ts`
  - `packages/core/src/ir/position/offset-position.ts`
  - `packages/core/src/ir/font.ts`
  - `packages/core/src/ir/scene.ts`
  - `packages/core/src/compile/path.ts`
  - `packages/core/src/compile/position.ts`
  - `packages/react/src/kernel/_builder.ts`
  - `packages/react/src/kernel/_unbuilder.ts`
- 测试文件：
  - `packages/core/tests/ir/arrow-detail.test.ts`
  - `packages/core/tests/compile/path.test.ts`
  - `packages/core/tests/compile/path-offset-target.test.ts`
  - `packages/react/tests/kernel/_builder.test.tsx`
  - `packages/react/tests/kernel/_unbuilder.test.tsx`
  - `packages/react/tests/kernel/Tikz-arrow-hash.test.tsx`
- 参考文档 / plan：
  - `.agents/skills/cross-test/SKILL.md`
  - `AGENTS.md`
  - `notes/plans/v0/v0.1-beta.1.md`

## 新增 / 草拟测试

| 文件 | 测试名 | 目的 | 当前结果 |
|---|---|---|---|
| `packages/core/tests/ir/json-serializable.test.ts` | `[cross-test] IR JSON 可序列化契约 > 笛卡尔坐标拒绝 Infinity / -Infinity，避免 JSON round-trip 变成 null` | 锁定 `PositionSchema` 不应接受非 JSON 有限数 | fail |
| `packages/core/tests/ir/json-serializable.test.ts` | `[cross-test] IR JSON 可序列化契约 > 极坐标 angle / radius 拒绝非有限数，避免 JSON round-trip 失真` | 锁定 `PolarPositionSchema` 不应接受非有限 angle/radius | fail |
| `packages/core/tests/ir/json-serializable.test.ts` | `[cross-test] IR JSON 可序列化契约 > 偏移定位 offset 拒绝非有限数，避免 compile 产出非有限 Scene 坐标` | 锁定 `OffsetPositionSchema` 不应接受非有限 offset | fail |
| `packages/core/tests/ir/json-serializable.test.ts` | `[cross-test] IR JSON 可序列化契约 > 字体数值字段拒绝非有限数，避免 renderer 收到 Infinity 字号或字重` | 锁定 `FontSchema` 数值字段不应接受非有限数 | fail |
| `packages/core/tests/ir/json-serializable.test.ts` | `[cross-test] IR JSON 可序列化契约 > 顶层 SceneSchema 拒绝含非有限数值的 IR` | 确认顶层 IR 校验不会放过非 JSON 有限数 | fail |

## 运行结果

```bash
.\node_modules\.bin\vitest.CMD run tests\ir\json-serializable.test.ts --reporter=verbose
```

结果摘要：

- pass：0
- fail：5
- 失败原因：当前 zod `z.number()` / `.positive()` 接受 `Infinity` / `-Infinity`，导致 `safeParse(...).success` 为 `true`。

```bash
.\node_modules\.bin\eslint.CMD packages/core/tests/ir/json-serializable.test.ts --fix
.\node_modules\.bin\tsc.CMD --noEmit
```

结果摘要：

- ESLint：pass
- TypeScript：pass

未运行：

- `pnpm --filter @retikz/core ...`：当前 shell 中 `pnpm` 不在 PATH；已改用包内 / 根目录 `node_modules/.bin` 直接运行。
- 全量 core vitest：新增测试已确认 fail，全量运行会被同一 BLOCKING 阻断。

## BLOCKING

| case | 触发输入 | 期望行为 | 实际行为 | 证据 | 后续动作 |
|---|---|---|---|---|---|
| `PositionSchema` 接受 `Infinity` | `PositionSchema.safeParse([Infinity, 0])` | 拒绝非有限数，避免 JSON 后变成 `[null,0]` | `success === true` | `json-serializable.test.ts` 第 1 个 case fail | 将坐标数值 schema 收敛为 finite number |
| `PolarPositionSchema` 接受 `Infinity` | `{ angle: Infinity, radius: 10 }` / `{ angle: 0, radius: Infinity }` | 拒绝非有限 angle/radius | `success === true` | `json-serializable.test.ts` 第 2 个 case fail | 将 polar angle/radius 改为 finite number，radius 保留正数约束 |
| `OffsetPositionSchema` 接受非有限 offset | `{ of: [0,0], offset: [Infinity,0] }` | 拒绝非有限 offset，避免 compile 产出非有限 Scene 坐标 | `success === true` | `json-serializable.test.ts` 第 3 个 case fail | 复用 finite position tuple |
| `FontSchema` 接受非有限 size/weight | `{ size: Infinity }` / `{ weight: Infinity }` | 拒绝 renderer 无法合理消费的非有限字号 / 字重 | `success === true` | `json-serializable.test.ts` 第 4 个 case fail | 字体数值字段改为 finite；weight 可进一步限制 100..900 |
| `SceneSchema` 放过含非有限数值的 IR | node position 为 `[Infinity, 0]` | 顶层 IR 校验失败 | `success === true` | `json-serializable.test.ts` 第 5 个 case fail | 在基础数值 schema 修复后由顶层联动通过 |

## WARNING

| case | 观察 | 用户影响 | 建议动作 |
|---|---|---|---|
| 错误信息 / schema 契约 | 当前 schema 没有统一的 finite number helper，数值约束分散在多个文件 | LLM 或用户输入 `Infinity` 时，schema parse 通过，但 JSON 持久化后变 `null`，错误延迟到后续阶段才暴露 | 在 `ir` 或 `types` 附近引入内部 finite number schema helper，统一描述与错误信息 |
| pnpm 可用性 | 当前 shell `pnpm` 不在 PATH，但 `node_modules/.bin` 可用 | 交叉测试运行命令需要改用本地 bin；后续 agent 可能误判“无法测试” | 若环境长期如此，可在本地说明中补充 fallback 命令 |

## INFO

| case | 观察 |
|---|---|
| unbuilder round-trip | 已有 `_unbuilder.test.tsx` 覆盖多数 Step kind、label 与 path 视觉字段；后续仍可补 arrowDetail / OffsetPosition / AtPosition 的组合锁定，但本轮未发现直接 fail |
| silent path fail | `compile/path.ts` 多处 `return null` 已在 beta plan TODO-14 登记，未重复追加 plan |

## 用户视角评估

- API 易用性：用户通常不会手写 `Infinity`，但 LLM / 数据管道 / 计算结果可能产生；一旦 schema 接受，后续图形缺失或坐标污染很难定位。
- 错误信息 / 可诊断性：当前不是错误信息弱，而是没有报错。应在 schema 层尽早拒绝。
- 文档一致性：`SceneSchema` describe 写明 canonical JSON-serializable representation，接受 `Infinity` 与该契约冲突。
- LLM / JSON IR 友好性：这是 BLOCKING。`JSON.stringify({ x: Infinity })` 会把值变成 `null`，破坏 LLM 生成、持久化、回放的一致性。
- 可测试性 / 维护性：建议把“有限数”做成共享 schema，避免每个字段单独补 `.refine(Number.isFinite)` 后漂移。

## 后续沉淀

- 已转正式测试：`packages/core/tests/ir/json-serializable.test.ts`
- 已追加 plan TODO：未追加；该缺陷可直接作为修复任务处理，或并入当前 beta 非破坏性 bug fix。
- 建议进入 alpha 的破坏性候选：无。拒绝非有限数属于收紧非法输入，不改变合法 IR / public API shape。
- 暂不处理及原因：无。
