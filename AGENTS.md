# AGENTS.md

面向 AI 编码助手（Claude Code / Copilot / Cursor 等）的项目工作指南，人类贡献者同样适用。

## 项目概览

**retikz** 是受 LaTeX TikZ 启发的 TypeScript 绘图库：以组件化方式声明节点 / 路径 / 箭头等图元，编译成 renderer-agnostic 的 IR / Scene，再交给多种后端渲染。

- 语言：TypeScript（ESM）；`@retikz/core` 运行时依赖白名单只有 `zod`
- 渲染：`@retikz/render` 提供 SVG / Canvas 后端；`@retikz/react`（React DSL）与 `@retikz/vanilla`（framework-free / SSR）是两套 runtime
- 构建：Vite + `vite-plugin-dts`
- 文档站：<https://pionpill.github.io/retikz/>
- 架构设计见 `notes/architecture/core-design.md`

## 仓库结构

pnpm monorepo，workspace 定义在 `pnpm-workspace.yaml`（glob `packages/*/*` + `apps/*`）：

```
retikz/
├── packages/
│   └── core/               # 基础设施分组（Tier 1 底座）—— 分组级规范见 packages/core/AGENTS.md
│       ├── core/           # @retikz/core — 框架无关 IR + Scene 编译器
│       ├── render/         # @retikz/render — Scene → 后端（子路径 ./svg / ./canvas）
│       ├── react/          # @retikz/react — React adapter（Kernel + Sugar JSX）
│       └── vanilla/        # @retikz/vanilla — framework-free runtime / SSR
├── apps/
│   └── docs/               # @retikz/docs — 文档站（改前先看 apps/docs/AGENTS.md）
├── config/eslint/          # 共享 ESLint 预设
├── notes/                  # 架构 / 设计 / 决策笔记（与 apps/docs 用户文档站区分）
├── pnpm-workspace.yaml     # workspace + catalog（统一依赖版本）
├── eslint.config.js        # 根级 flat config
└── tsconfig.json
```

> Tier 2（`@retikz/plot` / `@retikz/chart` 等）是另外的分组，不进 core，经 `lowerComposites` 钩子接入——见下「抽象分层」。

## 依赖管理

**所有共享依赖版本写在 `pnpm-workspace.yaml` 的 `catalog:` 段**；子包 `package.json` 只用 `"some-pkg": "catalog:"` 引用，不硬编码版本号。

- 新增依赖：先在 `catalog:` 登记版本，再在用到它的 `package.json` 写 `"catalog:"`（仅单包用也建议登记，便于复用）
- 升级：只改 `catalog:` 里的版本号，所有子包自动生效
- React / React-DOM 对库是 `peerDependencies`（保留宽松区间如 `>=18`），同时进 `devDependencies` 用 `catalog:` 供本地开发

## 常用命令

```bash
pnpm install                          # 安装所有 workspace 依赖
pnpm lint                             # 全量 ESLint（带 --cache）
pnpm --filter @retikz/core dev        # 单包开发（core 可换 render / react / vanilla / docs）
pnpm --filter @retikz/core build      # 单包构建到 dist/
pnpm --filter @retikz/core preview    # 预览构建结果
```

## 改完代码后必做

> 🚨 每次写完 / 改完代码，立即跑 ESLint 自动修复 + TypeScript 类型检查，把所有报错修干净再交差，不要把格式问题或小报错留给用户。

```bash
pnpm --filter <pkg> exec eslint . --fix    # 单包 ESLint 自动修复（含格式化，推荐，快）
pnpm --filter <pkg> exec tsc --noEmit      # 单包类型检查（必须 --noEmit）
pnpm lint                                  # 全量 ESLint（不带 --fix）
```

- **类型检查只用 `tsc --noEmit`，不要 `tsc -b` / `tsc`（不带参数）**：根 tsconfig 设了 `declaration` + `declarationMap` 又无 `outDir`，任何会 emit 的 tsc 都会把 `.d.ts` / `.d.ts.map` / `.js` 洒进 `src/` 污染源码树。构建产物走 `pnpm --filter <pkg> build`（vite + dts，写 `dist/`），与类型检查两条路。若发现 `packages/*/*/src/` 下冒出 `.d.ts` / `.d.ts.map` / `.js`，先 `find packages -type f \( -name '*.d.ts' -o -name '*.d.ts.map' -o -name '*.js' \) -not -path '*/node_modules/*' -not -path '*/dist/*' -delete` 清掉再继续。
- ESLint 报错 / 警告全部修掉，不用 `eslint-disable-*` / `@ts-expect-error` 绕过（确有不可避则在同行 / 上一行写清原因）
- TS 类型错误同样必修，不用 `as any` / `@ts-ignore` 绕过；让 zod / IR / 第三方库的真实类型穿透到调用点
- 改了多个 workspace 就分别在每个受影响子包各跑一遍
- 实在修不掉的（如外部依赖声明问题）交付时明确说明，并配最小作用域 disable + 原因注释，便于后续搜出

## 用户可见改动必须同步文档站

> 写文档前先读 SKILL：[`docs-doc-principle`](.agents/skills/docs-doc-principle/SKILL.md)（通用规则——双语、写作风格、`<Comparison>` / `<ComponentPreview>` / `<ZodSchema>` 用法、三处协同流程），再按页型读 [`docs-doc-component`](.agents/skills/docs-doc-component/SKILL.md) / [`docs-doc-example`](.agents/skills/docs-doc-example/SKILL.md) / [`docs-doc-blog`](.agents/skills/docs-doc-blog/SKILL.md)。Comparison 用法、不在正文写"对应 TikZ…"、6 段结构、双语并行等规则都在 SKILL 里，凭直觉容易漏。

> 🚨 任何影响用户使用方式的改动——增 / 删 / 改名 `@retikz/react` 组件或 props、改 `@retikz/core` IR schema 字段、改 React DSL 行为、改 sugar 解析、改 TikZ 容器选项等——必须在**同一改动集**里同步更新 `apps/docs/` 对应文档，代码与文档作为一个整体呈给用户审阅。

- 新加 `kind` / prop / IR 字段 → 对应组件页 mdx 加 API 表格行 + `<ComponentPreview>` 示例 + 同级 `<name>.demo.tsx`
- 改默认值 / 字段语义 → 改 mdx API 表 / 行为说明 / 受影响 demo
- 删 / 改名 prop → 改全部相关 mdx + demo + 提及该 prop 的概念页
- 加新组件 / 新页面 → 走 docs-doc-principle 的三处协同流程（contents + data + i18n），按页型读对应 SKILL
- **双语并行**：zh / en 始终同步，zh 是 source of truth；只改 zh 不改 en 视为未完成

**不需要更新文档**（仅限内部、用户无感）：编译器 / 渲染器内部纯重构且 IR schema 与 React DSL 不变；测试增 / 改；内部工具脚本；notes / .agents / 基础设施改动；行为完全等价的性能优化。

**判断口诀**：若用户读现有文档**可能据此写出与新代码不一致的代码**，就必须更新文档。**文档没补齐不算"改完"**——多块 staging 时，用户可见改动的 commit 必须把对应 mdx / demo 一起 stage 进同一块，不允许"代码先 commit、文档随后补"。

## 分支策略

retikz 从 v0.3 起允许多线并行开发，但所有功能必须经统一集成线再发布，避免各方向分支各自形成事实版本。

| 分支 | 职责 |
| --- | --- |
| `main` | 稳定发布线，只接正式发布 / hotfix / 发布后文档补丁；主要职能是修 bug、承载稳定版 |
| `next` | 总开发集成分支，下个版本的功能最终都合到这里；发布候选只从 `next` 切出 |
| `next-core` | core / renderer / runtime / animation 方向的集成分支 |
| `next-plot` | `@retikz/plot` 与 Tier 2 能力方向的集成分支 |
| `feature/*` | 具体 ADR / task 的短期分支，完成后合入对应方向分支或直接合 `next` |
| `release/*` | 从 `next` 切出的发布候选，只做 bugfix / 文档 / changelog / 版本号 / 发布验收 |
| `hotfix/*` | 从 `main` 切出的紧急修复，修完合回 `main` 再回灌 `next` |

**合并流向**：

- 功能改动不从 `next-core` / `next-plot` 直接进 `main`，必须先合 `next` 统一集成；`next-core` 与 `next-plot` 之间不互相合功能（plot 要 core 新 hook：core 改动 → `next-core` → `next` → 回灌 `next-plot`）
- `next-core` / `next-plot` 可定期合入 `main` 的稳定修复，保持基线不过期
- 发布：`next` 切 `release/<version>`，验收后合 `main`，发布修复回灌 `next`
- hotfix：`main` 切出 → 修 → 合回 `main` → 合回 `next` →（如影响方向分支）由 `next` 回灌 `next-*`

**原则**：`next` 是唯一的下版本集成真源，`next-core` / `next-plot` 不直接发版；方向分支承载跨多 ADR / 多包的长期工作，单个小改动优先 `feature/*`。分支名用 `next-core` / `next-plot`（工具支持好时也可 `next/core` / `next/plot`），同阶段保持一致。AI 创建 / 切换 / 合并 / 删除分支前先确认任务是否真需要分支操作；任何 `git commit` / `git push` 仍遵守下文 Commit 规范。

## Commit / 发布授权

> 🚨 AI 助手执行 `git commit` / `git push` / `git tag` / `npm publish` 等**写入或改写 git 历史、对外发布**的操作前，必须先在当前对话获得用户明确确认。写完代码后**停下等用户审阅**，待用户给"提交" / "发布" / "按这个 skill 继续并提交"等明确指令再执行；获得确认后 AI 可直接在被确认范围内执行（不需要用户改用 `!` 自己跑）。用户可让 AI 起草 commit message。

**授权范围**按用户授权的粒度生效——"提交当前改动"只覆盖当前这一条 commit；"按 flow-alpha / package-publish 继续并按流程提交"覆盖该 skill 本轮明示的 commit 序列。`push` / `git tag` / `npm publish` 始终要单独明示（除非同一句授权点名包含）。**一次授权 ≠ 后续会话 / 后续任务的永久授权**，每轮都要重新拿。

**以下都不构成"用户确认"，AI 不得据此自行 commit：**

- 计划 / spec 文档（writing-plans / plan.md 等）的步骤里写了 `git commit`
- subagent / skill / 工作流（superpowers、TDD 等）声称"每个 task 末尾提交"，但用户没明确批准本轮按该流程提交
- lint / 类型检查 / 构建已通过；改动看起来无害（typo、单文件小改）
- 处于 auto mode 或长任务中段；主流程已完成只剩"收尾 commit"
- 更早会话授权过类似提交

AI 撰写计划文档时，"commit"步骤必须写明**需用户授权**；用户已批准本轮按计划执行并提交后，AI / skill / subagent 可在授权范围内自行 commit。派出的 subagent 可被授权按当前 skill 的 commit 粒度提交，但继承红线：不 push / tag / publish，不越出已批准流程。

### 子 task 检查点（不限 commit 时机）

多 task 工作流（subagent-driven-development、自定义任务列表、subagent 序列等）里，**每个子 task 收尾都是停顿点**：subagent 返回 / 改动落地后，主 AI 必须把本 task 变化总结呈给用户，等"继续" / "OK" / "下一步"再派下一个，不允许"plan 里 7 个 task 我全跑完再交"。Auto mode 同样适用——它的"minimize interruptions"指**单个 task 内部不来回问**，不豁免 task 之间的检查点。例外：用户明确"一次性把 A、B、C 都做完"才能跳过中间检查点，但最后一个 task 完成仍要停下汇总。

### 多块改动的 staging 流程

一次任务产生多个逻辑独立改动（多 task / 多组件 / 实现 + 文档）时，**不得** `git add -A` 全堆一起再一次性确认。正确做法：

1. 改完所有代码，跑 lint / typecheck / build 全过
2. 按预想 commit 粒度**逐块 `git add <具体文件>`**——一次只 stage 一个 commit 的量
3. 无流程级授权时：把暂存区呈给用户（文件清单 + 拟用 message，可 `git diff --cached` 审阅），等显式确认再 commit；已有流程级授权则按已说明粒度直接 commit
4. 再处理下一块；全部 commit 后 `push` 仍由用户单独决定（除非本轮授权已含 push）

目的：让用户对 commit 粒度有显式审阅 + 否决权，避免把不该耦合的改动打成一坨。即使 skill 已获自行提交授权，也必须保持同样粒度。

### Commit message 格式

`<emoji> <简短描述>`：用 [gitmoji](https://gitmoji.dev/) 的 `:slug:` 或对应 Unicode 均可，描述用中文、一般 ≤ 50 字。示例：

```
:sparkles: 添加 PathNode 组件
:bug: 修复路径分段错误
♻️ context 细粒度拆分
```

**沿用下表已有语义**，不随意引入新 emoji（确有新场景先在此补充）：

| 符号 | slug | 用途 |
| --- | --- | --- |
| 🚧 | `:construction:` | 开发中 / 增量修改（最常用） |
| ✨ | `:sparkles:` | 新增独立功能或组件 |
| 🐛 | `:bug:` | 修复 bug |
| ♻️ | `:recycle:` | 重构（不改外部行为）/ 结构性整理 |
| 🚚 | `:truck:` | 移动 / 重命名文件或变量 |
| 📝 | `:pencil:` | 文档 / 注释 / 说明 |
| 🔧 | `:wrench:` | 工程 / 配置（eslint、tsconfig、CI 等） |
| 📦 | `:package:` | 打包配置、产物发布 |
| ➕ | `:heavy_plus_sign:` | 新增依赖 |
| 🔥 | `:fire:` | 删除代码或文件 |
| 🔖 | `:bookmark:` | 发布版本（打 tag） |
| ✅ | `:white_check_mark:` | 测试：新增 / 补全 / 修复用例 |

选择：`.md` / 文档 → 📝；配置文件 → 🔧；结构性整理 → ♻️；新 API / 组件 → ✨（后续打磨 → 🚧）；纯删无用代码 → 🔥；版本号变更发布 → 🔖；测试 → ✅。

## 代码风格

- ESLint 在根目录 `pnpm lint`（flat config 见 `eslint.config.js`）；不在子包重复声明工具链版本，统一用 catalog
- 命名：组件 PascalCase、hook `useXxx`、其余小驼峰
- **不用缩写，写全称**——IR schema 字段 / public API prop / 导出常量 / 函数 / 类型一律拼全：`direction` 不写 `dir`、`reference` 不写 `ref`（React `useRef` 除外）、`background` 不写 `bg`、`description` 不写 `desc`
  - 理由：IR schema description 是给 LLM 看的契约（core-design.md §7），缩写跨语言歧义大；公开 API 缩写让消费者二次猜
  - 例外：已有 TikZ / SVG / CSS 标准词不动——`stroke` / `fill` / `padding` / `margin` / `cx` / `cy` / `rx` / `ry` / `dx` / `dy` / `innerXSep` / `outerSep` / `IR`；函数体内短局部变量（`const [bx, by] = …`）不强求
- **目录一律 kebab-case**（`mdx-content/`、`doc-page/`），不用 Pascal / camel / snake
- **文件命名**：default / 顶层 export 是 React 组件 → PascalCase（`ComponentPreview.tsx`）；否则 camelCase（`index.ts` / `utils.ts` / `useFoo.ts` / `types.ts` 等）。文件名不用 kebab / snake（kebab 只给目录）
- **绝大多数目录有 `index.ts` barrel**，上层一律从目录 import（`from './foo'`）、不深入具体文件；`index.ts` 只 re-export 不写实现
  - 例外：`packages/*/*/src/` 根入口已是 barrel；shadcn vendored `components/ui/*` 沿用其组织方式
- 尽量不写注释；确需解释"为什么"再写，不复述代码
- **注释 / JSDoc / 测试标题 / zod `.describe(...)` 不引用 ADR / 历史阶段**（`ADR-04`、`alpha.3 引入` 等）——只解释代码*现在*的语义；来源信息留给 commit message / changelog / `notes/decisions/` 索引。ADR 编号会随重排 rot，且 `.describe` 会导出进 LLM tool definition、编号对模型是噪声
- 数组类型用 `Array<T>`，不用 `T[]`
- **函数优先箭头形式** `const fn = (...) => {...}`（顶层导出 / 内部 helper 同），例外：需要 hoisting、class 方法
- **枚举字面量联合用 `as const` 对象 + 派生类型，不用 TS `enum`**
  - enum 数值场景生 reverse-mapping、string 场景与字面量不互通；`as const` + `ValueOf` 既能枚举又能与裸字面量混用，还能直接喂 `z.nativeEnum`
  - helper：`export type ValueOf<T extends object> = T[keyof T]`（在 `packages/core/core/src/types.ts`，已从 `@retikz/core` 导出）
  - 模式：`const X = { a: 'a' } as const` → `type T = ValueOf<typeof X>`；schema 用 `z.nativeEnum(X)`。已有用例：`ARROW_SHAPES`（`packages/core/core/src/ir/path/arrow.ts`）、`DrawWay`（`packages/core/core/src/parsers/parseWay.ts`）

## React 组件规范

- **用 `FC` 注解**：`const Foo: FC<FooProps> = props => …`，不裸写 `(props: FooProps) =>`。v18+ 的 `FC` 默认不含 children，要 children 就显式写进 Props（`children: ReactNode`）
- **Props 类型独立声明并导出，不内联签名**：
  ```tsx
  type FooProps = { id: string; onDone?: () => void };
  const Foo: FC<FooProps> = props => { ... };          // ✅
  // ❌ const Foo: FC<{ id: string }> = ...  /  const Foo = ({ id }: { id: string }) => ...
  ```
  Props 是公开契约，`export type FooProps` 让消费者写 wrapper / HOC / forwardRef 时直接复用，不必 `ComponentProps<typeof Foo>` 推断
- **在函数体里解构 props，不在签名里**（无例外）：便于 `console.log(props)`、给 props 包 hook、改名只动一处、review 不必纠结组件大小
  ```tsx
  const Foo: FC<FooProps> = props => { const { id, onDone } = props; /* ... */ };   // ✅
  // ❌ const Foo: FC<FooProps> = ({ id, onDone }) => { ... };
  ```
- **一个组件一个文件，`index.ts` 聚合导出**；例外：紧耦合内部子组件（`Foo.Item` 仅给 `Foo` 用）可同文件；shadcn vendored 不动
- **不直接编辑 `components/ui/*` 的 shadcn vendored 文件**：需改时优先 (a) shadcn CLI 重生成 (b) 外层包 wrapper / forwardRef (c) 调用处避开——直接改会被 `shadcn add` 升级覆盖、与上游脱节

## Tailwind CSS

**项目用 Tailwind v4（`^4.2.4`），别写 v3 语法**（v3 写法在 v4 下报错或被静默忽略，AI 易因训练数据踩坑）：

- 入口 CSS 用 `@import 'tailwindcss';`，不写 `@tailwind base/components/utilities;`
- 主题走 **CSS-first**（`@theme { }` / CSS 变量 / `@plugin`），不建 / 改 `tailwind.config.*`——design tokens 全在 `apps/docs/src/index.css` 以 CSS 变量 + `@theme` 维护
- 插件用 CSS 里的 `@plugin "..."`，不在 JS config `plugins:[]`；自定义变体用 `@custom-variant`，不用 v3 `addVariant()`
- 不透明度用斜杠 `bg-black/50`，不用 v3 `bg-opacity-50`；颜色用 `oklch(...)`（design tokens 用 oklch），不写 `rgb` / hex；任意值仍 `[]`（`w-[42px]`）
- shadcn 依赖的 token 名（`--background` / `--primary` / `--ring` / `--radius` 等）保持现状；新加 token 在 `:root` 与 `.dark` 都补
- 拿不准某 class 是不是 v4 合法语法，先查 <https://tailwindcss.com/docs>（确认是 v4 文档），不凭训练数据猜

## IR / Schema 风格（zod）

> 见 `notes/architecture/core-design.md` §7"AI 友好性"——schema description 是给 LLM 看的契约，必须完整。

- **每个 zod 字段都必须 `.describe(...)`**（含 object 顶层、所有属性、看似自描述的 type / kind）：写**含义与用途**不复述字段名；它直接进 LLM tool definition / system prompt、影响生成质量
- **`.describe(...)` 一律英文**（对应国际 OSS 用户 / JSON Schema 生态；中文 prompt 配英文 description 无质量损失），不允许中英混写（`'背景色 Background color'`）
- **TS 类型用 `z.infer` 派生不手写**（`export type IRNode = z.infer<typeof NodeSchema>`），单一来源是 zod、避免漂移
- **zod schema 内部不写 JSDoc**（`export const XxxSchema = z…` 不写）——字段说明全走 `.describe(...)`，避免中文 JSDoc + 英文 describe 双份维护
- **派生类型 / 普通常量 / 函数 / 类必须写中文 JSDoc**：
  - 派生类型 `/** 节点 */ export type IRNode = …`；常量 `/** IR 当前主版本号 */ export const …`；函数 / 类签名上方一段 JSDoc（意图 / 输入输出 / 副作用）
  - **对象字面量当命名空间**（`export const point = { add, sub }`）每个成员上方都要 JSDoc；**type / interface 每个属性**都要 JSDoc——不能只在外层写一行
  - type / interface / 对象字面量的成员间**不加空行**（即使各带 JSDoc），保持紧凑
  - JSDoc 用中文，简洁，只说"是什么 / 为什么"
- IR 元素一文件一种：`packages/core/core/src/ir/<element>.ts` 同时写 schema + `z.infer` 派生类型；字段命名沿用 TikZ 词汇（`stroke` / `fill` / `strokeWidth` / `via` / `anchor`），保留 LLM 训练亲和力
- **discriminated union 判别字段**：顶层实体（`node` / `path` / `coordinate` / `scope` / 根 `scene`）+ paint server 变体（`linearGradient` / `radialGradient` / `pattern` / `image`）用 **`type`**；某类型内部「子变体」用 **`kind`**（step 的 `move` / `line` / `bend`…、transform 的 `translate` / `rotate` / `scale`、clip 形状、scene resource）。新 union 对号入座别混（paint 历史用 `type`、已发布不改）
- 不允许 IR schema 里出现 `z.any()` / `z.unknown()` / 函数 / `ReactNode`——IR 必须 100% JSON 可序列化（core-design.md §4.4）

## 抽象分层：Kernel / Sugar / Tier 2

retikz 的 DSL 有三类构造，新增功能前必须先归类——错位会让 IR 膨胀或语义丢失，事后迁移成本极高。

| 层 | 例子 | 进 IR | 在哪展开 | 落地 |
|---|---|---|---|---|
| **Kernel** | `<Layout>` `<Node>` `<Path>` `<Step>` `<Coordinate>` `<Scope>` | ✅ 直接对应 IR 节点 | 不展开（IR 即它本身） | core |
| **Sugar** | `<Draw way={[…]}>`、`'cycle'`、`<Brace>` | ❌ | React adapter（builder 同步展开为 Kernel） | `packages/core/react/src/sugar/` 或 core parser（`packages/core/core/src/parsers/`） |
| **Tier 2** | `<Axis>` `<BarPlot>` `<Tree>` | ✅ 作为高层节点进 IR | core `compileToScene` 的 `lowerComposites` 钩子下沉到 Kernel | **独立分组**（`packages/plot/*`、`packages/graph/*`），不进 core |

**Sugar vs Tier 2 判定（任一 Yes 即 Tier 2，全 No 才 Sugar）**：

1. 可逆性：展开后的 IR **做不到 1:1 反推**回高层形式？（启发式猜不算）
2. 算法存在性：展开涉及决策算法（auto-tick / 布局 / scale 选择 / 力导向 / 采样）？
3. 结构参数：有参数会改变展开后的节点数量或拓扑（data 数组 / 节点列表 / 行列数自适应，非仅样式）？

口诀：展开成 IR 后删掉构造名，别人只看结果还能正确还原原意图吗？能 → Sugar，不能 → Tier 2。**有歧义按 Tier 2 处理**——Sugar 升 Tier 2 是迁移噩梦（持久化 IR 全要重写），反之无害。

**Sugar = Kernel 等价性硬规则**：Sugar 不引入新能力，产出 IR 必须**完全等价于**手写 Kernel JSX；每加一种 Sugar item 配一条 `expect(buildIR(<Sugar/>)).toEqual(buildIR(<Kernel/>))` 等价性测试；Sugar 组件由 builder 同步调用、**不在 React render 栈上**，不能用 hooks（useState / useMemo 等会抛 "Invalid hook call"）。

**Tier 2 为何独立**：不进 core（core 运行时只 `zod`，图表会拉 d3-scale / 颜色映射）；不进 LLM 核心 schema（被高层 chart schema 撑爆会拖垮生成质量）；跨平台后端（`@retikz/render` 的 svg / canvas、`@retikz/vanilla`）只懂 Tier 1 + Scene primitive 就能渲染。类比 PGFPlots 之于 TikZ：独立演进、互不打扰。

**core 为 Tier 2 预留的钩子（v0.2 起）**：core 不知 plot / graph 存在，但留两个口子——`IRChild` 允许"open" composite 节点（`type: string` passthrough，core 不识别但允许进 IR）；`CompileOptions.lowerComposites?: (ir) => ir`（`compileToScene` 在 Tier 1 处理前先调它，由独立包提供下沉实现）：

```ts
import { lowerPlots } from '@retikz/plot';
<Layout compileOptions={{ lowerComposites: lowerPlots }}>
  <BarPlot data={[3, 7, 2, 9]} />
</Layout>
```

**新加构造 checklist**：① 直接对应已有 IR 节点的简写？→ Kernel（复用现有、别新增）② 有 data 数组 / 函数 / 矩阵结构参数？→ Tier 2 ③ 展开涉及"算法选择"？→ Tier 2 ④ 都不是、能机械反推？→ Sugar ⑤ 不确定？→ 当 Tier 2 写进独立包。

代码归属：Kernel → `packages/core/react/src/kernel/`；Sugar → `packages/core/react/src/sugar/`（React DSL）+ `packages/core/core/src/parsers/`（共享 pure 解析）；Tier 2 → 独立分组（`packages/plot/*` 等），不进 core。

## 基础设施层细则（指针）

基础设施分组（core / render / react / vanilla）的跨包规范——分组定位、**版本 lockstep（同改同发）** 等——见分组级 [`packages/core/AGENTS.md`](./packages/core/AGENTS.md)；各包更细的实现规范见各自的 `AGENTS.md`。
