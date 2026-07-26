# AGENTS.md

面向 AI 编码助手和人类贡献者的全仓工作指南。根文件只放全仓硬规则；目录细则看就近 `AGENTS.md`，长流程和页型规则按 `.agents/skills/*` 动态加载。

## 项目定位

retikz 是受 LaTeX TikZ 启发的 TypeScript 绘图库：用组件或 JSON IR 描述节点、路径、箭头、图表等图元，编译成 renderer-agnostic 的 Scene，再交给 SVG / Canvas 等后端渲染。

- Monorepo：pnpm workspace，glob 为 `packages/*/*` + `apps/*`
- Kernel 组：`packages/kernel/{math,core,render,react,vanilla,tex}`，其中 `math` 是零依赖计算底座，`tex` 是可选 LaTeX 公式接入包
- Viz 组：`packages/viz/{plot,plot-react,plot-vanilla}`，通过 core 的 composite / lowering 能力接入
- Apps：`apps/docs` 文档站，`apps/eval` 评测工具

## 设计原则

- 上层包的底层能力必须源自 `@retikz/core` 或 `@retikz/math`。React / Vanilla / Plot / Docs demo 可以通过 adapter、sugar、composite、lowering、renderer 扩展表达力，但不要绕开 core 另造平行 IR、平行渲染语义或平行几何底座。
- 新能力优先抽象 Definition / registry / capability contract，再实现内置能力。内置与自定义应复用同一套注册、解析和消费逻辑，不要拆成“内置白名单 + 扩展补丁接口”。
- 新增或改变公开能力、IR / schema、扩展契约、pipeline / lowering、Scene / manifest、跨包职责或 adapter 独有能力前，先读 `notes/architecture/capability-design.md` 和所属能力域的 completeness 文档，并在 ADR 中完成能力归属、包边界与闭环检查。纯 bugfix、文案和行为等价重构只需确认不改变能力边界。
- 上述设计还必须用 `test-contract` 把行为、可观察结果、不变量、反例与最低测试层写入 ignored 测试契约矩阵；覆盖率不能代替该矩阵。
- 包不是功能收纳桶。每个发布包必须在就近 `AGENTS.md` 明确解决的问题、拥有的契约、不拥有的能力、输入与输出及缺口流向；新增能力只有在直接服务包使命、符合输入输出边界并能形成完整闭环时才能进入。实现方便、当前代码位置或单个消费方需求不能决定长期所有权。
- 遇到具体需求时，先识别通用模型、边界和扩展点；确实只能局部处理时，在代码、ADR 或 notes 中说明不抽象的原因。
- 发现既有设计方向不佳时，以当前能判断的最优方案修正架构，再评估兼容性和版本节奏。`0.x` 阶段公开 API / schema / 命名仍可为正确设计做破坏性调整，不为旧写法保留别名或桥接，除非当次版本设计文档明确要求。
- 临时方案必须记录原因、影响范围和后续替换方向，并同步到对应 roadmap，避免沉没成长期事实。

## 动态规则

- 改文件分层、依赖方向、shared / schemas / contract / providers / pipeline / compile，或 define-registry 能力前，先读 `.agents/skills/standard-structure/SKILL.md`，再按实际层级读取 `standard-shared` / `standard-schema` / `standard-contract` / `standard-providers` / `standard-pipeline-compile`。
- 写 `apps/docs` 正文、demo、导航、i18n、schema registry 前，先读 `docs-doc-principle`；组件页 / 示例页 / 分组页 / 概念页 / blog 再读对应 docs skill。
- 大任务、批量执行、多 commit 或可能跨上下文压缩的任务先读 `.agents/skills/flow-long-task/SKILL.md`，再分流到具体 flow / develop skill。
- 发包、alpha/beta/rc 流程、跨模型评审、文档外站转换等长流程按对应 skill 执行，不把步骤复制进 AGENTS。
- 所有发布组发包前都必须按 `package-publish` 逐篇阅读全文审计本次 milestone ADR 的压缩、状态与当前公开契约；不得以状态字段、roadmap 勾选或 commit message 代替内容检查。
- 重构优先走 `.agents/skills/develop-refactor/SKILL.md`；纯审计仍走 `develop-review`。
- 问答中若发现用户新偏好、流程调整或规则适合沉淀进 `AGENTS.md` / skill，完成当前任务后主动告知并征求同意；用户不同意时不得自行修改。
- 向 `AGENTS.md` / skill 添加规则必须简洁干练，只写可执行约束，不扩写背景、不放长例子，优先节省 token。
- 对用户问题保持中立客观，优先考虑功能拓展性和抽象程度；有更好方案或质疑时先对齐讨论，只有把握 ≥ 90% 才编辑内容。

## 文件与依赖

- 文本文件统一 UTF-8 读写。PowerShell、脚本或编辑器写中文文档、JSDoc、MDX、skill 内容时必须显式指定 UTF-8。
- 共享依赖版本统一写在 `pnpm-workspace.yaml` 的 `catalog:`；子包 `package.json` 使用 `"catalog:"`，不要硬编码重复版本。
- React / React-DOM 对库包是 peerDependencies，本地开发再通过 devDependencies 走 catalog。

## 临时产物

- AI / superpower / plugin 为长任务保上下文、做临时决策、审计或计划而生成的报告和计划默认不入库。
- 这类文件放到 `.gitignore` 已覆盖的本地目录：`notes/reports/`、`notes/plans/`、任意 `**/_notes/reports/`、`**/_notes/plans/`；不要 stage / commit。
- 临时 Vitest case 只放受影响 workspace 的 `tests/_scratch/`。用 `pnpm temp:test -- --workspace <workspace-directory> --file <tests/_scratch/*.test.ts>` 运行；默认完成后自动删除，只有人工显式传 `--keep` 才保留。不要 `git add -f` 此目录。
- 如果新流程需要新的临时产物目录，先征求用户确认并补 `.gitignore`，再写入该目录。

常用命令：

```bash
pnpm install
pnpm lint # 全仓 lint，仅发布 / CI / 明确要求全量验证时使用
pnpm --filter @retikz/core build
pnpm dev:docs
```

## 验证策略

默认只验证当前或受影响 workspace；跨包公共契约、发布前、CI 复现或用户明确要求时才扩大到全仓。日常校验中，范围明确且改动较小时优先运行受影响包的 `test:changed`；仅在大范围重构或功能大改时运行受影响模块的全量测试。

```bash
pnpm exec prettier --write <changed-files-or-scope>
pnpm --filter <pkg> exec eslint . --fix
pnpm --filter <pkg> exec tsc --noEmit
pnpm --filter <pkg> test:changed
pnpm --filter <pkg> exec vitest run <test-file>
pnpm --filter <pkg> test:run # 仅大范围重构或功能大改
```

- 改完内容先用 Prettier 格式化相关文件或目录，再按改动类型继续验证。
- 改 `*.ts` / `*.tsx` / `*.json` / 配置等结构化文件：先跑受影响包 `eslint --fix`，再跑对应 `tsc --noEmit` 和必要测试。
- 只改纯 MDX 正文、表格、站内链接：先跑 Prettier，再至少跑 `git diff --check`，并验证关键链接 / 页面可访问。
- 改 docs demo / data / i18n / sidebar / schema registry / MDX import：按 `apps/docs/AGENTS.md` 和 docs skills 的分级规则验证，通常需要 docs 包类型检查。
- 类型检查只用 `tsc --noEmit`。不要在 packages 下运行会 emit 的 `tsc` / `tsc -b`；若已污染源码树，先清理生成物。
- ESLint / TS 报错要修干净。不要用 `eslint-disable`、`@ts-ignore`、`as any` 绕过；确实不可避时写最小作用域和原因。

## 文档同步

用户可见改动必须同步 `apps/docs`，并与代码作为同一改动集提交：public API、React props、IR schema 字段、DSL 行为、renderer 使用方式、默认值语义等都算用户可见。

- zh / en 必须同步，zh 是 source of truth。
- 新 prop / IR 字段要更新 API 表、说明和必要 demo。
- 新页面要同步 contents + data + i18n。
- 内部等价重构、测试、工具脚本、notes / `.agents`、不影响公开 DSL 或 IR schema 的性能优化通常不需要同步文档。

判断口诀：如果用户按现有文档会写出与新代码不一致的代码，就必须更新文档。

## Git 与发布授权

- 当前项目首次执行 `git commit` 前，必须读取并向用户确认实际生效的 `user.name` / `user.email`（优先仓库 local 配置）；身份未变化时，当前对话后续提交无需重复确认。
- AI 执行 `git commit` / `git push` / `git tag` / `npm publish` 前，必须在当前对话拿到用户明确授权；push / tag / publish 始终单独授权。
- 发布 tag 必须是 annotated tag，统一命名为 `<release-group>-v<version>`；release group 以 `scripts/release-groups.config.mjs` 为准，历史 tag 保持不变，已发布 tag 不得移动、复用或覆盖，细则见 `package-publish`。
- 计划、skill、自称会提交、lint/build 通过、auto mode、历史会话授权都不算授权。
- 多块改动按 commit 粒度分块 staging；无授权时展示暂存文件和拟用 message，等待确认。
- 派子 agent / 外部模型评审前必须征求用户确认。唯一常驻例外是 `flow-alpha` 的 ADR Architecture Gate 与 `flow-beta` 的入口 / 出口 completeness audit：两者自动派遣新的只读 subagent，最多 3 轮，无需逐次授权；该例外不授权产品修改、其它 review、commit 或任何外部写操作。长任务执行前同时询问：plan 写完是否评审、代码写完是否评审。非明确功能类代码完工并提交或准备提交后，也询问是否需要子 agent review；改动面大、核心功能或高风险提交仍需询问；小任务且用户已明确认可本次单次 commit 时不再额外询问。
- 用户批准批量执行并授权 LLM 自行 commit 时，每次 commit 前必须派子 agent review 单个 commit，重点查文件结构、命名规范、barrel 是否默认用 `export *` 而非 `export { ... }`、JSDoc 完备性和中文注释。用户明确认可的小任务单次 commit 不触发该要求；改动面大或核心功能不适用该豁免。
- 不要 `git add -A` 混入无关改动。不要 `git reset --hard` / `git checkout --` 回滚用户改动，除非用户明确要求。

Commit message：

```text
<emoji> <scope>: <改动内容>

可选 body：为什么改、行为/API/兼容性/测试文档同步。

Refs: module=<module>; packages=<pkg...>; version=<version>; adr=<adr|->
Control: <human-directed|llm-autonomous>
```

- subject 只写改动内容，不写版本号、ADR 编号或“按 ADR 实现”；追溯信息放 footer。release / tag commit 可写版本。
- `scope` 用包或分组名，不带 `@retikz/`：`core` / `render` / `react` / `vanilla` / `tex` / `plot` / `docs`。
- 常用 emoji：🚧 开发、✨ 功能、🐛 修复、♻️ 重构、🚚 移动、📝 文档、🔧 工程、📦 打包、➕ 依赖、🔥 删除、🔖 发布、✅ 测试。

## 分支策略

- `main`：稳定发布线，只接正式发布、hotfix、发布后文档补丁。
- `next`：下版本集成真源，release 只从这里切。
- `next-kernel` / `next-viz`：方向集成分支；功能改动先合 `next`，不直接进 `main`。
- `feature/*`、`release/*`、`hotfix/*` 按任务需要创建；创建 / 切换 / 合并 / 删除分支前确认确实需要。
- 分支同步由 GitHub Actions 自动开 PR：`main -> next`，`next -> next-kernel`，`next -> next-viz`。冲突和 CI 在 PR 中处理，不静默强推目标分支。

## 代码风格

- TypeScript ESM；组件 PascalCase、hook `useXxx`、其余 camelCase。
- 组件 / 类文件可 PascalCase；其他文件和目录用 kebab-case；目录通常用只 re-export 的 `index.ts`。
- barrel 默认 `export * from './xxx'`，不要用 `export { ... } from './xxx'` 聚合；需要裁剪公共面、避免冲突或显式重命名时才用 named re-export。公共入口可按包内 AGENTS 要求显式导出。
- 跨 owner 导入必须走目标 owner 的目录 barrel；带独立 barrel 的稳定子域可作为二级 owner（如 `shared/geometry`）；同 owner 内部可相邻导入，不从其它 owner deep import 到子文件。
- 尽量避免 import / export `as` 重命名；命名冲突优先在定义源头改成准确名称，或由 owner barrel 调整公共面。
- 数组类型写 `Array<T>`，不用 `T[]`；函数优先箭头形式，确需 hoisting / class 方法时例外。
- enum 用 const object enum：`as const` 对象 + `ValueOf` 派生类型；value object 用单数 PascalCase，成员 key 用大驼峰，派生类型加 `Value` 后缀。
- JSDoc 默认必须写：导出类型、接口、函数、组件、重要内部 helper、public props 和复杂对象字段都要注释；纯推断 / 重命名别名（如 `ValueOf`、`z.infer`、re-export 收窄）可省略。
- 注释和 JSDoc 默认用中文；Zod `.describe(...)` 仍用英文描述契约。
- 中文注释和 JSDoc 的末句不写句号；多句内容只保留句间句号。
- `@description` 写主语义、契约和跨字段行为；`@remarks` 只写设计理由、非主路径补充或未来扩展钩子；默认值写字段级 `@default`。能写到属性上的说明不要堆在整体类型说明里；注释 / JSDoc / 测试标题 / zod `.describe(...)` 不引用 ADR 或历史阶段。
- React 组件用 `FC<Props>`，Props 类型独立声明并导出；props 在函数体内解构；`components/ui/*` 是 shadcn vendored，不直接手改。
- Tailwind v4：入口 CSS 用 `@import 'tailwindcss';`，主题走 CSS-first（`@theme` / CSS variables / `@plugin`），不建 v3 风格 JS config；新 token 同步 `:root` 与 `.dark`。

## IR / Schema / 分层

- IR 必须 100% JSON 可序列化，禁止函数、ReactNode、class 实例。
- Zod schema 是单一真源，TS 类型用 `z.infer`；schema 字段 `.describe(...)` 用英文描述契约，不写 renderer 实现细节。
- 闭合对象 schema 优先用 `z.strictObject({...})`；不要新增 `z.object({...}).strict()`，除非已有链式组合无法直接表达。
- 由 IR schema object 推导出的公开数据类型命名为 `IRXxx`；由 const object enum + `ValueOf` 推导出的取值 union 命名为 `XxxValue`；Definition / registry 类型命名为 `XxxDefinition`。
- 顶层实体判别字段用 `type`，内部子变体用 `kind`。
- 新增 DSL / IR 能力前先归类：Kernel 进 core IR；Sugar 不进 IR，编译期展开为 Kernel；Tier 2 拥有高层 IR，并经 lowering 下沉到 core。
- Sugar 必须与手写 Kernel IR 等价，并配等价性测试。子组遇到 core 表达不了的通用能力，先抽象补 core，不要在子组造平行机制。

## 子目录指针

- `packages/kernel/AGENTS.md`：kernel 组 lockstep、包职责和发布分组。
- `packages/kernel/core/AGENTS.md`：IR、Scene 编译、几何、schema、registry。
- `packages/kernel/react/AGENTS.md`：React adapter、Kernel / Sugar、renderer、hydration。
- `packages/viz/AGENTS.md`：viz 组分层和 plot adapter 边界。
- `packages/viz/plot/AGENTS.md`：plot IR、provider / contract / pipeline。
- `apps/docs/AGENTS.md`：文档站结构、路由、MDX / demo / i18n 协作。
