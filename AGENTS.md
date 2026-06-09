# AGENTS.md

面向 AI 编码助手和人类贡献者的全仓工作指南。根文件只放全仓硬规则；子包细则看就近 `AGENTS.md`，文档写作细则看 `.agents/skills/*`。

## 项目概览

retikz 是受 LaTeX TikZ 启发的 TypeScript 绘图库：用组件 / JSON IR 描述节点、路径、箭头等图元，编译成 renderer-agnostic 的 Scene，再交给 SVG / Canvas 等后端渲染。

- Monorepo：pnpm workspace，glob 为 `packages/*/*` + `apps/*`
- Tier 1：`packages/core/{core,render,react,vanilla}`
- Tier 2：`packages/plot/{plot,react,vanilla}`，通过 core 的 composite / lowering 能力接入
- 文档站：`apps/docs`，线上 <https://pionpill.github.io/retikz/>
- 架构背景：`notes/architecture/core-design.md`

## 设计原则

以下原则优先级高于局部实现偏好、短期开发便利和单个功能的临时诉求；设计 / review / 实现时必须先满足这些原则，再讨论具体代码形态。

- 上层包的底层能力必须源自 `@retikz/core`。React / Vanilla / Plot / Docs demo 等可以通过 adapter、sugar、composite、lowering、renderer 扩展来增强表达力，但不要绕开 core 另造一套平行能力、平行 IR 或平行渲染语义。
- 框架与功能设计优先做抽象设计，而不是只补当前单一场景。遇到具体需求时，先识别它背后的通用模型、边界和可扩展点；若确实只能局部处理，必须说明为什么不抽象。
- 后续发现既有设计有问题或需要架构调整时，以当前能判断的最优方案为准，先修正设计与架构方向，再评估兼容性、迁移成本和版本节奏；兼容性是重要约束，但不应压过正确设计。
- 因排期、风险控制或版本冻结等原因采用临时设计时，必须在代码 / ADR / notes 中备注原因、影响范围和后续替换方向，并同步写入对应版本设计文档的 roadmap，避免临时方案沉没成长期事实。

## 依赖与命令

共享依赖版本统一写在 `pnpm-workspace.yaml` 的 `catalog:` 段；子包 `package.json` 用 `"catalog:"`，不要硬编码重复版本。React / React-DOM 对库是 peerDependencies，同时作为 devDependencies 走 catalog 供本地开发。

常用命令：

```bash
pnpm install
pnpm lint
pnpm --filter @retikz/core build
pnpm dev:docs
```

改完代码后必须按受影响 workspace 跑：

```bash
pnpm --filter <pkg> exec eslint . --fix
pnpm --filter <pkg> exec tsc --noEmit
pnpm lint
```

类型检查只用 `tsc --noEmit`。不要运行会 emit 的 `tsc` / `tsc -b`，根 tsconfig 会把 `.js` / `.d.ts` / `.d.ts.map` 洒进 `src/`。若已污染，清掉源码树下生成物后再继续。

ESLint / TS 报错都要修干净；不要用 `eslint-disable`、`@ts-ignore`、`as any` 绕过，确实不可避时必须写最小作用域和原因。

## 文档同步

用户可见改动必须同步 `apps/docs`，并与代码作为同一改动集提交：新增 / 删除 / 改名 public API、React props、IR schema 字段、DSL 行为、renderer 使用方式、默认值语义等都算用户可见。

文档规则：

- 写文档前读 `docs-doc-principle` skill；组件页 / 示例页 / blog / 分组页再按页型读对应 skill
- zh / en 必须同步，zh 是 source of truth
- 新 prop / IR 字段要更新 API 表、说明和必要 demo
- 新页面要同步 contents + data + i18n

不需要同步文档：内部等价重构、测试、工具脚本、notes / `.agents`、不影响 IR schema 或公开 DSL 的性能优化。

判断口诀：如果用户按现有文档会写出与新代码不一致的代码，就必须更新文档。

## Git 与发布授权

AI 执行 `git commit` / `git push` / `git tag` / `npm publish` 前，必须在当前对话拿到用户明确授权。授权按粒度生效：一次“提交当前改动”只覆盖当前 commit；push / tag / publish 始终要单独点名授权。

不算授权的情况：计划里写了 commit、skill / subagent 自称会 commit、lint/build 通过、auto mode、历史会话授权。

多块改动要分块 staging：

1. 改完并验证通过
2. 按 commit 粒度 `git add <具体文件>`
3. 无授权时展示暂存文件和拟用 message，等用户确认
4. 再处理下一块

不要 `git add -A` 把多块逻辑改动打成一坨。不要 `git reset --hard` / `git checkout --` 回滚用户改动，除非用户明确要求。

## Commit message

格式：

```text
<emoji> <scope>: <改动内容>

可选 body：为什么改、行为/API/兼容性/测试文档同步。

Refs: module=<module>; packages=<pkg...>; version=<version>; adr=<adr|->
```

subject 只写改动内容，不写 `alpha.1` / `beta` / `v0.3` / `ADR-xx` / “按 ADR 实现”。这些追溯信息放 footer。release / tag commit 例外，可以写版本：`🔖 core: 发布 v0.3.0`。

scope 取包或分组名，不带 `@retikz/`：`core` / `render` / `react` / `vanilla` / `plot` / `docs`。纯仓库工程改动可省略 scope。

常用 emoji：

| 符号 | slug | 用途 |
| --- | --- | --- |
| 🚧 | `:construction:` | 开发中 / 增量修改 |
| ✨ | `:sparkles:` | 新功能或组件 |
| 🐛 | `:bug:` | bug 修复 |
| ♻️ | `:recycle:` | 重构 |
| 🚚 | `:truck:` | 移动 / 重命名 |
| 📝 | `:pencil:` | 文档 / 注释 |
| 🔧 | `:wrench:` | 工程 / 配置 |
| 📦 | `:package:` | 打包 / 发布配置 |
| ➕ | `:heavy_plus_sign:` | 新增依赖 |
| 🔥 | `:fire:` | 删除 |
| 🔖 | `:bookmark:` | 发布版本 |
| ✅ | `:white_check_mark:` | 测试 |

示例：

```text
✨ react: 支持节点点击回调触发动画

- handler 第二参增加 context
- context.animation 支持按 id 重播动画
- SVG 走 WAAPI，Canvas 走 per-id 虚拟时钟

Refs: module=core; packages=@retikz/react,@retikz/render; version=v0.3; adr=core-12
```

## 分支策略

- `main`：稳定发布线，只接正式发布、hotfix、发布后文档补丁
- `next`：唯一的下版本集成真源，release 只从这里切
- `next-core`：core / renderer / runtime / animation 方向集成
- `next-plot`：plot / Tier 2 方向集成
- `feature/*`：具体短期任务
- `release/*`：发布候选，只做 bugfix / docs / changelog / 版本号 / 验收
- `hotfix/*`：从 main 切，修完回 main，再回灌 next

功能改动不从 `next-core` / `next-plot` 直接进 `main`，必须先合 `next`。创建 / 切换 / 合并 / 删除分支前确认任务确实需要分支操作。

## 代码风格

- TypeScript ESM；命名：组件 PascalCase、hook `useXxx`、其余 camelCase
- 目录 kebab-case；文件：React 组件 PascalCase，其余 camelCase；目录通常有只 re-export 的 `index.ts`
- 数组类型写 `Array<T>`，不用 `T[]`
- 函数优先箭头形式，例外是确实需要 hoisting / class 方法
- enum 用 `as const` 对象 + `ValueOf` 派生类型；判别 union 成员用 `z.literal(X.Member)`
- 不写无意义注释；注释 / JSDoc / 测试标题 / zod `.describe(...)` 不引用 ADR / 历史阶段

React 组件：

- 用 `FC<Props>`，Props 类型独立声明并导出
- props 在函数体内解构，不在签名里解构
- 一个组件一个文件；`components/ui/*` 是 shadcn vendored，不直接手改

Tailwind：

- 本项目用 Tailwind v4：入口 CSS 用 `@import 'tailwindcss';`
- 主题走 CSS-first（`@theme` / CSS variables / `@plugin`），不建 v3 风格 JS config
- 新 token 要补 `:root` 与 `.dark`

## IR / Schema

详细规则见 `packages/core/core/AGENTS.md`。全仓记住几条硬约束：

- IR 必须 100% JSON 可序列化，禁止函数 / ReactNode / class 实例
- zod schema 是单一真源，TS 类型用 `z.infer`
- schema 字段 `.describe(...)` 用英文，描述含义和用途
- IR schema 内不写 JSDoc；派生类型、常量、函数、类写中文 JSDoc
- 顶层实体判别字段用 `type`，内部子变体用 `kind`

## 抽象分层

新增 DSL / IR 能力前先归类：

| 层 | 例子 | 进 IR | 归属 |
| --- | --- | --- | --- |
| Kernel | `<Layout>` `<Node>` `<Path>` `<Step>` `<Coordinate>` `<Scope>` | 是 | core / react kernel |
| Sugar | `<Draw way={[...]}>`、`cycle`、简单几何便捷写法 | 否，编译期展开为 Kernel | react sugar 或 core parser |
| Tier 2 | `<Axis>` `<BarPlot>` `<Tree>` | 是，高层节点经 lowering 下沉 | 独立分组，如 plot |

Sugar vs Tier 2 判断：展开后是否无法 1:1 反推？是否涉及布局 / scale / tick / 采样等算法？参数是否会改变节点数量或关系结构？任一是，则按 Tier 2。Sugar 不引入新能力，必须与手写 Kernel IR 等价，并配等价性测试。

子组遇到 core 表达不了的通用能力，先抽象补 core，不要在子组里绕开 IR / Scene 自造平行机制。

## 子目录指针

- `apps/docs/AGENTS.md`：文档站结构、路由、MDX / demo / i18n 协作
- `packages/core/AGENTS.md`：core / render / react / vanilla 版本 lockstep 与 Tier 1 分组规则
- `packages/core/core/AGENTS.md`：IR、Scene 编译、几何、schema、registry
- `packages/core/react/AGENTS.md`：React adapter、Kernel / Sugar、renderer、hydration
