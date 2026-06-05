# ADR-11：core 测试 helper 去除 renderer mirror 漂移风险

- 状态：Accepted（已实现）
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-18](./roadmap.md) · [packages/core/AGENTS.md](../../../../../../packages/core/AGENTS.md)

> **范围**：core 测试里 `helpers/path-d.ts` / `helpers/transform.ts` 镜像了 react adapter 的 `buildPathD` / `buildTransform`，把结构化 `PathCommand[]` / `Transform[]` 再序列化成 SVG 字符串作断言。把这些断言改为直接断言结构化命令数组，删掉镜像 helper，消除漂移风险。

## 背景 / 约束

两个 helper 主动镜像 react adapter 的实现（JSDoc 已显式登记"镜像 buildPathD/buildTransform"），带两个风险：

1. **测试断言重心错位**——alpha.5 把 PathPrim / GroupPrim 结构化的根本意图是"core 持结构化数据、adapter 各自翻译原生 API"；core 测试应守"结构化 commands 数组等价"契约，不该把断言重心拉回 SVG mini-language。
2. **漂移风险**——helper 与真实 renderer 各自维护，arc / transform / rounding / flag 逻辑改动时可能漂移：既可能误报（renderer 改了 helper 没改、测试挂）也可能漏报（helper 改了 renderer 没改、测试过但生产挂）。

涉及 8 个测试文件 / 74 处 `pathCommandsToD` 调用（`path.test.ts` 占 47 处）。

## 决策：core 测试直接断言 `PathCommand[]` / `Transform[]` 结构

绝大多数 `pathCommandsToD(...)` 调用原意是检查命令序列正确性，改成断言 commands 数组深 equal；极少数 readable snapshot 风格的字符串断言迁到 `react/tests/render/path-d-builder.test.tsx`（真实 `buildPathD` 产出 SVG 字符串、与字符串期望比较——SVG 输出契约的正确归口）。完工后删除两个镜像 helper。

被否决的备选：(B) 把 helper 升级为直接 `import { buildPathD } from react adapter——会创建 `@retikz/core` → `@retikz/react` 的反向依赖（core AGENTS.md 硬禁）；(C) 不动——风险持续。

理由：与 alpha.5 ADR-01 根本意图一致（core 守结构化契约、SVG 输出契约由 adapter 测试守）；不引入反向依赖。

### 决策细节

- **完工后删除 `helpers/path-d.ts` + `helpers/transform.ts`**，不留 readable formatter helper。
- **加 `PathCommand` factory helper 减少结构化断言样板**：`move([x,y])` / `line([x,y])` / `quad` / `cubic` / `arc` / `close` 等工厂，**只产结构化 PathCommand 对象、不产字符串**——避免重蹈 mirror renderer 覆辙。

## 不在本 ADR 范围

- 进一步审计其他 test helper——留下次发现时。

---

> **实现指针**：level `green`、非 breaking（仅 core 测试断言形态变化，74 处不增不减 case、零生产代码改动）。真源以代码为准——core 测试改为断言 `PathCommand` / `Transform`（`core/src/primitive/{path,group}.ts`）结构，工厂 helper `core/tests/helpers/path-command-factory.ts`（只产结构化数据），镜像 helper `path-d.ts` / `transform.ts` 已删除；迁出的字符串契约由 `react/tests/render/path-d-builder.test.tsx`（真实 `buildPathD`）守门。完整原文（74 处分布表 / 分批 commit 计划）见本文件 git 历史。
