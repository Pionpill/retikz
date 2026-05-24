# ADR-03：`<TikZ>` → `<Layout>` 顶层容器命名整理（deprecated alias + 文档 / 白名单 / system prompt 同步）

- 状态：Accepted
- 决策日期：2026-05-23
- 关联：[v0.2-alpha.6 plan §第二部分](./roadmap.md) · [roadmap §`<TikZ>` → `<Layout>` 命名提案](../../roadmap.md#tikz--layout-命名提案) · [v0.1-beta.2 ADR-02 `<TikZ>` 组件化](../../v0.1/v0.1-beta.2/02-tikz-to-tikz-component.md) · 本 milestone [ADR-01](./01-structured-target-anchor.md)（同窗口 system prompt / 白名单同步）

> **为什么并入 alpha.6**：与 [ADR-01](./01-structured-target-anchor.md) 结构化 Target / Anchor 同属"DSL 表达力整理"主题——AST 白名单 + `composeSystem` system prompt 两处**两件事都要动**，并入一次同步；改名本身机械、低风险、与 IR / compile / sugar 工作面零交叉。

## 背景

`<TikZ>`（`packages/react/src/kernel/TikZ.tsx:110`）是 React 顶层渲染容器，职责：从 children 构造 IR（或接外部 IR）→ `compileToScene` → 渲染 SVG + 按需注入 arrow marker `<defs>`。`<TikZ>` 是对原始灵感来源（LaTeX TikZ）的致敬，但组件实际承担的是"声明布局、编译、交给当前 renderer 输出"——`Layout` 更贴近这个抽象，也不把用户理解锁死在 SVG / LaTeX TikZ 语境里。

关键事实（探查实测）：

- **`<TikZ>` 无 displayName**：不是 kernel marker，`builder.ts` 不靠它识别子树（marker 是 `@retikz/Node` / `@retikz/Path` / `@retikz/Scope` 等，改名不动这层）。改名纯机械。
- **改动面**：docs demo.tsx **171 文件 / 175 处**、mdx 内联 **66 处**、AST 白名单 `parser.ts:33-51`（现 17 组件含 TikZ）、system prompt `context.ts` 中英双语组件列举（30-31 / 136-138）+ IR `to` 字段速查（65-67 / 171-173）。

## 选项

### A. 改名 `Layout` 主名 + `TikZ` deprecated alias（thin wrapper，dev once-warn）（**推荐**）

```ts
// packages/react/src/kernel/Layout.tsx（原 TikZ.tsx 重命名）
export const Layout: FC<LayoutProps> = props => { /* 原 TikZ 实现不变 */ };
export type LayoutProps = { /* 原 TikZProps 内容 */ };

export type TikZProps = LayoutProps;
let tikzDeprecationWarned = false;
/** 确定性生产判定：仅当能读到 NODE_ENV==='production' 才算生产，其余（含裸 ESM、process 未定义）都当 dev */
const isProductionEnv = (): boolean =>
  typeof process !== 'undefined' && process.env.NODE_ENV === 'production';
/** @deprecated 用 `<Layout>` 代替；本 alias 将在未来版本移除 */
export const TikZ: FC<TikZProps> = props => {
  // fail-open：非确定性生产即 warn（best-effort dev warning，见决策细节 #1）
  if (!isProductionEnv() && !tikzDeprecationWarned) {
    tikzDeprecationWarned = true;
    console.warn('[retikz] <TikZ> is deprecated; use <Layout> instead.');
  }
  return <Layout {...props} />;
};
```

- 优：用户零破坏迁移（`<TikZ>` 仍工作）；dev 提示迁移、prod 静默；文档可全量切 `<Layout>`。
- 缺：多一个 alias wrapper（极小）；docs 240+ 处要 codemod（机械）。

### B. 直接改名、不留 alias

`TikZ` 直接删，只导出 `Layout`。

- 缺：所有用户代码 + 171 demo 立刻断；alpha 期虽允许破坏，但改名是"纯命名整理"，留 alias 成本极低、收益（平滑迁移 + 文档演示 alias）明显。否决（与决策 2 的 target 破坏不同：那是契约必要破坏，改名无此必要）。

### C. 双名长期并存、不标 deprecated

`Layout` / `TikZ` 平级长期保留。

- 缺：词汇表分裂，新用户不知用哪个；无迁移信号。否决——alias 应是迁移桥而非永久双名。

## 决策：A

理由：

1. **命名贴职责**：`Layout` = 声明布局交 renderer 输出，不锁死 SVG / TikZ 语境。
2. **零破坏迁移**：`TikZ` deprecated alias（dev once-warn / prod 静默）让现有代码继续跑，文档与新代码切 `Layout`。
3. **改名机械、零契约交叉**：`<TikZ>` 无 displayName，builder / IR / compile 不动；只动 react 导出 + docs + 白名单 + system prompt。
4. **同窗口一次同步**：与 ADR-01 共用 AST 白名单 + system prompt 改动面，并入省一次过境。

## 决策细节

> 主选项已锁，以下随 review 收敛。

1. **dev-warning 守卫（fail-open + best-effort）**：用 `isProductionEnv()` = `typeof process !== 'undefined' && process.env.NODE_ENV === 'production'`，**仅当确定是生产才静默**；其余一切环境（裸 browser ESM、process 未定义、未知打包器）都 **fail-open 到 warn**。这样真实 docs browser dev（即使打包器没注入 `process.env`）也能拿到 deprecation warning，只有确定性生产被 bundler 替换为静默。**不用 `import.meta.env.DEV`**——Vite 专属、CJS 构建里 `import.meta` 是语法错、跨打包器不可移植。**性质标注：warning 是 best-effort**——极端情况（生产但未设 `NODE_ENV`）可能多一次 console.warn（无害）；测试覆盖 prod 静默 + dev warn 两路径，并注明 browser dev 走 fail-open 分支。
2. **once-warn**：模块级 `let tikzDeprecationWarned` 保证多次渲染只 warn 一次（不刷屏）。
3. **文件重命名**：`kernel/TikZ.tsx` → `kernel/Layout.tsx`；`kernel/index.ts` `export * from './TikZ'` → `'./Layout'`；`src/index.ts` 导出 `Layout` / `LayoutProps` 为主，保留 `TikZ` / `TikZProps`。
4. **AST 白名单**：`COMPONENT_REGISTRY` 加 `Layout`，**保留 `TikZ` 条目**作兼容入口（两者指同一组件）→ **registry 接受 18 个名字**（17 主组件 + `TikZ` 兼容别名）。
5. **parser 根组件**：验证 `parser.ts` / `convertReactNodeToIR` 是否硬编码根 === `'TikZ'`；若是，改为接受 `Layout`（也接受 `TikZ`）。
6. **system prompt 计数口径**：面向 LLM / 文档的主契约仍 **17 个组件**——只列 `Layout`，`TikZ` 作 deprecated alias **不计入** 17（中英双语把 `TikZ` 换 `Layout` + 一句 alias 注脚）。
7. **docs 全量 codemod**：171 demo + 66 mdx 机械替换 `import { TikZ }` → `{ Layout }`、`<TikZ` → `<Layout`、`</TikZ>` → `</Layout>`（脚本 node / PowerShell 正则）；**保留一页**演示 deprecated alias（`core/components/layout/` 内小节，明示 `<TikZ>` 仍可用但已弃用）。
8. **system prompt `to` 字段——分两层（与 ADR-01 对象唯一对齐）**：⚠️ 不得把字符串节点引用写进**结构化 IR / JSON 速查**（core 已删 `z.string()`，写了会诱导 LLM 生成 core 拒收的 IR）。
   - **结构化 IR / JSON 速查段**（`Step = { to: ... }`）：`to` **只列对象** `{ id, anchor?, offset? }`（节点引用）+ `[x,y]` / polar / relative / offset，**无字符串节点引用**。
   - **`retikz-tsx` JSX / Draw DSL 段**：可注明字符串 shorthand（`to="A.north"`）作 React DSL 便捷写法，由 react 层 eager 解析为对象——这是 DSL sugar，不属 IR 契约。
   - 一句话：字符串 shorthand 只活在"写 JSX / Draw way"语境；凡描述"序列化 IR / JSON 形态"处一律对象。

## 待决策点

- **alias 寿命 / codemod 工具**：`<TikZ>` alias 是否在 rc 前继续保留；是否随包提供 codemod（jscodeshift transform vs 文档给 sed / 正则片段）。rc 前再拍。
- **保留几个 TikZ 演示页**：仅 alias 演示页保留 `<TikZ>`，还是另留 1 个迁移对照页。倾向仅 1 页。

## DSL 表面

```tsx
// 主名
import { Layout } from '@retikz/react';
<Layout width={200} height={120}>
  <Node id="a">Hello</Node>
</Layout>

// 兼容别名（dev 触发一次 deprecation warning，prod 静默）
import { TikZ } from '@retikz/react';
<TikZ width={200} height={120}><Node id="a">Hello</Node></TikZ>
```

## 测试设计

`packages/react/tests/kernel/Layout-public-api.test.tsx`（原 `TikZ-public-api` 改名 + 扩）+ `packages/react/tests/kernel/tikz-alias.test.tsx`（新建，alias + warn）+ `apps/docs/tests/lib/jsx-to-ir/parser.test.ts`（扩 Layout 根 + TikZ 兼容）+ `apps/docs/tests/registry.test.ts`（计数）覆盖。具体见"实现契约 § 测试象限"。

## 影响

- `packages/react/src/kernel/TikZ.tsx` → `Layout.tsx`（重命名 + `Layout` 主名 + `TikZ` deprecated wrapper）。
- `packages/react/src/kernel/index.ts` / `packages/react/src/index.ts`：导出改 `Layout` 为主、保留 `TikZ`。
- `apps/docs/src/lib/jsx-to-ir/parser.ts`：`COMPONENT_REGISTRY` 加 `Layout`（留 `TikZ`）→ 18 名；如有硬编码根名则改。
- `apps/docs/src/layout/ai-chat/context.ts`：中英双语组件列举 `TikZ` → `Layout`（主契约 17，alias 注脚）；**结构化 IR / JSON 速查的 `to` 字段去字符串节点引用、只列对象 + 坐标形态**（与 ADR-01 对象唯一对齐，决策细节 #8）；字符串 shorthand 仅在 JSX / Draw DSL 段提及。
- `apps/docs/**/*.demo.tsx`（171）+ `apps/docs/**/*.mdx`（66 内联）：codemod `<TikZ>` → `<Layout>`。
- 文档：新增 `core/components/layout/index.{zh,en}.mdx`（Layout 主页 + "从 TikZ 迁移"小节）。
- 对外 API：`Layout` 新主名（**向后兼容**：`TikZ` 保留 deprecated alias，渲染行为零变化）。

## 不在本 ADR 范围

- **结构化 Target / Anchor 对象化**→ [ADR-01](./01-structured-target-anchor.md)（本篇只随同步改 system prompt `to` 字段与白名单中的 target 描述）。
- **`{ side, t }` 几何**→ [ADR-02](./02-side-t-edge-point.md)。
- **codemod 工具发布**：本篇只 codemod 仓库内 docs；是否随 npm 包发 codemod 给用户 → 待决策点 / rc。
- **kernel marker displayName**（`@retikz/Node` 等）：不改名，与本 ADR 无关。

---

## 实现契约（必填）

### Level

`red`

- 动 `packages/react/src/index.ts`（公开主名 `Layout` + 保留 `TikZ`）→ red
- 动 `packages/react/src/kernel/**`（TikZ.tsx → Layout.tsx + alias）→ yellow
- 动 `apps/docs/**`（白名单 / system prompt / demo / mdx）→ green
- 跨级取最高 = red（公开 API surface 改主名）；改名为 additive alias，无契约破坏

### Schema 改动

无（本 ADR 不动 IR / schema；纯 react 导出 + docs）。

### 文件 scope

- `packages/react/src/kernel/TikZ.tsx` → `packages/react/src/kernel/Layout.tsx`（重命名 + `Layout` / `TikZ` alias）
- `packages/react/src/kernel/index.ts`（修改：export 改 `./Layout`）
- `packages/react/src/index.ts`（修改：`Layout` / `LayoutProps` 主、保留 `TikZ` / `TikZProps`）
- `apps/docs/src/lib/jsx-to-ir/parser.ts`（修改：`COMPONENT_REGISTRY` + 根组件名）
- `apps/docs/src/layout/ai-chat/context.ts`（修改：组件列举 + `to` 字段对象形态）
- `apps/docs/src/contents/**/*.demo.tsx`（codemod：171 文件）
- `apps/docs/src/contents/**/*.mdx`（codemod：66 处内联）
- `apps/docs/src/contents/core/components/layout/index.{zh,en}.mdx`（新建：Layout 主页 + 迁移小节）
- `packages/react/tests/kernel/TikZ-public-api.test.tsx` → `Layout-public-api.test.tsx`（改名 + 扩）
- `packages/react/tests/kernel/tikz-alias.test.tsx`（新建）
- `apps/docs/tests/lib/jsx-to-ir/parser.test.ts`（扩：Layout 根 + TikZ 兼容）
- `apps/docs/tests/registry.test.ts`（扩：计数）

### 测试象限

#### Happy path（≥ 3）

- `layout_renders_svg`：`<Layout>` 渲染出 `<svg>` + 子 Node 的 primitive（== 旧 `<TikZ>` 输出）
- `layout_props_passthrough`：`width` / `height` / `className` / `nodeDistance` / `shapes` 透传同旧 TikZ
- `parser_layout_as_root`：`retikz-tsx` 块以 `<Layout>` 为根 → 解析出 IR
- `whitelist_accepts_layout`：`COMPONENT_REGISTRY['Layout']` 命中、`createElement` 成功

#### 边界（≥ 2）

- `tikz_alias_renders_identical`：`<TikZ>` 与 `<Layout>` 同 props 渲染快照逐字节相等
- `tikz_alias_warns_once`：多次渲染 `<TikZ>`（dev）→ `console.warn` 只触发一次（spy）
- `whitelist_18_names`：registry 含 18 名（17 主组件 + TikZ alias）

#### 错误路径（≥ 2）

- `tikz_alias_silent_in_prod`：`NODE_ENV=production` 渲染 `<TikZ>` → 不 warn、正常渲染（确定性生产静默）
- `tikz_alias_warns_when_env_undeterminable`：`NODE_ENV` 未设 / 删 `process` → fail-open 仍 warn（best-effort dev，决策细节 #1）
- `parser_unknown_root_still_errors`：非白名单根（如 `<div>`）仍抛"不支持的组件"

#### 交互（≥ 2）

- `parser_tikz_root_compat`：`retikz-tsx` 块以 `<TikZ>` 为根 → 仍解析（兼容入口）
- `system_prompt_lists_layout`：`composeSystem` 输出含 `Layout`、不把 `TikZ` 计入 17 主组件（中英双语）
- `system_prompt_ir_to_object_only`：`composeSystem` 结构化 IR / JSON 速查的 `to` 字段**不含字符串节点引用**（只对象 + 坐标；与 ADR-01 对象唯一对齐，防诱导 LLM 生成 core 拒收 IR）
- `docs_codemod_no_residual`：codemod 后 `apps/docs` 除 alias 演示页 / 兼容说明外无 `<TikZ` 残留（grep）

### 依赖的现有元素

- `packages/react/src/kernel/TikZ.tsx` 的 `TikZ` / `TikZProps` —— **重命名 / 扩展**：→ `Layout` / `LayoutProps` + `TikZ` alias
- `packages/react/src/kernel/builder.ts` 的 displayName marker —— **仅依赖、不改**：`<TikZ>` / `<Layout>` 均无 marker，builder 识别子树不受影响
- `apps/docs/src/lib/jsx-to-ir/parser.ts` 的 `COMPONENT_REGISTRY` / `convertReactNodeToIR` —— **修改**：加 Layout、留 TikZ、根名
- `apps/docs/src/layout/ai-chat/context.ts` 的 `composeSystem` 组件列举 —— **修改**：Layout 主、TikZ alias 注脚、`to` 对象形态
- `apps/docs/src/components/shared/component-preview/ComponentPreview.tsx` 的 demo glob 加载 —— **仅依赖**：demo.tsx codemod 后默认导出不变，加载机制无需改
