# ADR-02：`<Tikz>` → `<TikZ>` 组件改名

- 状态：Accepted
- 决策日期：2026-05-14
- 关联：[v0.1-beta.2 plan TODO-2](../../../plans/v0/v0.1-beta.2.md) · [AGENTS.md Kernel / Sugar / Tier 2 分层](../../../../AGENTS.md)

## 背景

`packages/react/src/kernel/Tikz.tsx` 在 beta.1 及之前导出顶层 React 组件 `Tikz` 和 `TikzProps`。但原 LaTeX 项目的品牌写法是 `TikZ`，尾部 `Z` 大写。retikz 的核心心智模型来自 TikZ，顶层容器也是用户最常 import 和最常在文档中看到的组件；保持 `<TikZ>` 命名更贴近原品牌，也更容易被熟悉 TikZ 的用户和 LLM 语料命中。

当前 `<Tikz>` 是所有 JSX DSL 的入口，改名会影响用户 import、JSX 标签、docs demo、ComponentPreview 示例、测试和阅读指南。这是明确的 breaking 改动，但 beta 阶段仍允许公开 API 改名，rc 起才冻结。

## 选项

### A. 直接改为 `TikZ` / `TikZProps`，不保留 alias（推荐）

```tsx
// 旧
import { Tikz, Node, Draw } from '@retikz/react';

<Tikz width={300} height={120}>
  <Node id="a" position={[0, 0]} />
  <Draw way={['a', '--', [2, 0]]} />
</Tikz>;

// 新
import { TikZ, Node, Draw } from '@retikz/react';

<TikZ width={300} height={120}>
  <Node id="a" position={[0, 0]} />
  <Draw way={['a', '--', [2, 0]]} />
</TikZ>;
```

文件 rename：

- `packages/react/src/kernel/Tikz.tsx` → `packages/react/src/kernel/TikZ.tsx`

### B. 新增 `TikZ`，保留 `Tikz` deprecated alias

对用户更平滑，但会把旧命名带进 rc 前的最后窗口，文档和类型 hover 也会长期出现两个顶层容器名。

### C. 保持 `Tikz`

无迁移成本，但错过 beta 改名窗口。

## 决策：A

理由：

1. beta 不考虑兼容性，应该在 rc 前把顶层命名一次性收敛。
2. `TikZ` 与原品牌一致，公开 API 表意更准确。
3. 不保留 alias 可以避免 docs、autocomplete、LLM 示例里继续扩散旧写法。

## 决策细节

- `Tikz` component 改为 `TikZ`。
- `TikzProps` 改为 `TikZProps`。
- `packages/react/src/kernel/Tikz.tsx` 改名为 `TikZ.tsx`。
- public barrel 只导出 `TikZ` / `TikZProps`，不导出 `Tikz` / `TikzProps` alias。
- 组件 `displayName` 同步为 `TikZ`；builder display-name 判断必须跟进。
- 所有 docs demo 和 MDX 示例统一替换为 `TikZ`。
- 文档路由 `/core/components/tikz` 保持不变：URL slug 仍可小写 `tikz`，不属于 React API surface。

## DSL 表面

```tsx
import { TikZ } from '@retikz/react';

<TikZ width={320} height={120}>
  {children}
</TikZ>;
```

## 影响

- **公开 API**：BREAKING。`Tikz` / `TikzProps` 改为 `TikZ` / `TikZProps`。
- **用户迁移**：替换 import 和 JSX 标签：`Tikz` → `TikZ`。
- **运行时行为**：不变。children → IR → Scene → SVG 管线不变。
- **文档**：所有用户可见示例、API 表、get-start、reading guide、llms.txt 需要同步。

## 不在本 ADR 范围

- 新增 `<Scope>` / `<Group>` / 其他 Kernel 组件。
- 修改 `<TikZ>` props 语义或默认值。
- 改文档页面 slug / sidebar key。
- 为旧 `<Tikz>` 提供 runtime warning 或 codemod 包。

---

## 实现契约

### Level

`breaking`。改 `@retikz/react` 公开组件名和 props 类型名，影响所有 docs demo。

### Schema 改动

无 core IR schema 改动；React public component/type rename。

| 文件 | 操作 | 旧 | 新 |
|---|---|---|---|
| `packages/react/src/kernel/Tikz.tsx` | rename | `Tikz.tsx` | `TikZ.tsx` |
| `packages/react/src/kernel/TikZ.tsx` | component rename | `Tikz` | `TikZ` |
| `packages/react/src/kernel/TikZ.tsx` | props type rename | `TikzProps` | `TikZProps` |
| `packages/react/src/index.ts` | export rename | `Tikz`, `TikzProps` | `TikZ`, `TikZProps` |

### 文件 scope

- `packages/react/src/kernel/Tikz.tsx` → `packages/react/src/kernel/TikZ.tsx`
- `packages/react/src/kernel/index.ts`
- `packages/react/src/index.ts`
- `packages/react/src/kernel/_displayNames.ts`
- `packages/react/src/kernel/builder.ts`
- `packages/react/src/kernel/unbuilder.ts`
- `packages/react/src/sugar/Draw.tsx` / `Node.tsx` / `Coordinate.tsx` 等 JSDoc 中 `<Tikz>` 文案
- `packages/react/tests/**` 中 import、JSX、describe 文案
- `apps/docs/src/contents/**/*.demo.tsx`
- `apps/docs/src/contents/**/*.mdx`
- `apps/docs/src/components/**/*.tsx`
- `apps/docs/public/llms.txt`
- `apps/docs/AGENTS.md`
- 根 `AGENTS.md` 中当前 DSL 示例
- `notes/plans/v0/roadmap.md` 和本 beta.2 plan 的完成摘要

### 测试象限

**公开 API smoke**

1. `import { TikZ, type TikZProps } from '@retikz/react'` 可用。
2. `Tikz` / `TikzProps` 不再从 public index 导出。
3. deep import `packages/react/src/kernel/TikZ` 在测试内可用。

**行为等价**

4. `<TikZ>` children 构造 IR 与旧 `<Tikz>` 等价。
5. `<TikZ ir={ir}>` 渲染路径保持不变。
6. `arrowMarkerPrefix` / marker dedup 行为保持不变。
7. 多 `<TikZ>` 实例 marker id 隔离测试保持通过。

**docs**

8. 所有 demo import 使用 `TikZ`。
9. 所有 JSX 示例标签使用 `<TikZ>` / `</TikZ>`。
10. docs build 通过，ComponentPreview 仍能提取 IR。

**迁移文档**

11. changelog zh/en 写 BREAKING：`Tikz` → `TikZ`、`TikzProps` → `TikZProps`。
12. get-start / component page 第一屏示例更新。

### 多 LLM 评估关注点

- 是否遗漏 docs demo import，导致 docs build 或 ComponentPreview 失败。
- 是否遗漏 displayName / builder 判断，导致 children 收集失败。
- 是否错误修改 TikZ 品牌外的普通英文 `Tikz` 历史引用。
- 是否保留了不该保留的 public alias。
