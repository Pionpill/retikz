# AGENTS.md

面向 AI 编码助手和人类贡献者的全仓工作指南。根文件只放全仓硬规则；目录细则看就近 `AGENTS.md`，长流程和页型规则按 `.agents/skills/*` 动态加载。

## 项目定位

retikz 是受 LaTeX TikZ 启发的 TypeScript 绘图库：用组件或 JSON IR 描述节点、路径、箭头、图表等图元，编译成 renderer-agnostic 的 Scene，再交给 SVG / Canvas 等后端渲染。

- Monorepo：pnpm workspace，glob 为 `packages/*/*` + `apps/*`
- Kernel 组：`packages/kernel/{foundation,math,runtime,core,inspect,render,react,vanilla,tex}`，其中 `foundation` 是仅依赖 Zod 的跨包原子契约与基础 schema 底座，`math` 是零依赖计算底座，`runtime` 是增量执行与事务底座，`tex` 是可选 LaTeX 公式接入包
- Viz 组：`packages/viz/{plot,plot-react,plot-vanilla}`，通过 core 的 composite / lowering 能力接入
- Apps：`apps/docs` 文档站，`apps/eval` 评测工具

## 设计原则

- 上层包的底层机制优先复用 `@retikz/foundation`、`@retikz/math`、`@retikz/core` 的公开能力；实现前先检索项目内已有 capability、类型、工具和模式，确认不能满足需求并说明理由后才能自建。移除领域词汇后仍成立、被多个官方 Tier 2 包复用的通用绘图组件进入 `@retikz/standard`。Plot、Table 等领域包可以单向依赖 Standard 的公开 capability，但 Standard 不得反向依赖领域包；React / Vanilla / Docs demo 仍通过 adapter、sugar、composite、lowering、renderer 扩展表达力，不要绕开基础包另造平行 IR、平行渲染语义或平行几何底座。
- 当前需求明确需要扩展的公开能力，优先建立统一的 Definition / registry / capability contract，再实现内置能力。内置与自定义应复用同一套注册、解析和消费逻辑，不要拆成“内置白名单 + 扩展补丁接口”。
- 新增或改变公开能力、IR / schema、扩展契约、pipeline / lowering、Scene / manifest、跨包职责或 adapter 独有能力前，先读 `notes/architecture/capability-design.md` 和所属能力域的 completeness 文档，并在 ADR 设计阶段完成能力归属、包边界与闭环检查，结论写入同步镜像 plan。纯 bugfix、文案和行为等价重构只需确认不改变能力边界。
- 上述设计还必须用 `test-contract` 把行为、可观察结果、不变量、反例与最低测试层写入 ignored 测试契约矩阵；覆盖率不能代替该矩阵。
- 包不是功能收纳桶。每个发布包必须在就近 `AGENTS.md` 明确解决的问题、拥有的契约、不拥有的能力、输入与输出及缺口流向；新增能力只有在直接服务包使命、符合输入输出边界并能形成完整闭环时才能进入。实现方便、当前代码位置或单个消费方需求不能决定长期所有权。
- 选择能完整满足当前需求的最简单方案；只在当前契约或已验证复用需求要求时抽象，不做预防性抽象，不增加没有当前消费者的配置层、扩展点或间接层。
- 任何长期保存、跨层传递或对外暴露的状态、契约和中间结果，默认只保留独立事实源与下游必需字段；由现有字段可确定推导出的缓存 key、索引、展示或适配投影应由消费者按需计算，不重复写入源模型或公共契约。多个消费者确实共享且语义稳定时，才抽取命名明确的纯 helper
- 跨越多层的能力先跑通一个最小端到端闭环，再按已验证需求逐层扩展；不得为尚未实现的复杂度提前拆除、替换或拆散已经可工作的路径。
- 组件和模块保持单一关注点与清晰边界，分离数据、业务、编译、渲染和适配等职责；通过公开契约协作，避免跨层耦合和职责混杂。
- 过时的 API、schema、实现和路径直接删除，不保留向后兼容；禁止添加兼容层、旧名别名、migration / fallback 逻辑或新旧双轨。
- 架构决策面向长期演进并直接采用当前可判断的长期方案，不接受“先这样、以后再优化”的临时设计；若当前约束不足以形成长期方案，先停止实现并补齐决策。
- 做架构、能力归属或扩展机制决策前，先调研成熟项目和产品的同类设计，提炼已验证的经验、约束与适用边界；不得只凭设想发明方案。

## 动态规则

- 任务开始先按“任务规模与执行策略”判定小 / 中 / 大，再加载对应 flow；多个条件并存时取最高级。
- 新增、移动、拆分或审查 `packages/**` 的目录、文件、导出类型、函数、枚举、registry 或组件命名时，先读 `.agents/skills/standard-name/SKILL.md`。改文件分层、依赖方向、shared / schemas / contract / providers / resolve / Vanilla normalize / pipeline / compile、define-registry 能力，或进行 Tier 2 composite 设计 / review 前，先读 `.agents/skills/standard-structure/SKILL.md`，再按实际层级读取 `standard-shared` / `standard-schema` / `standard-contract` / `standard-providers` / `standard-resolve` / `standard-normalize` / `standard-pipeline-compile` / `standard-tier2-reuse`。
- 写 `apps/docs` 正文、demo、导航、i18n、schema registry 前，先读 `docs-doc-principle`；组件页 / 示例页 / 分组页 / 概念页 / blog 再读对应 docs skill。
- 只有大型任务在执行计划获用户确认后才读 `flow-long-task`；主模型为 Sol 且计划已授权多 agent 协作时再读 `codex-develop-flow`，最后分流到具体 flow / develop skill。中型任务不读 `flow-long-task`；只有包含可分离功能实现且计划明确授权 Sol / Luna 分工时可单独读 `codex-develop-flow`。中小型任务不因多文件、多步骤或可能多 commit 自动升级。
- 发包、alpha/beta/rc 流程、跨模型评审、文档外站转换等长流程按对应 skill 执行，不把步骤复制进 AGENTS。
- 所有发布组发包前都必须按 `package-publish` 逐篇阅读全文审计本次 milestone ADR 的长期一致性、状态与当前公开契约；ADR 不得残留文件 scope、私有实现、测试 case / 路径 / 命令、commit 切分或 review 记录。不得以状态字段、roadmap 勾选或 commit message 代替内容检查。
- 重构优先走 `.agents/skills/develop-refactor/SKILL.md`；纯审计仍走 `develop-review`。
- 问答中若发现用户新偏好、流程调整或规则适合沉淀进 `AGENTS.md` / skill，完成当前任务后主动告知并征求同意；用户不同意时不得自行修改。
- 向 `AGENTS.md` / skill 添加规则必须简洁干练，只写可执行约束，不扩写背景、不放长例子，优先节省 token。
- 对用户问题保持中立客观，优先考虑功能拓展性和抽象程度；有更好方案或质疑时先对齐讨论，只有把握 ≥ 90% 才编辑内容。

## 任务规模与执行策略

任务开始先按实际语义、风险和依赖判断规模；文件数与代码行数只能辅助判断，不能单独升级：

| 规模 | 默认范围                                                                  | 执行策略                                                                                                                                                |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 小   | 局部文档改动、局部 bugfix、变量或私有命名调整、格式与机械修改             | 主 agent 直接执行，做受影响范围验证；默认不写临时 plan、不调度 subagent、不使用 `flow-long-task` / `codex-develop-flow` / `cross-review`                |
| 中   | 临时 plan 修复、文档大调整、优化型重构、范围清楚的多文件改动              | 执行前在对话中给出一次执行计划并等待用户确认；默认由主 agent 执行，可按获批计划使用一个 subagent 做实现或循环 review                                    |
| 大   | ADR 执行、功能型重构、新增或重塑公开能力、跨包架构 / 公开契约的大范围变更 | 执行前确认完整计划；按需使用 `flow-long-task`，Sol 主控且用户授权时使用 `codex-develop-flow`；只有最终整体 review 或用户明确要求时才使用 `cross-review` |

局部 bugfix 若扩展为公开契约、跨包行为或功能重构，升级到中 / 大；优化型重构若改变功能或能力边界，升级为大。任务执行中发现规模判断失效、scope 超出已确认计划或需要新增外部权限时停止并重新确认。

中大型任务的执行计划必须在对话中一次说明并由用户确认：

- 规模与判断依据、目标、非目标、预期文件 / 包范围和主要步骤。
- 验证命令、提交边界、预计常规 review 次数与最大循环次数、是否进行最终 `cross-review`。
- 是否调度 subagent、使用哪些实际可用模型、角色、并发波次和文件所有权；未写入计划即视为不授权。
- 是否 stage / commit；计划 commit 时先读取实际生效的 `user.name` / `user.email` 并一并确认。push / tag / publish 仍分别明确授权。

用户确认后，计划内的实现、验证和已声明 subagent / review 连续执行，不在每个阶段重复询问。只有 scope / 架构 / 公开契约超出计划、授权动作变化、外部阻塞或达到计划内失败阈值时才中断交人工。小型任务无需计划确认，按明确请求直接执行。

## 文件与依赖

- 文本文件统一 UTF-8 读写。PowerShell、脚本或编辑器写中文文档、JSDoc、MDX、skill 内容时必须显式指定 UTF-8。
- 共享依赖版本统一写在 `pnpm-workspace.yaml` 的 `catalog:`；子包 `package.json` 使用 `"catalog:"`，不要硬编码重复版本。
- React / React-DOM 对库包是 peerDependencies，本地开发再通过 devDependencies 走 catalog。

## 临时产物

- AI / superpower / plugin 为长任务保上下文、做临时决策、审计或计划而生成的报告和计划默认不入库。
- 这类文件放到 `.gitignore` 已覆盖的本地目录：`notes/reports/`、`notes/plans/`、任意 `**/_notes/reports/`、`**/_notes/plans/`；不要 stage / commit。
- 正式测试只保留 tracked runtime case `tests/**/*.test.ts(x)`；TypeScript 可直接判断的类型关系由生产代码与 `tsc --noEmit` 负责，不编写独立测试；一次性探索 case 使用 ignored `tests/_scratch/*.test.ts(x)`。
- 不得新增 `*.typecheck.ts(x)`，也不得在 runtime 测试中使用强转、`expectTypeOf` 或 `@ts-expect-error` 触发 TypeScript 已拒绝的字段、互斥 union、必填项或封闭判别分支。
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

- 当前项目首次执行 `git commit` 前，必须读取并向用户确认实际生效的 `user.name` / `user.email`（优先仓库 local 配置）；中大型任务把身份放入执行计划一次确认，小型任务在 commit 前确认。身份未变化时，当前对话后续提交无需重复确认。
- AI 执行 `git commit` / `git push` / `git tag` / `npm publish` 前，必须在当前对话拿到用户明确授权；push / tag / publish 始终单独授权。
- 发布 tag 必须是 annotated tag，统一命名为 `<release-group>-v<version>`；release group 以 `scripts/release-groups.config.mjs` 为准，历史 tag 保持不变，已发布 tag 不得移动、复用或覆盖，细则见 `package-publish`。
- 未获用户明确确认的计划、skill、自称会提交、lint/build 通过、auto mode、历史会话授权都不算授权；用户确认的中大型执行计划只授权其中逐项写明的操作。
- 多块改动按 commit 粒度分块 staging；无授权时展示暂存文件和拟用 message，等待确认。
- 调度 subagent / 外部模型必须来自用户已确认的中大型任务执行计划，或用户对当前小任务的单独明确授权；不得在执行中以“风险较高”为由临时追加。计划必须写明角色、数量、并发方式、review 时点与最大循环次数。
- 中大型任务的常规 plan / 实现 / commit review 默认只使用一个只读 subagent；主 agent 按 finding 修改并验证后，复用同一 reviewer 继续循环，达到计划上限时停止交人工。小型任务默认由主 agent 自审。
- `cross-review` 只在大型任务最终整体 review，或用户明确要求多模型交叉验证时使用；执行前必须在计划中或当次请求中授权，不用于常规 plan gate、逐 commit review 或中小型任务的默认完工检查。
- 获准 `cross-review` 时固定同一快照，并发使用 2–3 个 fresh、独立且不同于主 agent 的 reviewer；模型不足时可用同一非主模型的两个 fresh 实例并如实记录。每轮与最大轮数以已确认计划为准；未声明时只授权一轮。修订后只有仍在已授权轮数内才冻结新快照复审。
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
- 常用 emoji：🚧 开发、✨ 功能、🐛 修复、♻️ 重构、🚚 移动、📝 文档、🔧 工程、🤖 LLM / Agent 流程、📦 打包、➕ 依赖、🔥 删除、🔖 发布、✅ 测试。

## 分支策略

- `main`：稳定发布线，只接正式发布、hotfix、发布后文档补丁。
- `next`：下版本集成真源，release 只从这里切。
- `next-kernel`、`next-library`、`next-schematic`、`next-viz`：方向集成分支；功能改动先合 `next`，不直接进 `main`。
- `feature/*`、`release/*`、`hotfix/*` 按任务需要创建；创建 / 切换 / 合并 / 删除分支前确认确实需要。
- 分支同步由 GitHub Actions 自动开 PR：`main -> next`，以及 `next -> next-kernel`、`next -> next-library`、`next -> next-schematic`、`next -> next-viz`。冲突和 CI 在 PR 中处理，不静默强推目标分支。

## 代码风格

- TypeScript ESM；目录、文件、符号、enum、registry 和组件命名统一遵循 `standard-name`。
- 内部代码依赖明确的 TypeScript 类型契约，不为纯 JavaScript 调用额外维护 `unknown`、`typeof`、`Array.isArray`、对象结构探测、重复 `throw` 或错误分支；纯 JavaScript 调用方自行负责类型校验。
- `packages/**/src` 由 Retikz 主动创建的错误必须是 `RetikzError` 或其子类，自定义错误类统一命名为 `RetikzXxxError`；每个发布包一般只保留一个统一的 `Retikz<Package>Error`，通过 code、message、details 与 cause 区分失败。只有错误边界独立且调用方确实需要按 class 分支，或存在额外稳定结构字段时，才允许增加专用错误类型。生产源码不得创建原生 `Error`；第三方或用户回调异常在 Retikz API 边界包装为 owner 错误并原样保留为 `cause`，测试可用原生 `Error` 模拟外部失败。
- JSON、持久化配置和其他类型不明确的外部输入只在 parse / schema 入口完成一次解析和校验；adapter 只将已类型化的 `InputXxx` 调度至 Vanilla API `normalizeXxx`。纵向领域 `resolveXxx` 只校验补全后才出现的领域不变量与真实上下文错误；不得在 normalize、resolve、lower 或 emit 重复 schema 已覆盖或明确 TypeScript 类型已保证的校验。内部只传递明确类型，不为纯 JavaScript 调度增加平行错误分支。
- barrel 默认 `export * from './xxx'`，不要用 `export { ... } from './xxx'` 聚合；需要裁剪公共面、避免冲突或显式重命名时才用 named re-export。公共入口可按包内 AGENTS 要求显式导出。
- 跨 owner 导入必须走目标 owner 的目录 barrel；带独立 barrel 的稳定子域可作为二级 owner（如 `shared/geometry`）；同 owner 内部可相邻导入，不从其它 owner deep import 到子文件。
- 尽量避免 import / export `as` 重命名；命名冲突优先在定义源头改成准确名称，或由 owner barrel 调整公共面。
- 数组类型写 `Array<T>`，不用 `T[]`；函数优先箭头形式，确需 hoisting / class 方法时例外。
- enum 用 const object enum：`as const` 对象 + `ValueOf` 派生类型；具体命名遵循 `standard-name`。
- JSDoc 默认必须写：导出类型、接口、函数、组件、重要内部 helper、public props 和复杂对象字段都要注释；纯推断 / 重命名别名（如 `ValueOf`、`z.infer`、re-export 收窄）可省略。
- 注释和 JSDoc 默认用中文；Zod `.describe(...)` 仍用英文描述契约。
- 中文注释和 JSDoc 的末句不写句号；多句内容只保留句间句号。
- `@description` 写主语义、契约和跨字段行为；`@remarks` 只写设计理由、非主路径补充或未来扩展钩子；默认值写字段级 `@default`。能写到属性上的说明不要堆在整体类型说明里；注释 / JSDoc / 测试标题 / zod `.describe(...)` 不引用 ADR 或历史阶段。
- React 组件用 `FC<Props>`，Props 类型独立声明并导出；props 在函数体内解构；`components/ui/*` 是 shadcn vendored，不直接手改。
- Tailwind v4：入口 CSS 用 `@import 'tailwindcss';`，主题走 CSS-first（`@theme` / CSS variables / `@plugin`），不建 v3 风格 JS config；新 token 同步 `:root` 与 `.dark`。

## IR / Schema / 分层

- IR 必须 100% JSON 可序列化，禁止函数、ReactNode、class 实例。
- 只有可持久化 IR 使用 Zod schema：`XxxSchema` 是运行时真源，`IRXxx` 用 `z.infer` 派生；Input、Canonical、compile 消费态只写 TypeScript 类型，schema 字段 `.describe(...)` 用英文描述契约，不写 renderer 实现细节。
- 闭合对象 schema 优先用 `z.strictObject({...})`；不要新增 `z.object({...}).strict()`，除非已有链式组合无法直接表达。
- `IRXxx`、`InputXxx`、`CanonicalXxx`、`XxxResolveContext`、`XxxResolution`、Definition、enum 和阶段函数的命名及目录归属遵循 `standard-name`；纵向领域的 `CanonicalXxx` 由 `resolve/<domain>/resolve.ts` 产出并定义在同 domain `types.ts`。分层意义的 `normalize/` 与阶段级 `normalizeXxx` 只属于 Vanilla API 包。
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
