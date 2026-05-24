# ADR-11：core 测试 helper 去除 renderer mirror 漂移风险

- 状态：Proposed
- 决策日期：2026-05-13
- 关联：[v0.1-beta.1 plan TODO-18](../../../plans/v0/v0.1-beta.1.md) · [packages/core/AGENTS.md](../../../../packages/core/AGENTS.md)

## 背景

`packages/core/tests/helpers/path-d.ts` 和 `packages/core/tests/helpers/transform.ts` **镜像** React adapter 的 `buildPathD` / `buildTransform` 实现，用来把结构化 `PathCommand[]` / `Transform[]` 再序列化成 SVG 字符串作测试断言。两文件 JSDoc 已显式登记 "镜像 react adapter 的 buildPathD/buildTransform"——主动标注的镜像，不是潜在的。

两个风险：

1. **测试断言重心错位**：alpha.5 ADR-01 把 PathPrim / GroupPrim 结构化的根本意图就是"core 持结构化数据、adapter 各自翻译为原生 API"——core 测试应守住"结构化 commands 数组等价"契约，不该把断言重心拉回 SVG mini-language
2. **漂移风险**：helper 与 `packages/react/src/render/path-d-builder.ts` / `transform-builder.ts` 各自维护——未来 arc / transform / rounding / flag 计算逻辑改动时，可能出现 helper 与真实 renderer 漂移，测试既可能误报（renderer 改了但 helper 没改、测试挂）也可能漏报（helper 改了但 renderer 没改、测试过但生产挂）

量化：**8 个测试文件 / 74 处 `pathCommandsToD` 调用**（`path.test.ts` 占 47 处）：

| 文件 | 调用次数 |
|---|---|
| `compile/path.test.ts` | 47 |
| `compile/node-shape.test.ts` | 12 |
| `compile/node-coordinate.test.ts` | 4 |
| `compile/node-at.test.ts` | 3 |
| `compile/node-sep.test.ts` | 3 |
| `compile/node-style.test.ts` | 3 |
| `compile/path-primitive-adversarial.test.ts` | 2 |

## 选项

### A. 优先让 core 测试直接断言 `PathCommand[]` / `Transform[]` 结构（**推荐**）

两步走：

**第 1 步**：梳理所有 `pathCommandsToD(...)` 调用，区分两类
- **可改结构化**（绝大多数）：断言原意就是检查命令序列正确性，改成断言 `commands` 数组深 equal（用 `toMatchObject` 或 `toEqual` 配合期望 PathCommand 数组）
- **必须保留字符串**（少数）：极少的"snapshot 风格""可读性强的多 cmd 串"——保留 helper 调用，但**仅在该测试文件用作 readable assertion**，并加注释"helper 不覆盖 renderer 语义"

**第 2 步**：剩余字符串断言迁移到 `packages/react/tests/render/path-d-builder.test.tsx`（已存在），由真实 `buildPathD` 直接产出 SVG 字符串、与字符串期望比较——这才是 SVG 输出契约的正确归口

完工后：
- `packages/core/tests/helpers/path-d.ts` 与 `transform.ts` 要么删除、要么收窄成单 1-2 case 用的 dev-only formatter（不再 8 文件共用）
- 漂移风险移除——core 测试不再依赖 adapter 镜像逻辑

### B. 把 helper 升级为"调真实 renderer"

让 `path-d.ts` 直接 `import { buildPathD } from '@retikz/react/render/path-d-builder'` 而非自己实现。

代价：
- 创建 `@retikz/core` → `@retikz/react` 的反向依赖（core AGENTS.md 硬禁）
- 测试代码组织反过来——core 测试不该依赖 react adapter

否决。

### C. 不动

风险持续。

## 决策：A

理由：
1. 与 alpha.5 ADR-01 的根本意图一致——core 测试守结构化契约，SVG 输出契约由 react adapter 测试守
2. 不引入 core → react 反向依赖
3. 长期工作量分摊——本 ADR 不要求一次 commit 改 74 处；建议按文件分批

## 决策细节

- ✓ **每个测试文件单独一个 commit**——最大 `path.test.ts` 拆 2-3 commit；避免单 commit 改 74 处难 review
- ✓ **完工后删除 `helpers/path-d.ts` + `helpers/transform.ts`**——不留 readable formatter helper；如有极少数 readable snapshot 场景，迁到 `react/tests/render/*`（SVG 输出契约的正确归口）
- ✓ **`compile/path.test.ts` 47 处按 describe 块拆 commit**——每个 describe 一个 commit、commit message 写明本批迁移哪个 describe
- ✓ **加 `PathCommand` factory helper 减少结构化断言样板**：在 `packages/core/tests/helpers/path-command-factory.ts`（新建）加 `move([x, y])` / `line([x, y])` / `quad(c, [x, y])` / `cubic(c1, c2, [x, y])` / `arc(...)` / `close()` 等工厂；**只产结构化 PathCommand 对象、不产字符串**——避免重蹈 mirror renderer 覆辙

## DSL 表面

无变化（仅测试改动）。

## 测试设计

无新增测试 case——本 ADR 是**重写既有测试断言形态**（74 处），不加新覆盖。

行为等价性的守门：
- 每次 commit 跑 `pnpm --filter @retikz/core test:run` 全过
- 迁完后再跑一次 `pnpm test` 全 workspace 守门

## 影响

- **测试量**：74 处断言形态变化（不增不减 case 数）
- **测试可读性**：结构化断言略冗长但更明确；可用 helper 工厂缓解
- **`packages/core/tests/helpers/`**：删 2 文件 or 收窄
- **公开 API / 运行时**：零变化

## 不在本 ADR 范围

- 进一步审计其他 test helper（如 `packages/core/tests/helpers/` 下未来加的）—— 留下次发现时
- 给 `PathCommand` / `Transform` 加测试用 factory helper（`move()` / `line()` / `rotate()`）—— 可选附带，但不是本 ADR 主流程；如做也加在 `packages/core/tests/helpers/` 但**只产结构化数据，不产字符串**

---

## 实现契约

### Level

`green`（仅 `packages/core/tests/` 内部测试断言形态变化；零生产代码改动、零公开 API 变化）

### Schema 改动

无 zod schema 改动。

### 文件 scope

- `packages/core/tests/compile/path.test.ts`（47 处迁移，分 ~3 commit）
- `packages/core/tests/compile/node-shape.test.ts`（12 处）
- `packages/core/tests/compile/node-coordinate.test.ts`（4 处）
- `packages/core/tests/compile/node-at.test.ts`（3 处）
- `packages/core/tests/compile/node-sep.test.ts`（3 处）
- `packages/core/tests/compile/node-style.test.ts`（3 处）
- `packages/core/tests/compile/path-primitive-adversarial.test.ts`（2 处）
- `packages/core/tests/helpers/path-d.ts`（最后删除或收窄）
- `packages/core/tests/helpers/transform.ts`（同上）
- 可选：`packages/core/tests/helpers/path-command-factory.ts`（新建——可选 factory helper）
- 必要时：`packages/react/tests/render/path-d-builder.test.tsx`（接收迁过来的字符串契约测试）

### 测试象限

零新行为覆盖——本 ADR 是断言形态重写。守门即可：

**守门（既有）**：
- 每个 commit 后 `pnpm --filter @retikz/core test:run` 全过
- 完工后 `pnpm test` 全 workspace 全过

### 依赖的现有元素

- `packages/core/src/primitive/path.ts` `PathCommand` —— **引用**（测试新断言基准类型）
- `packages/core/src/primitive/group.ts` `Transform` —— **引用**（同上）
- `packages/react/src/render/path-d-builder.ts` / `transform-builder.ts` —— **引用**（迁过来的字符串契约在此守门）
