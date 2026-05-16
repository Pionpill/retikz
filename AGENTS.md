# AGENTS.md

面向 AI 编码助手（Claude Code / Copilot / Cursor 等）的项目工作指南。人类贡献者同样适用。

## 项目概览

**retikz** 是一个基于 React 与 D3 的绘图库，灵感来自 LaTeX 的 TikZ，用于以组件化的方式声明节点、路径、箭头等图元。

- 语言：TypeScript（ESM）
- 运行时：React ≥ 18
- 构建：Vite + `vite-plugin-dts`
- 文档站：<https://pionpill.github.io/retikz.doc/>

## 仓库结构

这是一个 pnpm monorepo，workspace 定义在 `pnpm-workspace.yaml`：

```
retikz/
├── packages/
│   ├── core/           # @retikz/core — v0.1 alpha 框架无关 IR + Scene 编译器
│   └── react/          # @retikz/react — React adapter（Kernel + Sugar JSX）
├── apps/
│   └── docs/           # @retikz/docs — 文档站点（修改前先看 apps/docs/AGENTS.md；写文档另见 .agents/skills/docs-doc-write/SKILL.md）
├── config/
│   └── eslint/         # 共享的 ESLint 预设
├── notes/              # 项目内部架构 / 设计 / 分析笔记（含 agent specs；与 apps/docs 用户文档站点区分）
├── pnpm-workspace.yaml # workspace + catalog（统一依赖版本）
├── eslint.config.js    # 根级 flat config
└── tsconfig.json
```

v0.1 alpha 在 `next` 分支上发布中。架构设计见 `notes/architecture/DESIGN.md`。

## 依赖管理

**所有共享依赖的版本都写在 `pnpm-workspace.yaml` 的 `catalog:` 段。** 子包 `package.json` 中只使用 `"some-pkg": "catalog:"` 引用，不要硬编码版本号。

- 新增依赖：先在 `pnpm-workspace.yaml` 的 `catalog:` 中登记版本，再在需要它的 `package.json` 里写 `"catalog:"`
- 升级版本：只改 `catalog:` 中的版本号，所有子包自动生效
- 某个包仅被单个子包使用，也建议登记到 catalog，便于后续复用
- React / React-DOM 对库来说是 `peerDependencies`（保留宽松区间如 `>=18`），同时放进 `devDependencies` 用 `catalog:` 供本地开发

## 常用命令

根目录：

```bash
pnpm install                         # 安装所有 workspace 依赖
pnpm lint                            # ESLint 全量（带 --cache）
```

子包（示例：core）：

```bash
pnpm --filter @retikz/core dev       # 启动开发
pnpm --filter @retikz/core build     # 构建产物到 dist/
pnpm --filter @retikz/core lint      # 单包 lint
pnpm --filter @retikz/core preview   # 预览构建结果
```

把 `core` 换成 `react` / `docs` 即可作用到对应子包。

## 改完代码后

> **🚨 重要规则：每次写完 / 改完代码必须立即跑 ESLint 自动修复 + TypeScript 类型检查，把所有 ESLint 报错与 TS 报错修干净再交差，不要把格式问题或小报错留给用户。**

```bash
# 单包验证（推荐，速度更快）
pnpm --filter <pkg> exec eslint . --fix    # ESLint 自动修复（含格式化）
pnpm --filter <pkg> exec tsc --noEmit      # TypeScript 类型检查（必须 --noEmit）

# 全量
pnpm lint                                  # 全部包 ESLint（不带 --fix）
```

- **类型检查只用 `tsc --noEmit`，不要用 `tsc -b` / `tsc`（不带参数）**
  - 根 `tsconfig.json` 设了 `declaration: true` + `declarationMap: true`，又没设 `outDir`——任何会 emit 的 tsc 调用都会把 `.d.ts` / `.d.ts.map` / `.js` 洒到 `src/` 同目录污染源码树
  - 真正构建产物走 `pnpm --filter <pkg> build`（vite + `vite-plugin-dts`，写到 `dist/`），跟类型检查走两条路
  - 如果发现 `packages/*/src/` 下出现了 `.d.ts` / `.d.ts.map` / `.js` 文件，先跑一遍 `find packages -type f \( -name '*.d.ts' -o -name '*.d.ts.map' -o -name '*.js' \) -not -path '*/node_modules/*' -not -path '*/dist/*' -delete` 清掉再继续工作
- ESLint 报错 / 警告必须全部修掉，不允许用 `eslint-disable-*` / `// @ts-expect-error` 绕过（除非确有不可避情况，并在同一行/上一行写清楚原因）
- TS 类型错误同样必须修，不允许用 `as any` / `@ts-ignore` 绕过；让 zod / IR / 第三方库的真实类型穿透到调用点
- 改了多个 workspace 时分别在每个受影响的子包跑一遍
- 跑出来还是修不掉的（如外部依赖声明问题）要在交付时明确说明，并配最小作用域的 disable + 原因注释，让后续可被搜出来

## 用户可见改动必须同步文档站

> **🚨 重要规则：任何会影响用户使用方式的改动——新增 / 删除 / 重命名 `@retikz/react` 组件或 props、改 `@retikz/core` IR schema 字段、改 React DSL 行为、改 sugar 解析、改 TikZ 容器选项等——都必须在同一改动集里同步更新 `apps/docs/` 下相应文档，文档与代码作为一个整体改动呈给用户审阅。**
>
> 包含但不限于：
> - 新加 `kind` / 新加 prop / 新加 IR 字段 → 在对应组件页 mdx 里加 API 表格行 + 加 `<ComponentPreview>` 示例 + 加同级 `<name>.demo.tsx`
> - 改默认值 / 改字段语义 → 改 mdx 里的 API 表 / 行为说明 / 受影响的 demo
> - 删 / 重命名 prop → 改全部相关 mdx + demo + 提及该 prop 的概念页
> - 加新组件 / 新页面 → 走 [`.agents/skills/docs-doc-write/SKILL.md`](.agents/skills/docs-doc-write/SKILL.md) 的三处协同流程（contents + data + i18n）
> - **双语并行**：zh 与 en 始终保持同步，zh 是 source of truth；只改 zh 不改 en 视为未完成
>
> **不需要更新文档的情形**（仅限内部、用户无感）：
> - 编译器 / 渲染器内部纯重构，IR schema 与 React DSL 不变
> - 测试新增 / 重写、内部工具脚本
> - notes / .agents / 仓库基础设施改动
> - 性能优化但行为完全等价
>
> 判断口诀：如果用户读现有文档**可能据此写出与新代码不一致的代码**，就必须更新文档。
>
> 与 commit 规则的耦合：**文档没补齐之前不算"改完"**——多块 staging 流程里，某个用户可见改动的 commit 必须把它对应的 mdx / demo 一起 stage 进同一块；不允许"代码先 commit、文档随后再补"。

## Commit 规范

> **🚨 重要规则：任何情况下，未经用户明确允许，AI 助手（Claude Code / Copilot / Cursor 等）都不得自行执行 `git commit` / `git push` / `git rebase` / `git reset` 等会写入或改写 git 历史的操作。本条无任何例外。**
>
> 写完代码、改完文件后**停下来等用户审阅**，由用户下达"提交"指令后再做提交。
> 用户可以让 AI 起草 commit message，但实际提交动作必须由用户授权。
>
> **以下情形仍然不得自行 commit：**
> - 计划文档（writing-plans / executing-plans / plan.md / spec.md）的步骤里写了 `git commit`
> - subagent / skill / 任意工作流（superpowers、TDD 等）声称"每个 task 末尾要提交"
> - lint / 类型检查 / 构建已通过
> - 改动看起来无害（typo 修复、单文件小改）
> - 处于 auto mode 或长任务中段
> - 用户在更早的会话授权过类似的提交（每次 commit 都要重新拿授权，**一次授权≠永久授权**）
> - 主流程已经全部完成、只剩"打个收尾 commit"
>
> 当 AI 助手撰写计划文档时，**计划里的"commit"步骤必须改写为"等待用户审阅 → 用户下令后再提交"**，不得在计划里默认 AI 自己 commit。同样，AI 派出的 subagent 不得在 prompt 里被授权提交——subagent 完成实现后必须把改动留在工作区或 stage 区，由主 AI 汇总后再交给用户审阅。
>
> ### 子 task 完成必须等用户确认（不限 commit 时机）
>
> AI 编排多 task 工作流（如 superpowers/subagent-driven-development、自定义任务列表、subagent dispatch 序列）时，**每个子 task 收尾都是停顿点**——subagent 返回报告 / 改动落地工作树后，主 AI 必须把本次 task 的变化总结呈给用户，等"继续" / "OK" / "下一步"等明确指令再派下一个 task。不允许"反正 plan 里写了 7 个 task、我全跑完再交"。
>
> Auto mode 下同样适用：auto mode 的"minimize interruptions"指的是**单个 task 内部不来回问**（不要为了小决策反复打断用户），**不豁免** task 之间的检查点。
>
> 例外：用户明确说了"一次性把 task A、B、C 都做完"或类似 explicitly-batched 指令，才能跳过中间检查点；那种情况下也要在最后一个 task 完成后停下来汇总。
>
> ### 多块改动的 staging 流程
>
> 一次任务里产生多个逻辑独立的改动（例如多个 task / 多个组件 / 实现 + 文档），AI **不得**把它们整体 `git add -A` 后等用户一次性确认所有 commit。正确做法：
>
> 1. 改完所有代码、跑完 lint / typecheck / build，全部通过
> 2. 按预想的 commit 颗粒度把改动**逐块 `git add <具体文件>`**——一次 stage **一个 commit 的内容**（不是全部一起 stage）
> 3. 把当前 stage 区呈现给用户（说明本次将 commit 的文件清单 + 拟用的 message），用户可用 `git diff --cached` 审阅
> 4. 用户**显式确认**后 AI 才执行 `git commit`；commit 完成后 stage 区自动清空
> 5. 处理下一块：再 stage、再呈现、再等确认；全部 commit 完毕由用户决定是否 push
>
> 这套流程的目的：让用户对每一次 commit 都有显式审阅 + 否决权，避免 AI 把多个不该耦合的改动打成一坨、或在用户来不及看的情况下连续提交。
>
> 对应行为：写完一段改动 → 跑 lint / typecheck / build → 总结改了什么 → 按 commit 颗粒度 stage 第一块 → **停**。等用户给"可以提交了" / "commit" / 类似明确指令再做；commit 完后再 stage 下一块再停。

**格式：`<emoji> <简短描述>`**

使用 [gitmoji](https://gitmoji.dev/) 风格的 `:slug:` 形式或对应 Unicode 表情均可，描述使用中文，一般不超过 50 字。示例：

```
:sparkles: 添加 PathNode 组件
:bug: 修复路径分段错误
:recycle: context 细粒度拆分
🚚 改为多 packages 项目管理形式，迁移代码到 core 下
```

### 本项目已使用的 emoji

下表是从 git 历史中总结出的用法，**新 commit 请沿用同一套语义**，不要引入其它 emoji（除非确有新场景且需先在此处补充说明）：

| Slug | 符号 | 用途 |
| --- | --- | --- |
| `:construction:` | 🚧 | 开发中 / 进行中的增量修改（最常用） |
| `:sparkles:` | ✨ | 新增独立功能或组件 |
| `:bug:` | 🐛 | 修复 bug |
| `:recycle:` | ♻️ | 重构（不改变外部行为） |
| `:truck:` | 🚚 | 移动或重命名文件 / 变量 |
| `:pencil:` | 📝 | 文档、注释、说明类改动 |
| `:wrench:` | 🔧 | 工程/配置文件调整（eslint、tsconfig、CI 等） |
| `:package:` | 📦 | 打包配置、产物发布相关 |
| `:heavy_plus_sign:` | ➕ | 新增依赖 |
| `:fire:` | 🔥 | 删除代码或文件 |
| `:bookmark:` | 🔖 | 发布版本（打 tag） |
| `:white_check_mark:` | ✅ | 测试相关：新增 / 补全 / 修复测试用例 |

### 选择建议

- 改了 `.md` / `apps/docs/doc/` → `:pencil:`
- 改了 `pnpm-workspace.yaml` / `eslint.config.js` / `tsconfig.json` 等 → `:wrench:`（配置）或 `:recycle:`（结构性整理）
- 新增一个 API / 组件 → `:sparkles:`；其细节打磨后续改动 → `:construction:`
- 纯删除无用代码 → `:fire:`
- 版本号变更并准备发布 → `:bookmark:`
- 加测试 / 修测试 / 补测试覆盖 → `:white_check_mark:`

## 代码风格

- ESLint 统一在根目录通过 `pnpm lint` 运行，flat config 见 `eslint.config.js`
- 不要在子包里重复声明工具链（eslint、typescript 等）的版本，统一用 catalog
- 变量/文件命名沿用现有风格：组件 PascalCase，hooks `useXxx`，工具类小驼峰
- **不用缩写命名，写全称**——IR schema 字段 / public API prop / 导出常量 / 函数名 / 类型名一律拼全：`direction` 不写 `dir`，`reference` 不写 `ref`（除非 React `useRef`），`background` 不写 `bg`，`description` 不写 `desc`
  - 理由：IR schema 描述是给 LLM 看的契约（DESIGN.md §7 AI 友好性），缩写在跨语言 / 跨上下文歧义大；公开 API 缩写让消费者要二次猜
  - 例外：项目内已有的 TikZ / SVG / CSS 标准词汇保持不动——`stroke` / `fill` / `padding` / `margin` / `cx` / `cy` / `rx` / `ry` / `dx` / `dy` / `innerXSep` / `outerSep`（TikZ `inner sep` / `outer sep` 直译）/ `IR`（项目核心术语）
  - 例外：函数体内的短局部变量（`const [bx, by] = anchor(...)`）不强求拼全，作用域小、可读性优先
  - 已有用例：alpha.4 ADR-01 把 `at.dir` 升级为 `at.direction`，对应 `LABEL_DIR_MAP` → `LABEL_DIRECTION_MAP` 等
- **目录一律 kebab-case**（小写 + 短横线，如 `mdx-content/`、`component-preview/`、`doc-page/`、`my-component/`），不用 PascalCase / camelCase / snake_case
- **文件命名**：React 组件文件用 PascalCase（`ComponentPreview.tsx`、`Foo.tsx`），其余**所有**文件一律小写（barrel `index.ts`、配置 `components.tsx`、工具 `utils.ts`、hook `use-foo.ts` 等）
  - 判定：文件 default / 顶层 export 是 React 组件 → PascalCase；否则一律小写
- **绝大多数目录都要有 `index.ts` 作为 barrel 导出**——上层调用方一律从目录路径 import（`from './foo'`），不直接深入到具体文件（`from './foo/Foo'`）
  - `index.ts` 只做 re-export，不写实现：`export { Foo } from './Foo'; export type { FooProps } from './Foo';`
  - 例外：`packages/*/src/` 根入口本身已是 barrel，单组件文件目录里若**真**只有一个文件且不会再增（罕见），可暂缓加 `index.ts`，但加了不亏
  - 例外：shadcn vendored `components/ui/*` 沿用 shadcn 自己的组织方式
- 尽量不写注释；确需解释"为什么"时再写，避免复述代码做了什么
- **注释面向结果，不要引用 ADR / 历史阶段** —— 不在源码注释 / JSDoc / 测试 `describe`/`it` 标题 / zod `.describe(...)` 里出现 `ADR-04`、`alpha.3 引入`、`见 ADR-NN` 这类**实现过程来源**；注释只解释代码*现在*的语义与意图，把"它从哪条决策来"的信息留给 commit message / changelog / `notes/adr/` 索引。源码注释一旦写上 ADR 编号，后续 ADR 重排或废弃就会让注释 rot；zod `.describe(...)` 还会被导出到 LLM tool definition，里面的 ADR 编号对模型纯噪声
- 数组类型用 `Array<T>`，不用 `T[]`（项目内统一）
- **函数定义优先用箭头形式**：`const fn = (...) => {...}` 而不是 `function fn(...) {...}`
  - 顶层导出：`export const fn = (...) => {...}`
  - 内部 helper：同上
  - 例外：需要 hoisting（在定义点之前被引用）；类方法仍按 class 语法
- **枚举型字面量联合用 const + 派生类型，不用 TS enum**
  - TS 的 `enum` 在数值场景生成 reverse-mapping 表、在 string 场景与字面量类型不互通；`as const` 对象 + `ValueOf` 派生既能枚举又能与裸字面量字符串无缝混用，**还能直接喂给 `z.nativeEnum`**
  - 通用 helper：`export type ValueOf<T extends object> = T[keyof T]`（住在 `packages/core/src/types.ts`，已从 `@retikz/core` 导出）
  - 模式：先写 `const X = { a: 'a', b: 'b' } as const`，再 `type T = ValueOf<typeof X>`；zod schema 用 `z.nativeEnum(X)`
  - 已有用例：`ARROW_SHAPES` / `ArrowShape`（`packages/core/src/ir/path/arrow.ts`）、`DrawWay` / `WayCycle` / `WayVia`（`packages/core/src/parsers/parseWay.ts`）

## React 组件规范

- **用 `FC` 注解组件**——`const Foo: FC<FooProps> = props => ...`，不裸写 `(props: FooProps) =>`
  - 让组件的"是 React 组件"这件事在类型上显式
  - 自动带上 children？v18 之后的 `FC` 默认不含 `children`；要 children 就显式写在 Props 里（`children: ReactNode`）
- **`ComponentProps` 类型独立声明，不内联在签名里**
  ```tsx
  // ✅
  type FooProps = { id: string; onDone?: () => void };
  const Foo: FC<FooProps> = ({ id, onDone }) => { ... };

  // ❌
  const Foo: FC<{ id: string; onDone?: () => void }> = ...
  const Foo = ({ id, onDone }: { id: string }) => ...
  ```
  - Props 是组件的公开契约，必须可被外部 import / 派生（`Pick<FooProps, 'id'>` 等）
  - `export type FooProps` 让消费者写 wrapper / HOC / forwardRef 时直接复用，不用 `ComponentProps<typeof Foo>` 推断
- **一个组件一个文件，多组件通过 `index.ts` 聚合导出**
  ```
  components/
    Foo/
      Foo.tsx           # 单组件实现
      Bar.tsx           # 单组件实现
      index.ts          # export { Foo } from './Foo'; export { Bar } from './Bar'
  ```
  - 例外：紧密耦合的内部子组件（如 `Foo.Item` / `FooHeader` 仅给 `Foo` 用）可在同文件
  - 例外：shadcn vendored（`components/ui/*`）按 shadcn CLI 约定，单文件多 export 不动
- **不要直接编辑 `components/ui/*` 下的 shadcn vendored 文件**
  - 这些是由 shadcn CLI 生成的，需要修补时优先：(a) 用 shadcn CLI 重新生成；(b) 在外层包一个本地 wrapper / forwardRef 适配；(c) 在调用处避开有问题的用法（不要靠改 vendored 来绕坑）
  - 直接改这些文件会让后续 `shadcn add` 升级时被覆盖，且和上游 issue / 文档脱节
- **在函数体里解构 props，不在签名里**——无例外
  ```tsx
  // ✅
  const Foo: FC<FooProps> = props => {
    const { id, onDone } = props;
    // ...
  };

  // ❌ 不论组件大小都不要这么写
  const Foo: FC<FooProps> = ({ id, onDone }) => { ... };
  ```
  - 理由：调试 / 日志时能直接 `console.log(props)`；用 hook 给 props 包一层（`useMemo(() => ..., [props])`）时不需要重新拼回去；改名 / 加字段时只动一处；统一形式让 review 不必为「这个组件够小吗」纠结

## Tailwind CSS

**项目用 Tailwind v4（`^4.2.4`），不要写 v3 语法。** v3 的写法在 v4 下会报错或被静默忽略，AI 写代码时常因训练数据偏向 v3 而踩坑，特别注意：

- **入口 CSS 用 `@import 'tailwindcss';`**——不要写 v3 的 `@tailwind base;` / `@tailwind components;` / `@tailwind utilities;`
- **主题配置走 CSS-first**（`@theme { ... }` / CSS 变量 / `@plugin`），不要新建 / 修改 `tailwind.config.js` `tailwind.config.ts`——v4 默认无 JS 配置文件，整个 design tokens 全部在 `apps/docs/src/index.css` 里以 CSS 变量 + `@theme` 维护
- **插件用 `@plugin "..."`**（在 CSS 里声明），不要在 JS config 的 `plugins: []` 里加
- **自定义变体用 `@custom-variant name (...)`**，不要走 v3 的 `addVariant()` JS API
- **不透明度用斜杠语法**：`bg-black/50`、`text-foreground/70`——不要用 v3 的 `bg-opacity-50` / `text-opacity-70`（v4 已移除）
- **颜色用现代色彩空间**：项目里 design tokens 用 `oklch(...)`，新加颜色优先 `oklch` 或 `hsl`，不要再写 `rgb(...)` / hex
- **任意值仍用 `[]`**：`w-[42px]`、`bg-[oklch(0.5_0.2_30)]`——这点 v4 沿用 v3
- **shadcn 组件依赖的 token 名**（`--background` / `--foreground` / `--primary` / `--ring` / `--radius` 等）保持现状，不要乱改；新加 token 时在 `:root` 与 `.dark` 都补一份

不确定某个 class 是不是 v4 合法语法时，先查 <https://tailwindcss.com/docs>（确认是 v4 文档而非 v3），不要凭训练数据猜。

## IR / Schema 风格（zod）

> 见 `notes/architecture/DESIGN.md` §7 "AI 友好性"——schema description 是给 LLM 看的契约，必须完整。

- **每个 zod schema 字段都必须 `.describe(...)`**——包括 object 顶层和内部所有属性，包括看似自描述的字段（type / kind 等）
  - description 写**含义与用途**，不是复述字段名
  - description 是 LLM 输出 JSON 时的关键参考，影响生成质量
  - JSON Schema 导出后这些 description 直接进 LLM tool definition / system prompt
- **`.describe(...)` 的内容统一用英文**
  - 对应外部 / 国际 OSS 用户、LLM tool definition、JSON Schema 生态工具——英文兼容性最好
  - LLM 现在跨语言映射很稳，中文 prompt 配英文 schema description 没有质量损失
  - 不允许中英混写（`'背景色 Background color'` 这种）
- **TS 类型用 `z.infer` 派生，不手写**
  - 派生类型形如 `export type IRNode = z.infer<typeof NodeSchema>`
  - 单一来源是 zod，避免类型与 schema 漂移
- **zod schema 定义内部不写 JSDoc**——schema 自身的字段说明全部走 `.describe(...)`，不在 zod 链里加 `/** */` 注释；这避免了"中文 JSDoc + 英文 describe"双份维护的冗余
- **zod 派生类型 / 普通常量 / 函数 / 类必须写中文 JSDoc**
  - 派生类型：`/** 节点 */ export type IRNode = z.infer<typeof NodeSchema>`
  - 普通常量：`/** IR 当前主版本号 */ export const CURRENT_IR_VERSION = 1 as const`
  - 导出函数：函数签名上方一段 JSDoc，说明意图、输入输出、可能的副作用
  - 类：类声明上方一段 JSDoc，主要方法也要带 JSDoc
  - **对象字面量当命名空间用时，每个成员都要 JSDoc**——例如 `export const point = { add, sub, ... }`，每个方法上方都要写 `/** ... */`，不能只在外层对象上写一行
  - **`type` / `interface` 声明的每个属性都要 JSDoc**——例如 `type Rect = { x, y, width, height }`，每个字段都要写 `/** ... */`，不能只在外层 type 上写一行
  - **type / interface / 对象字面量的成员间一律不加空行**（即使每个成员都带 JSDoc）——保持声明紧凑
  - **`export const XxxSchema = z...` 不写 JSDoc**——它的语义已经在 `.describe(...)` 里说尽
- JSDoc 内容用中文（项目母语），保持简洁；只解释"是什么 / 为什么"，不复述代码做了什么
- IR 元素一文件一种：`packages/core/src/ir/<element>.ts` 同时写 schema 和 `z.infer` 派生类型
- IR 字段命名沿用 TikZ 词汇（`stroke`、`fill`、`strokeWidth`、`via`、`anchor` 等），保留对 LLM 训练数据的亲和力
- 不允许在 IR schema 里出现 `z.any()` / `z.unknown()` / 函数 / `ReactNode`——IR 必须 100% JSON 可序列化（见 DESIGN.md §4.4）

## 抽象分层：Kernel / Sugar / Tier 2

retikz 的 DSL 表面有三类构造，新增功能前必须先归类——错位会让 IR 膨胀或语义丢失，事后迁移成本极高。

### 三类的定义

| 层 | 例子 | 是否进 IR | 在哪展开 | 进 core 还是独立包 |
|---|---|---|---|---|
| **Kernel** | `<TikZ>` `<Node>` `<Path>` `<Step>` | ✅ 直接对应 IR 节点 | 不展开（IR 就是它本身） | core |
| **Sugar** | `<Draw way={[...]}>`、`'cycle'`、`<Brace>` | ❌ | React adapter（builder 同步调用展开为 Kernel） | adapter（`packages/react/src/sugar/`）或 core 的 parser（`packages/core/src/parsers/`） |
| **Tier 2 (Composite)** | `<Axis>` `<BarPlot>` `<Tree>` `<Network>` | ✅ 作为高层节点进 IR | core 的 `compileToScene` 内部 `lowerComposites` 钩子下沉到 Kernel | **独立包**（`@retikz/plot`、`@retikz/graph` 等），不进 core |

### Sugar vs Tier 2 三条判定

**任一答 Yes 即为 Tier 2，全 No 才是 Sugar：**

1. **可逆性**：把展开后的 IR 反向推回高层形式，**做不到 1:1 还原**？（启发式猜不算）
2. **算法存在性**：展开过程涉及决策算法（auto-tick / 布局 / scale 选择 / 力导向 / 数据采样）？
3. **结构参数**：有参数会改变展开后的节点数量或拓扑（data 数组、节点列表、行列数 + 自适应等，不是仅改样式）？

**口诀**：展开成 IR 后删掉构造名字，另一个开发者只看展开结果还能正确还原原意图吗？能 → Sugar；不能 → Tier 2。

**有歧义就当 Tier 2 处理**——升级 Sugar 到 Tier 2 是迁移噩梦（持久化的 IR 全要重写），反过来则无害。

### Sugar = Kernel 等价性硬规则

- Sugar 不引入新能力——产出的 IR 必须**完全等价于**手写 Kernel JSX 的产物
- 每加一种 Sugar item 类型必须配一条 `expect(buildIR(<Sugar/>)).toEqual(buildIR(<Kernel/>))` 等价性测试
- Sugar 组件由 builder 同步调用获取 JSX，**不在 React render 调用栈上**，不能用 React hooks（useState / useMemo / useEffect 等会抛 "Invalid hook call"）

### Tier 2 在哪落地

- **不进 core**——core 运行时依赖白名单只有 `zod`，加图表会拉 d3-scale / 颜色映射等
- **不进 LLM tool definition 的核心 schema**——core 的 IR schema 是 LLM 系统提示的输入，被高层 chart schema 撑爆会拖垮生成质量
- **跨平台 adapter 不该被迫了解图表语义**——`@retikz/canvas` / `@retikz/ssr` 只懂 Tier 1 + Scene primitive 就能渲染

类比 PGFPlots 之于 TikZ：独立演进、互不打扰。

### core 为 Tier 2 预留的扩展点（v0.2 起）

core 不知道 plot/graph 存在，但留两个钩子让独立包能接：

- `IRChild` 允许"open" composite 节点（`type: string` 的 passthrough schema），core 不识别但允许进 IR
- `CompileOptions.lowerComposites?: (ir) => ir`：`compileToScene` 在 Tier 1 处理前先调用这个钩子，由独立包提供具体下沉实现

```ts
// 用法示例（v0.2+）
import { lowerPlots } from '@retikz/plot';
<TikZ compileOptions={{ lowerComposites: lowerPlots }}>
  <BarPlot data={[3, 7, 2, 9]} />
</TikZ>
```

### 新加构造时的 checklist

写代码前先回答：

1. 它直接对应已有 IR 节点（Node / Path / Step）的简写吗？→ **Kernel**（不该新增，复用现有）
2. 它有数据数组 / 函数 / 矩阵这种结构参数？→ **Tier 2**
3. 它的展开涉及任何"算法选择"？→ **Tier 2**
4. 都不是、能机械反推回原始形式？→ **Sugar**
5. 不确定？→ 当 **Tier 2** 写进独立包

### 目录归属速查

| 归类 | 代码住在哪 |
|---|---|
| Kernel 组件 | `packages/react/src/kernel/` |
| Sugar 组件 + 解析器 | `packages/react/src/sugar/`（React DSL） + `packages/core/src/parsers/`（共享 pure 解析） |
| Tier 2 IR + 下沉 + 组件 | 独立包（`packages/plot/`、`packages/graph/` 等），**不进 core** |
