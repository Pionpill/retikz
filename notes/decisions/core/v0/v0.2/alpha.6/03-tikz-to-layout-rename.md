# ADR-03：`<TikZ>` → `<Layout>` 顶层容器命名整理（deprecated alias + 文档 / 白名单 / system prompt 同步）

- 状态：Accepted（已实现）
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.6 plan §第二部分](./roadmap.md) · [v0.1-beta.2 ADR-02 `<TikZ>` 组件化](../../v0.1/beta.2/02-tikz-to-tikz-component.md) · 本 milestone [ADR-01](./01-structured-target-anchor.md)（同窗口 system prompt / 白名单同步）

> **范围**：顶层渲染容器 `<TikZ>` 改主名 `<Layout>`（保留 deprecated alias），同步 AST 白名单 + system prompt + docs。与 ADR-01 同属"DSL 表达力整理"，共用白名单 / system prompt 改动面，并入一次同步。

## 背景 / 约束

- `<TikZ>` 实际承担的是"声明布局、编译、交给当前 renderer 输出"——`Layout` 更贴这个抽象，也不把用户理解锁死在 SVG / LaTeX TikZ 语境。
- 关键事实：`<TikZ>` **无 displayName**、不是 kernel marker（builder 靠 `@retikz/Node` 等识别子树），故改名纯机械、与 IR / compile / sugar 零交叉；改动面在 react 导出 + docs（demo/mdx 240+ 处）+ AST 白名单 + system prompt 双语组件列举。

## 决策：改名 `Layout` 主名 + `TikZ` deprecated alias（thin wrapper，dev once-warn）

`Layout` 主名（原 `TikZ.tsx` → `Layout.tsx`，实现不变），`TikZ` 保留为 thin wrapper alias（`@deprecated`，dev 环境模块级 once-warn、prod 静默），用户零破坏迁移、文档全量切 `Layout`。

理由：

1. **命名贴职责**——`Layout` 不锁死 SVG / TikZ 语境。
2. **零破坏迁移**——`TikZ` alias 让现有代码继续跑。
3. **改名机械、零契约交叉**——无 displayName，builder/IR/compile 不动。
4. **同窗口一次同步**——与 ADR-01 共用白名单 + system prompt 改动面。

设计细节（具体决策）：

- **dev-warning 守卫 = fail-open + best-effort**：`isProductionEnv()` 仅当 `typeof process !== 'undefined' && process.env.NODE_ENV === 'production'` 才静默，其余一切环境（裸 browser ESM、process 未定义、未知打包器）**fail-open 到 warn**——让真实 docs browser dev 也能拿到 deprecation warning，只有确定性生产被静默。**不用 `import.meta.env.DEV`**（Vite 专属、CJS 里 `import.meta` 语法错、跨打包器不可移植）。warning 是 best-effort（极端"生产但未设 NODE_ENV"可能多一次无害 warn）。
- 模块级 `let tikzDeprecationWarned` 保证多次渲染只 warn 一次。
- **AST 白名单保留 `TikZ` 条目**作兼容入口（registry 18 名 = 17 主 + TikZ alias）；但 **system prompt 主契约仍 17 组件**——只列 `Layout`，`TikZ` 作 alias 注脚不计入。
- **system prompt `to` 字段分两层**（与 ADR-01 对象唯一对齐）：结构化 IR / JSON 速查段 `to` **只列对象** `{ id, anchor?, offset? }` + 坐标形态、**无字符串节点引用**（core 已删 `z.string()`，写了会诱导 LLM 生成 core 拒收的 IR）；字符串 shorthand（`to="A.north"`）只在 JSX / Draw DSL 段注明、属 React DSL sugar 非 IR 契约。
- docs 240+ 处机械 codemod，保留一页演示 deprecated alias。

### 被否决的选项

- **B：直接改名、不留 alias**——所有用户代码 + 171 demo 立刻断；改名是"纯命名整理"、留 alias 成本极低收益明显（与 ADR-01 target 那种契约必要破坏不同）。
- **C：双名长期并存、不标 deprecated**——词汇表分裂、新用户不知用哪个、无迁移信号；alias 应是迁移桥而非永久双名。

## 不在本 ADR 范围

- 结构化 Target/Anchor → ADR-01；`{side,t}` 几何 → ADR-02。
- codemod 工具是否随 npm 包发给用户（rc 前再拍）；kernel marker displayName（`@retikz/Node` 等）不改名。

---

> **实现指针**：level `red`（动 `react/src/index.ts` 公开主名）、向后兼容 additive（`TikZ` deprecated alias，渲染行为零变化）。真源以代码为准——`Layout`/`LayoutProps` + `TikZ`/`TikZProps` alias + `isProductionEnv` 守卫（`react/src/kernel/Layout.tsx`，原 `TikZ.tsx`）、`react/src/{kernel/index,index}.ts` 导出、AST 白名单 `COMPONENT_REGISTRY`（`apps/docs/src/lib/jsx-to-ir/parser.ts`）、system prompt 双语列举 + `to` 对象形态（`apps/docs/src/layout/ai-chat/context.ts`）。测试在 `react/tests/kernel/`（Layout-public-api / tikz-alias）与 `apps/docs/tests/`。完整施工契约（codemod 范围 / 计数口径 / 测试象限）见本文件 git 历史。

> 🔖 封板压缩 commit `e6db894b`；压缩前完整施工蓝图 = `git show e6db894b^:notes/decisions/core/v0/v0.2/alpha.6/03-tikz-to-layout-rename.md`。
