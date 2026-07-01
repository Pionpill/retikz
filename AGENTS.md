# AGENTS.md

面向 AI 编码助手和人类贡献者的全仓工作指南。根文件只放全仓硬规则；子包细则看就近 `AGENTS.md`，文档写作细则看 `.agents/skills/*`。

## 项目概览

retikz 是受 LaTeX TikZ 启发的 TypeScript 绘图库：用组件 / JSON IR 描述节点、路径、箭头等图元，编译成 renderer-agnostic 的 Scene，再交给 SVG / Canvas 等后端渲染。

- Monorepo：pnpm workspace，glob 为 `packages/*/*` + `apps/*`
- Tier 1：`packages/kernel/{core,render,react,vanilla}`；其下零依赖纯计算底座 `packages/kernel/math`（`@retikz/math`，被 core 依赖、同 core 组 lockstep）
- Tier 2：`packages/graph/{plot,plot-react,plot-vanilla}`，通过 core 的 composite / lowering 能力接入
- 文档站：`apps/docs`，线上 <https://pionpill.github.io/retikz/>
- 架构背景：`notes/architecture/core-design.md`

## 设计原则

以下原则优先级高于局部实现偏好、短期开发便利和单个功能的临时诉求；设计 / review / 实现时必须先满足这些原则，再讨论具体代码形态。

- 上层包的底层能力必须源自 `@retikz/core`。React / Vanilla / Plot / Docs demo 等可以通过 adapter、sugar、composite、lowering、renderer 扩展来增强表达力，但不要绕开 core 另造一套平行能力、平行 IR 或平行渲染语义。
- 功能设计的首要路径是先抽象 Definition / registry / capability contract，再实现内置能力，并让扩展能力复用同一套注册、解析和消费逻辑。不要让内置实现享有一套私有白名单或特殊入口、扩展实现再走另一套补丁接口；应由 `XxxDefinition` 这类定义对象声明 schema、能力和解析结果，内置与自定义只是在同一机制下注册的不同 definition。
- 涉及新增 / 重命名 / 重构 define-registry 能力（`XxxDefinition`、`defineXxx`、`providers/*`、`BUILTIN_*`、`AnyXxxDefinition`、`CompileOptions.*`、plot lowering options 等）前，必须先读 `.agents/skills/standard-define-registry/SKILL.md`，按其中准则确定开放式扩展模型、文件分层、schema discriminator、definition、registry、内置集合和 option 字段命名；不要沿用历史裸名（如 `Boundary`）作为新范式。
- 框架与功能设计优先做抽象设计，而不是只补当前单一场景。遇到具体需求时，先识别它背后的通用模型、边界和可扩展点；若确实只能局部处理，必须说明为什么不抽象。
- 后续发现既有设计有问题或需要架构调整时，以当前能判断的最优方案为准，先修正设计与架构方向，再评估兼容性、迁移成本和版本节奏；兼容性是重要约束，但不应压过正确设计。
- `0.x` 版本代表早期开发版，公开 API / schema / 命名 / 架构仍处于设计收敛期；本阶段调整以正确设计为准，不为兼容旧写法保留别名、桥接或迁移负担，除非当次版本设计文档明确要求。
- 因排期、风险控制或版本冻结等原因采用临时设计时，必须在代码 / ADR / notes 中备注原因、影响范围和后续替换方向，并同步写入对应版本设计文档的 roadmap，避免临时方案沉没成长期事实。

## 文件编码

仓库内所有文本文件统一使用 UTF-8 编码读写，不使用操作系统默认编码、ANSI / GBK / locale code page 等隐式编码。PowerShell、脚本或编辑器写文件时必须显式指定 UTF-8，避免中文文档、注释、JSDoc、MDX、skill 内容被错误编码破坏。

## 依赖与命令

共享依赖版本统一写在 `pnpm-workspace.yaml` 的 `catalog:` 段；子包 `package.json` 用 `"catalog:"`，不要硬编码重复版本。React / React-DOM 对库是 peerDependencies，同时作为 devDependencies 走 catalog 供本地开发。

常用命令：

```bash
pnpm install
pnpm lint # 全仓 lint，发布 / CI / 明确要求全量验证时使用
pnpm --filter @retikz/core build
pnpm dev:docs
```

改完代码后默认只按当前 / 受影响 workspace 跑脚本；不要为了日常局部改动直接跑全仓 `pnpm lint` / `pnpm test` / `pnpm -r exec tsc --noEmit`。跨包公共契约、发布前、CI 复现或用户明确要求全量验证时，才扩大到全仓或发布组。

```bash
pnpm --filter <pkg> exec eslint . --fix
pnpm --filter <pkg> exec tsc --noEmit
pnpm --filter <pkg> exec vitest run
```

多个受影响模块用多条 `--filter` 命令显式列出，例如：

```bash
pnpm --filter @retikz/core exec tsc --noEmit
pnpm --filter @retikz/react exec tsc --noEmit
pnpm --filter @retikz/docs exec tsc --noEmit
```

验证按改动类型选择：

- 改 `*.ts` / `*.tsx` / `*.json` / 配置文件等结构化文件：先跑受影响包的 `eslint --fix`，再跑对应包的 `tsc --noEmit` / 测试；测试也用 `pnpm --filter <pkg> exec vitest run [test-file]` 限定在当前模块。
- 只改纯文档正文（例如 `index.zh.mdx` / `index.en.mdx` 的段落、表格、站内链接，不改 import、demo、data、i18n、sidebar、schema registry）：不强制跑 eslint / tsc；至少跑 `git diff --check`，并验证新增或修改的关键链接 / 页面可访问。
- 改 docs demo / data / i18n / sidebar / schema registry / MDX import：按 `apps/docs/AGENTS.md` 和 `docs-doc-principle` 的分级规则验证，通常需要 docs 包类型检查。

改完**结构化文件**（含 AI / subagent 用 Write / Edit 直接写入的 `.ts` / `.tsx` / `.json` / 配置等）要先跑 `eslint --fix` 规范化再提交：手写 / 工具写入的内容常不符合仓库格式（缩进、import 排序、对象多行展开等），**禁止提交未经 eslint 格式化的结构化文件**。纯 MDX 正文文案以 `git diff --check` 和页面 / 链接验证为主。

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
Control: <human-directed|llm-autonomous>
```

subject 只写改动内容，不写 `alpha.1` / `beta` / `v0.3` / `ADR-xx` / “按 ADR 实现”。这些追溯信息放 footer。release / tag commit 例外，可以写版本：`🔖 core: 发布 v0.3.0`。

`Control` 用于区分提交控制方式：`human-directed` 表示人工 review 后指定具体修改，LLM 按精确指令修改并在授权后提交；`llm-autonomous` 表示 LLM 在已获批准的批量 / 流程 / 自动执行中自行推进、拆分、修改并提交。不要用它替代 Git author / committer。

scope 取包或分组名，不带 `@retikz/`：`core` / `render` / `react` / `vanilla` / `plot` / `docs`。纯仓库工程改动可省略 scope。

常用 emoji：

| 符号 | slug                 | 用途              |
| ---- | -------------------- | ----------------- |
| 🚧   | `:construction:`     | 开发中 / 增量修改 |
| ✨   | `:sparkles:`         | 新功能或组件      |
| 🐛   | `:bug:`              | bug 修复          |
| ♻️   | `:recycle:`          | 重构              |
| 🚚   | `:truck:`            | 移动 / 重命名     |
| 📝   | `:pencil:`           | 文档 / 注释       |
| 🔧   | `:wrench:`           | 工程 / 配置       |
| 📦   | `:package:`          | 打包 / 发布配置   |
| ➕   | `:heavy_plus_sign:`  | 新增依赖          |
| 🔥   | `:fire:`             | 删除              |
| 🔖   | `:bookmark:`         | 发布版本          |
| ✅   | `:white_check_mark:` | 测试              |

示例：

```text
✨ react: 支持节点点击回调触发动画

- handler 第二参增加 context
- context.animation 支持按 id 重播动画
- SVG 走 WAAPI，Canvas 走 per-id 虚拟时钟

Refs: module=core; packages=@retikz/react,@retikz/render; version=v0.3; adr=core-12
Control: human-directed
```

## 分支策略

- `main`：稳定发布线，只接正式发布、hotfix、发布后文档补丁
- `next`：唯一的下版本集成真源，release 只从这里切
- `next-kernel`：kernel / renderer / runtime / animation 方向集成
- `next-graph`：graph / Tier 2 方向集成
- `feature/*`：具体短期任务
- `release/*`：发布候选，只做 bugfix / docs / changelog / 版本号 / 验收
- `hotfix/*`：从 main 切，修完回 main，再回灌 next

功能改动不从 `next-kernel` / `next-graph` 直接进 `main`，必须先合 `next`。创建 / 切换 / 合并 / 删除分支前确认任务确实需要分支操作。

分支同步由 GitHub Actions 自动开 PR，不手动静默合并：

- `main` push 后自动创建 `main -> next` 同步 PR
- `next` push 后自动创建 `next -> next-kernel` 与 `next -> next-graph` 同步 PR
- 已有同向开放 PR 或源分支无新增提交时跳过
- 冲突、CI 失败、是否合并均在 PR 中处理，不由 automation 直接强推目标分支

## 代码风格

- TypeScript ESM；命名：组件 PascalCase、hook `useXxx`、其余 camelCase
- 组件 / 类文件可用 PascalCase；其他文件和文件夹统一 kebab-case（短横线），目录通常有只 re-export 的 `index.ts`
- `index.ts` 作为 barrel 时，绝大多数情况下采用 `export * from './xxx'` 形式；只有需要限制公共导出面、重命名导出、跨目录精选再导出或避免导出冲突时，才使用 `export { xxx } from './xxx'` / `export type { Xxx } from './xxx'`
- 数组类型写 `Array<T>`，不用 `T[]`
- 函数优先箭头形式，例外是确实需要 hoisting / class 方法
- enum 用 const object enum：`as const` 对象 + `ValueOf` 派生类型；value object 用单数 PascalCase，例如 `export const CompassAnchor = {...} as const`，成员 key 用大驼峰；派生类型加 `Value` 后缀避免 ESLint `no-redeclare`，例如 `export type CompassAnchorValue = ValueOf<typeof CompassAnchor>`；schema 枚举字段用 `z.enum(X)`（不用已弃用的 `z.nativeEnum`）；判别 union 成员用 `z.literal(X.Member)`
- 不写无意义注释；注释 / JSDoc / 测试标题 / zod `.describe(...)` 不引用 ADR / 历史阶段
- 类型 / interface / 对象字面量的 JSDoc 不要在整体说明里枚举属性含义；能写在属性上的说明必须下沉到属性 JSDoc。只有函数签名、回调协议、互斥组合等无法附着到单个属性上的规则，才放在整体 `@description` / `@remarks`

React 组件：

- 用 `FC<Props>`，Props 类型独立声明并导出
- props 在函数体内解构，不在签名里解构
- 一个组件一个文件；`components/ui/*` 是 shadcn vendored，不直接手改

Tailwind：

- 本项目用 Tailwind v4：入口 CSS 用 `@import 'tailwindcss';`
- 主题走 CSS-first（`@theme` / CSS variables / `@plugin`），不建 v3 风格 JS config
- 新 token 要补 `:root` 与 `.dark`

## IR / Schema

详细规则见 `packages/kernel/core/AGENTS.md`。全仓记住几条硬约束：

- IR 必须 100% JSON 可序列化，禁止函数 / ReactNode / class 实例
- 涉及新增 / 重命名 / 重构 Zod / IR schema、schema 派生类型、schema 字段顺序、`.superRefine(...)`、schema registry 文档或 schema 行为测试前，必须先读 `.agents/skills/standard-schema/SKILL.md`，按其中准则确定 schema 分层、字段顺序、BaseSchema + refinement、describe / JSDoc 和同步范围。
- zod schema 是单一真源，TS 类型用 `z.infer`
- 由 IR schema object 推导出的公开数据类型命名为 `IRXxx`（例如 `IRFont`、`IRPaintSpec`、`IRDropShadow`）；由 const object enum + `ValueOf` 推导出的取值 union 命名为 `XxxValue`（例如 `BlendModeValue`、`ShadowPresetValue`），不加 `IR`；Definition / registry contract 类型按 `XxxDefinition`，也不加 `IR`
- schema 字段 `.describe(...)` 用英文，描述含义和用途
- schema `.describe(...)` 面向 LLM / schema registry 准确识别 IR 契约，保持简洁干练；优先说明字段含义、允许值 / custom 扩展、默认值、compile/runtime 边界；避免重复 schema 已表达的约束，避免 SSR / IntersectionObserver / WAAPI / hydration / 具体 renderer 策略等场景化或后端实现细节，除非该细节本身就是字段契约
- IR schema 文件里的 schema 常量一般不写 JSDoc，schema 说明统一看字段级 / 对象级 zod `.describe(...)`；派生类型、非 schema 常量、函数、类写中文 JSDoc
- 顶层实体判别字段用 `type`，内部子变体用 `kind`

## 抽象分层

新增 DSL / IR 能力前先归类：

| 层     | 例子                                                           | 进 IR                        | 归属                       |
| ------ | -------------------------------------------------------------- | ---------------------------- | -------------------------- |
| Kernel | `<Layout>` `<Node>` `<Path>` `<Step>` `<Coordinate>` `<Scope>` | 是                           | core / react kernel        |
| Sugar  | `<Draw way={[...]}>`、`cycle`、简单几何便捷写法                | 否，编译期展开为 Kernel      | react sugar 或 core parser |
| Tier 2 | `<Axis>` `<BarPlot>` `<Tree>`                                  | 是，高层节点经 lowering 下沉 | 独立分组，如 plot          |

Sugar vs Tier 2 判断：展开后是否无法 1:1 反推？是否涉及布局 / scale / tick / 采样等算法？参数是否会改变节点数量或关系结构？任一是，则按 Tier 2。Sugar 不引入新能力，必须与手写 Kernel IR 等价，并配等价性测试。

子组遇到 core 表达不了的通用能力，先抽象补 core，不要在子组里绕开 IR / Scene 自造平行机制。

## 子目录指针

- `apps/docs/AGENTS.md`：文档站结构、路由、MDX / demo / i18n 协作
- `packages/kernel/AGENTS.md`：math / core / render / react / vanilla 版本 lockstep 与 Tier 1 分组规则
- `packages/kernel/core/AGENTS.md`：IR、Scene 编译、几何、schema、registry
- `packages/kernel/react/AGENTS.md`：React adapter、Kernel / Sugar、renderer、hydration
