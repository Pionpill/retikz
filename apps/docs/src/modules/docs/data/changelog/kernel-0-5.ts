import type { Release } from '../types';

export const kernelV05: Release = {
  minor: 'v0.5',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/foundation',
      version: 'v0.5',
      description: {
        zh: '新增零依赖 Foundation 基础契约包，为 Kernel、Standard、Viz 与 adapter 提供统一的类型工具、typed non-empty string 断言和结构化错误骨架。',
        en: 'Adds the zero-dependency Foundation contract package with shared type utilities, a typed non-empty string assertion, and a structured error skeleton for Kernel, Standard, Viz, and adapters.',
      },
      highlights: [
        {
          label: { zh: '七个根导出，固定四文件结构', en: 'Seven root exports, four fixed source files' },
          content: {
            zh: '`@retikz/foundation` 只从根入口公开 `ValueOf`、`AssertEqual`、`OpenString`、`assertNonEmptyString`、`RetikzErrorOptions`、`RetikzError` 与 `isRetikzError`；source 与 tests 各固定四个文件，不提供 subpath、IR、schema 或 Diagnostic。',
            en: '`@retikz/foundation` exposes only `ValueOf`, `AssertEqual`, `OpenString`, `assertNonEmptyString`, `RetikzErrorOptions`, `RetikzError`, and `isRetikzError` from its root. Source and tests each stay at four fixed files, with no subpaths, IR, schemas, or Diagnostics.',
          },
        },
        {
          label: { zh: '统一直接依赖与旧出口移除', en: 'Direct dependencies and removed old exports' },
          content: {
            zh: 'Core、Runtime 及其它真实 consumer 从 Foundation 根入口直接导入并声明 direct dependency；旧 Core / Runtime 类型工具定义和根转发出口移除。`@retikz/math` 没有真实 Foundation import，因此继续保持零依赖。',
            en: 'Core, Runtime, and every other real consumer now imports the Foundation root and declares a direct dependency; the old Core/Runtime type definitions and root forwarding exports are removed. `@retikz/math` has no real Foundation import and keeps its zero-dependency boundary.',
          },
        },
        {
          label: {
            zh: 'BREAKING：空白语义与错误 additive surface',
            en: 'BREAKING: blank semantics and additive error surface',
          },
          content: {
            zh: 'Runtime identity 的空 owner / path segment 现在 fail-loud，并由 `RuntimeIdentityError` 保留原始 rejected value 为 `cause`。Runtime、Render、Plot declaration 与 Chart resolution 错误保留既有 constructor、文本、字段、`instanceof` 和 recovery，同时增加 owner `details` 与统一 own `cause`。',
            en: 'Runtime identity owners and path segments now fail loudly when blank, and `RuntimeIdentityError` keeps the rejected value as `cause`. Runtime, Render, Plot declaration, and Chart resolution errors preserve constructors, text, fields, `instanceof`, and recovery while adding owner details and a unified own `cause`.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-08',
          summary: {
            zh: '交付 Foundation 包并完成类型、断言与结构化错误的跨包迁移。',
            en: 'Ships Foundation and completes the cross-package migration for types, assertions, and structured errors.',
          },
          items: [
            {
              label: { zh: 'BREAKING：基础类型工具迁移', en: 'BREAKING: Foundation type-tool migration' },
              content: {
                zh: '从 `@retikz/core` / `@retikz/runtime` 根入口导入 `ValueOf`、`AssertEqual`、`OpenString` 的代码改为从 `@retikz/foundation` 根入口导入；旧出口不保留 alias。',
                en: 'Change imports of `ValueOf`, `AssertEqual`, and `OpenString` from `@retikz/core` / `@retikz/runtime` to the `@retikz/foundation` root; the old exports have no alias.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/math',
      version: 'v0.5',
      description: {
        zh: '随 Kernel release group lockstep 进入 v0.5，并提供跨包共享的二维仿射矩阵原子。',
        en: 'Moves to v0.5 with the Kernel release group and provides shared 2D affine-matrix primitives.',
      },
      highlights: [
        {
          label: { zh: '二维仿射矩阵单一真源', en: 'One source of truth for 2D affine matrices' },
          content: {
            zh: '`AffineMatrix` 固定 SVG / Canvas 六元组顺序；`AFFINE_IDENTITY`、`multiplyAffine()` 与 `applyAffine()` 统一单位矩阵、先 inner 后 outer 的复合语义和点映射。Render hydration 与 TeX SVG lowering 直接复用这些原子，领域解析与诊断仍留在原包。',
            en: '`AffineMatrix` fixes the SVG / Canvas tuple order. `AFFINE_IDENTITY`, `multiplyAffine()`, and `applyAffine()` unify identity, inner-before-outer composition, and point mapping. Render hydration and TeX SVG lowering consume these primitives directly while domain parsing and diagnostics remain in their owner packages.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-09',
          summary: {
            zh: '新增二维仿射矩阵公共原子，并迁移 Render 与 TeX 的重复数值实现。',
            en: 'Adds public 2D affine primitives and replaces duplicate numeric implementations in Render and TeX.',
          },
          items: [
            {
              label: { zh: '仿射矩阵复合与点映射', en: 'Affine composition and point mapping' },
              content: {
                zh: '从 `@retikz/math` 根入口导入 `AffineMatrix`、`AFFINE_IDENTITY`、`multiplyAffine` 与 `applyAffine`。单位矩阵运行时不可变，运算不修改输入；有限性、可逆性与 similarity 校验仍由调用方负责。',
                en: 'Import `AffineMatrix`, `AFFINE_IDENTITY`, `multiplyAffine`, and `applyAffine` from the `@retikz/math` root. The identity is runtime-immutable and operations do not mutate inputs; callers still own finite, invertible, and similarity checks.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '仅同步 Kernel release group 版本。',
            en: 'Version-only alignment with the Kernel release group.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/runtime',
      version: 'v0.5',
      description: {
        zh: 'v0.5 alpha.2 建立零领域依赖的增量执行底座：结构化 trace、typed Owner / Program registry、revision-bound transaction 与同步 Session。',
        en: 'v0.5 alpha.2 establishes the domain-neutral incremental execution foundation: structured traces, typed Owner/Program registries, revision-bound transactions, and synchronous Sessions.',
      },
      highlights: [
        {
          label: { zh: 'Typed Program graph', en: 'Typed Program graphs' },
          content: {
            zh: '`defineRuntimeProgram()` 保留 artifact input / owned value / private read / public read 四组泛型；builtin/custom Definition 共用一个 registry，依赖按稳定拓扑顺序执行。',
            en: '`defineRuntimeProgram()` retains artifact-input, owned-value, private-read, and public-read generics. Built-in and custom Definitions share one registry and execute in stable topological order.',
          },
        },
        {
          label: { zh: '原子同步 Session', en: 'Atomic synchronous Sessions' },
          content: {
            zh: '完整 Owner Snapshot 先在隔离 candidate 中 capture/read/compare，再执行 incremental、bailout 或 fallback Program；所有 read 成功后才一次发布 revision。',
            en: 'Complete Owner Snapshots are captured, read, and compared in an isolated candidate before Programs choose incremental, bailout, or fallback execution. The revision publishes only after every read succeeds.',
          },
        },
        {
          label: { zh: '可选更新策略', en: 'Selectable update strategies' },
          content: {
            zh: '`RuntimeSessionOptions.updateStrategy` 默认 `auto`；选择 `full` 时保留 Snapshot、transaction、rollback 与 diagnostics，但有实际依赖变化的 Program 跳过 `update()` 并完整运行。`RuntimeProgramContext.execution` 可区分主动 full、incremental 与安全 fallback。',
            en: '`RuntimeSessionOptions.updateStrategy` defaults to `auto`. Selecting `full` keeps Snapshots, transactions, rollback, and diagnostics while affected Programs skip `update()` and run fully. `RuntimeProgramContext.execution` distinguishes forced full, incremental, and safe fallback execution.',
          },
        },
        {
          label: { zh: '稳定诊断与资源回滚', en: 'Stable diagnostics and resource rollback' },
          content: {
            zh: 'Program callback、artifact lifecycle、observer、trace 与 dispose 使用稳定 code/context；publish 前失败反向清理 candidate，publish 后 observer/retire failure 进入 drain queue 而不回滚。',
            en: 'Program callbacks, artifact lifecycle, observers, traces, and disposal use stable codes and context. Pre-publish failures retire candidates in reverse order, while post-publish observer and retire failures enter the drain queue without rollback.',
          },
        },
        {
          label: { zh: 'Commit participant', en: 'Commit participants' },
          content: {
            zh: '`defineRuntimeCommitParticipant()` 让 renderer 等外部状态与 Owner/Program candidate 同一 transaction prepare、commit、read 与 publish；失败反向 rollback，rollback 失败进入可诊断的 broken Session。',
            en: '`defineRuntimeCommitParticipant()` lets renderer and other external state prepare, commit, read, and publish in the same transaction as Owner/Program candidates. Failures roll back in reverse order, while rollback failures enter a diagnosable broken Session.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '交付 performance trace、Owner / Program / participant typed identity、同步 transaction、fallback、diagnostic queue 与 exactly-once lifecycle。',
            en: 'Ships performance traces, typed Owner/Program/participant identity, synchronous transactions, fallback, diagnostic queues, and exactly-once lifecycle management.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/core',
      version: 'v0.5',
      description: {
        zh: 'v0.5 补齐跨图元布局与文本语义，并在 alpha.2 以完整 Snapshot、Core Runtime Program、Scene Patch 与保守 fallback 建立首个安全局部增量编译闭环。',
        en: 'v0.5 adds cross-primitive layout and text semantics. Alpha.2 adds complete Snapshots, a Core Runtime Program, Scene Patches, conservative fallback, and the first safe local incremental path.',
      },
      highlights: [
        {
          label: { zh: 'Node 与 Scope 锚点布局', en: 'Node and Scope anchor layout' },
          content: {
            zh: '`Node.position` 支持 anchor-to-anchor 分支；`IRScope.placement` 可把 Scope 自身 center / side / corner 对齐已完成 target，rotate / scale 统一通过 `pivot` 绑定固有包络。',
            en: '`Node.position` supports anchor-to-anchor placement. `IRScope.placement` aligns the Scope’s own center, side, or corner to a completed target, while rotate and scale share a `pivot` resolved from the intrinsic envelope.',
          },
        },
        {
          label: { zh: '单轴与三段正交连接', en: 'Axis-only and three-leg orthogonal paths' },
          content: {
            zh: '`axis-line`、`horizontalTo` / `verticalTo` 只投影目标的一个轴；fold 新增 `-|-` / `|-|` 与归一化 `fraction`。它们复用既有 target、cursor、clipping、sampling 与 Scene line command，不增加 renderer 语义。',
            en: '`axis-line` and `horizontalTo` / `verticalTo` project one target axis only. Folds add `-|-` / `|-|` with a normalized `fraction`. They reuse existing target, cursor, clipping, sampling, and Scene line-command semantics without renderer changes.',
          },
        },
        {
          label: { zh: '可读文本与标签视觉盒', en: 'Readable text and visual-box labels' },
          content: {
            zh: '`NodeTextColor.Contrast` 对静态不透明 fill 选择黑 / 白文字，无法静态求值时 warning 并回退 `currentColor`。`Node.label.distance` 表示节点边界到旋转后标签视觉盒的净距；baseline、pin、Scene bounds 与自动 viewBox 共用同一度量。',
            en: '`NodeTextColor.Contrast` chooses black or white text for a static opaque fill and warns before falling back to `currentColor` when the fill cannot be resolved. `Node.label.distance` means the net gap to the rotated visual box, shared by baselines, pins, Scene bounds, and the automatic viewBox.',
          },
        },
        {
          label: { zh: '上下文化 layout proposal', en: 'Contextual layout proposals' },
          content: {
            zh: '`defineComposite()` 的 `compile` 分支以双轴 minimum / natural / range / exact proposal 查询任意 child，独立返回 resolved `slotSize`、真实 allocation / visual bounds 与 alignment guides。每次 probe 的成功或失败 transaction 保持隔离；solver 通过 one-use `replay()` 或 occurrence-aware `raise()` 选择结果。此变更删除 `ChildLayoutAxisConstraint`、`ChildLayoutConstraint` 与 `ChildLayoutSize`，把 `context.constraint` 改为 `context.proposal`，并把 `layoutChild()` 返回值改为需按 `kind` narrowing 的 `LayoutChildProbe`；原 fail-loud consumer 应对 `failed` 调用 `raise()`，不提供旧别名或兼容 overload。',
            en: '`defineComposite()` compile branches query any child with two-axis minimum / natural / range / exact proposals and independently return resolved `slotSize`, real allocation / visual bounds, and alignment guides. Every successful or failed probe transaction stays isolated until the solver selects it through one-use `replay()` or occurrence-aware `raise()`. This breaking change removes `ChildLayoutAxisConstraint`, `ChildLayoutConstraint`, and `ChildLayoutSize`, renames `context.constraint` to `context.proposal`, and makes `layoutChild()` return a `LayoutChildProbe` that must be narrowed by `kind`; consumers preserving fail-loud behavior should call `raise()` for `failed`, with no legacy aliases or compatibility overloads.',
          },
        },
        {
          label: { zh: 'Core Runtime Program', en: 'Core Runtime Program' },
          content: {
            zh: '`createCoreProgram()` 让完整 IR Snapshot 在 Runtime transaction 中原子产出完整 CompileResult、带 canonical identity topology 的 Scene Snapshot 与 Patch。ChangeSet 会与前后 Snapshot 交叉校验；当前安全局部路径只重编一个 root Node 的纯色 fill，引用、资源、Scope、Path、Composite 与其它变化保守 full fallback。',
            en: '`createCoreProgram()` atomically derives a complete CompileResult, a Scene Snapshot with canonical identity topology, and a Patch from complete IR Snapshots inside Runtime transactions. ChangeSets are cross-checked against previous and next Snapshots. The current safe local path recompiles only one root Node solid fill, while references, resources, Scopes, Paths, composites, and other changes conservatively use full fallback.',
          },
        },
        {
          label: { zh: '可继承 Theme 环境', en: 'Inherited Theme environment' },
          content: {
            zh: '`IRScene.theme` 与 `IRScope.theme` 以 `neutral + light` 为基线逐字段继承；无布局与布局感知 Composite 都收到完整只读 Theme，并由领域 owner 自行映射 token。Core 图元、最终 Scene 与 SVG / Canvas renderer 不解释 Theme。',
            en: '`IRScene.theme` and `IRScope.theme` inherit per field from a `neutral + light` baseline. Both expand and layout-aware composites receive the complete readonly Theme and let the domain owner map its own tokens. Core primitives, the final Scene, and SVG / Canvas renderers do not interpret Theme.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '交付 Core Runtime Program、单 root Node fill 局部增量闭环、布局感知 Composite proposal / probe 合同、可继承 Theme 环境与领域中立编译观测。',
            en: 'Ships the Core Runtime Program, the one-root Node fill incremental path, layout-aware composite proposal / probe contracts, inherited Theme, and domain-neutral compile observation.',
          },
          items: [
            {
              label: { zh: 'BREAKING：领域中立编译观测', en: 'BREAKING: Domain-neutral compile observation' },
              content: {
                zh: 'Core 新增 `observeCompileToScene()`、带 schema 的 owner output、最终 occurrence provenance 与隔离片段编译，只提供不含 Inspector 词汇的观测底座。BREAKING：删除 Core inspection contract、`CompileOptions.inspection`、`CompileResult.inspection`、Definition 上的 Inspector 字段和内置 Path Inspector；调用方改用可选 `@retikz/inspect`。',
                en: 'Core adds `observeCompileToScene()`, schema-bound owner outputs, final-occurrence provenance, and isolated fragment compilation as a domain-neutral observation foundation. BREAKING: removes the Core inspection contract, `CompileOptions.inspection`, `CompileResult.inspection`, Inspector fields on Definitions, and the built-in Path Inspector; consumers migrate to optional `@retikz/inspect`.',
              },
            },
            {
              label: { zh: 'Theme Composite 上下文', en: 'Theme composite context' },
              content: {
                zh: '`ThemeStyle` / `ThemeMode`、严格 `ThemeSchema` 与 `ResolvedTheme` 成为 Core 公共契约；Theme 变化进入 retained compile input，无法证明更窄依赖时保守 full fallback，并保持与 fresh compile 等价。',
                en: '`ThemeStyle`, `ThemeMode`, strict `ThemeSchema`, and `ResolvedTheme` become public Core contracts. Theme changes enter retained compile input and conservatively full-fallback when a narrower dependency cannot be proven, preserving fresh-compile equivalence.',
              },
            },
            {
              label: {
                zh: 'BREAKING：namespaced Theme tokens 与 shared colors',
                en: 'BREAKING: Namespaced Theme tokens and shared colors',
              },
              content: {
                zh: '`Theme` 现在是稀疏 `style / mode / tokens`；Core 内置 `core` namespace，`ResolvedTheme` 额外提供 detached/frozen 的 `colors.semantic` 与非空 `colors.categorical`。`defineCoreThemeTokens` 与 `themeTokenDefinitions` 支持 Core、Plot、Chart、Table 及自定义 owner 通过同一 registry 校验和聚合；未知 namespace/key/value 与冲突 Definition fail-loud。React `Layout` 与 Vanilla normalization 都会聚合嵌入 owner Definition，standalone 与 embedded compile 使用同一语义。',
                en: '`Theme` is now sparse `style / mode / tokens`; Core registers the built-in `core` namespace, and `ResolvedTheme` adds a detached, frozen `colors.semantic` view plus a non-empty `colors.categorical` palette. `defineCoreThemeTokens` and `themeTokenDefinitions` let Core, Plot, Chart, Table, and custom owners validate and aggregate through one registry; unknown namespaces, keys, values, and conflicting Definitions fail loudly. React `Layout` and Vanilla normalization aggregate embedded owner Definitions, so standalone and embedded compile paths share the same semantics.',
              },
            },
            {
              label: { zh: '原子绘图 schema / type 片段', en: 'Atomic drawing schema/type fragments' },
              content: {
                zh: 'Core 公开 `GraphicPaint`、`GraphicOpacity`、`GraphicEffects`、`StrokeStyle` 与五个 `Path` fragment 的严格 schema 及 `IRXxx` 类型；完整 `PathSchema`、`PathDefaultSchema` 与既有 compile / Scene / lowering 语义保持不变，fragment 只提供可组合的 JSON 契约，不成为独立编译入口。',
                en: 'Core exposes strict schemas and `IRXxx` types for `GraphicPaint`, `GraphicOpacity`, `GraphicEffects`, `StrokeStyle`, and five `Path` fragments. Complete `PathSchema`, `PathDefaultSchema`, and existing compile, Scene, and lowering semantics remain unchanged; fragments are composable JSON contracts, not independent compile entries.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '交付 ADR-01～07 的 Node / Scope 布局、路径、文本、TeX 与 Composite 契约。',
            en: 'Delivers ADR-01 through ADR-07 across Node/Scope layout, paths, text, TeX, and composites.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/inspect',
      version: 'v0.5',
      description: {
        zh: '可选安装的开发期检查扩展：观察 Core 最终编译产物，以普通 Core IR 生成不影响主图的辅助内容。',
        en: 'An optional development-time inspection extension that observes final Core compile outputs and generates auxiliary content as ordinary Core IR without affecting the primary figure.',
      },
      highlights: [
        {
          label: { zh: '独立 Inspector 注册表', en: 'Independent Inspector registry' },
          content: {
            zh: '`defineInspector()`、显式注册表、运行时 selection、选项合并、诊断与辅助平面全部位于可选包；内置 stroke Path Inspector 与第三方定义使用同一条注册和编译路径。',
            en: '`defineInspector()`, explicit registries, runtime selection, option merging, diagnostics, and inspection planes all live in the optional package. The built-in stroke Path Inspector and third-party definitions share the same registration and compile path.',
          },
        },
        {
          label: { zh: '按宿主选择入口', en: 'Host-specific optional entries' },
          content: {
            zh: '根入口保持宿主无关；`/render`、`/react` 与 `/vanilla` 分别接入只读图层和通用编译驱动。未导入这些入口时，基础 Core、Render、React 与 Vanilla 不执行 Inspector 逻辑。',
            en: 'The root entry remains host-independent, while `/render`, `/react`, and `/vanilla` integrate readonly layers and generic compile drivers. Core, Render, React, and Vanilla run no Inspector logic unless these optional entries are imported.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-07',
          summary: {
            zh: '新增独立 Inspector 定义、注册、选择、诊断、辅助编译、内置 stroke Path 检查与三类宿主入口。',
            en: 'Introduces independent Inspector definitions, registries, selection, diagnostics, auxiliary compilation, the built-in stroke Path Inspector, and three host integration entries.',
          },
          items: [
            {
              label: { zh: 'BREAKING：从 Core 迁移', en: 'BREAKING: Migration from Core' },
              content: {
                zh: '安装 `@retikz/inspect` 后，从根入口创建注册表与 selection；React 从 `/react` 使用 `InspectLayout`、`InspectScope`、`InspectPath`，Vanilla 从 `/vanilla` 使用 authoring 标记和驱动。旧 Core 内置 API、基础组件 prop 与 plain-spec 字段不保留兼容桥。',
                en: 'Install `@retikz/inspect`, then create registries and selection from its root entry. React uses `InspectLayout`, `InspectScope`, and `InspectPath` from `/react`; Vanilla uses authoring markers and drivers from `/vanilla`. No compatibility bridge remains for the old Core APIs, base-component props, or plain-spec fields.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/render',
      version: 'v0.5',
      description: {
        zh: '静态 SVG / Canvas API 继续只消费 Scene；alpha.2 新增可回滚 retained runtime，以 canonical Scene Patch 原位更新宿主。',
        en: 'Static SVG and Canvas APIs continue to consume Scene only. Alpha.2 adds a rollback-safe retained runtime that applies canonical Scene Patches in place.',
      },
      highlights: [
        {
          label: { zh: 'Retained renderer runtime', en: 'Retained renderer runtime' },
          content: {
            zh: '`@retikz/render/runtime` 提供 nominal renderer factory、`none | group | entity` capability、Patch/Snapshot validator 与 Runtime participant；合法但不受支持的操作在执行前完整 fallback，第三方 renderer 与内置后端共用协议。',
            en: '`@retikz/render/runtime` provides nominal renderer factories, `none | group | entity` capabilities, Patch/Snapshot validation, and a Runtime participant. Valid unsupported operations fully fall back before execution, and third-party renderers share the built-in protocol.',
          },
        },
        {
          label: { zh: 'SVG / Canvas 原子提交', en: 'Atomic SVG and Canvas commits' },
          content: {
            zh: 'SVG 原位保留未变 DOM identity并支持SSR adopt；Canvas以retained display list/index和保守dirty region提交。Scene、resource、hydration、animation与hit-test在同一revision切换。',
            en: 'SVG preserves unchanged DOM identity in place and supports SSR adoption. Canvas commits a retained display list/index through conservative dirty regions. Scene, resources, hydration, animation, and hit testing switch in one revision.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '交付 retained renderer contract、内置 SVG / Canvas 事务后端、普通 Scene 辅助层执行、capability fallback、hydration / resource / animation 同步提交与 5000 规模性能门禁。',
            en: 'Ships the retained renderer contract, transactional built-in SVG/Canvas backends, ordinary-Scene auxiliary execution, capability fallback, synchronized hydration/resource/animation commits, and 5,000-entity performance gates.',
          },
          items: [
            {
              label: { zh: '普通只读 Scene 图层', en: 'Ordinary readonly Scene layers' },
              content: {
                zh: 'Render 删除 Inspector 专用 frame、capability 与绘制分支，统一通过 `RenderReadonlyLayer` 执行普通静态 Scene。每层拥有独立资源命名空间，不进入主图 viewport、hydration、hit-test、动画或 retained identity，并与主 Scene 原子提交或回滚。',
                en: 'Render removes Inspector-specific frames, capabilities, and drawing branches in favor of ordinary static Scenes carried by `RenderReadonlyLayer`. Each layer has an isolated resource namespace, stays outside the primary viewport, hydration, hit testing, animation, and retained identity, and commits or rolls back atomically with the primary Scene.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '公开 renderer API 与 Scene primitive 不变；补齐多 `PathPrim` 的 fill / stroke / opacity 跨后端对照。',
            en: 'Public renderer APIs and Scene primitives remain unchanged, with cross-backend coverage for fill, stroke, and opacity across multiple `PathPrim` values.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/react',
      version: 'v0.5',
      description: {
        zh: 'React 等价暴露 Core v0.5 authoring；`<Layout>` 默认以 retained Session 原子提交 Scene、handler、animation 与 compile artifacts，也可选择无 Session 的 static full 执行。',
        en: 'React exposes Core v0.5 authoring. `<Layout>` defaults to atomic Scene, handler, animation, and compile-artifact commits through a retained Session, with an optional Session-free static full path.',
      },
      highlights: [
        {
          label: { zh: '等价 authoring', en: 'Equivalent authoring' },
          content: {
            zh: '`NodeProps.position`、`ScopeProps.placement` / transform `pivot`、`<Step kind="axis-line">` 与 `<Draw>` 的 `horizontalTo` / `verticalTo`、`-|-` / `|-|` 均生成 Core 定义的同一 IR。',
            en: '`NodeProps.position`, `ScopeProps.placement` and transform `pivot`, `<Step kind="axis-line">`, and `<Draw>` operators `horizontalTo` / `verticalTo` plus `-|-` / `|-|` all produce the same Core-defined IR.',
          },
        },
        {
          label: { zh: 'Layout 编译产物通知', en: 'Layout compile-artifact notification' },
          content: {
            zh: '`<Layout>` 通过 `artifacts={{ nodeLayouts: true }}` 请求 Node layout，并在 React commit 后由 `onArtifacts` 接收 immutable artifacts；可用 `isNodeLayoutCompileArtifact()` 筛选。',
            en: '`<Layout>` requests Node layouts through `artifacts={{ nodeLayouts: true }}` and reports immutable artifacts through `onArtifacts` after the React commit; `isNodeLayoutCompileArtifact()` narrows the result.',
          },
        },
        {
          label: { zh: 'Layout 执行策略', en: 'Layout execution policy' },
          content: {
            zh: '`<Layout runtime>` 默认 `retained + auto`，也可选择保留事务的 `retained + full` 或不创建 Session/Snapshot 的 `static`。strategy 改变时在同一 host 重建 Session，mode 改变时释放并替换宿主；static 与 renderer factory、diagnostic callback 互斥。',
            en: '`<Layout runtime>` defaults to `retained + auto` and can instead select transactional `retained + full` or `static` without a Session or Snapshot. Strategy changes rebuild the Session on the same host, while mode changes replace the host. Static mode excludes renderer factories and diagnostic callbacks.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '交付 Layout 的 retained / static 执行模式与 auto / full 更新策略，并补齐 SSR handoff、transaction diagnostic、commit 后 artifact/ref 出口与第三方 renderer 注入。',
            en: 'Ships retained / static Layout execution modes and auto / full update strategies, plus SSR handoff, transaction diagnostics, post-commit artifact/ref outputs, and third-party renderer injection.',
          },
          items: [
            {
              label: { zh: 'BREAKING：通用编译驱动', en: 'BREAKING: Generic compile drivers' },
              content: {
                zh: 'React 基础包只提供领域中立 `LayoutCompileDriver` 与 authoring site。BREAKING：删除 `Layout`、`Scope`、`Path` 的 `inspect` prop；Path 检查改从 `@retikz/inspect/react` 导入 `InspectLayout`、`InspectScope` 与 `InspectPath`。',
                en: 'The React base package now provides only the domain-neutral `LayoutCompileDriver` and authoring sites. BREAKING: removes the `inspect` prop from `Layout`, `Scope`, and `Path`; migrate Path inspection to `InspectLayout`, `InspectScope`, and `InspectPath` from `@retikz/inspect/react`.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '同步 Core v0.5 的布局、路径与文本契约，并提供 post-commit `onArtifacts`。',
            en: 'Tracks Core v0.5 layout, path, and text contracts and exposes post-commit `onArtifacts`.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/vanilla',
      version: 'v0.5',
      description: {
        zh: 'Vanilla plain spec 直接透传 Core v0.5 IR；IR/plain mount 默认使用 retained Session，也可显式选择 raw static full，Scene mount 保持纯 static full render。',
        en: 'Vanilla plain specs pass Core v0.5 IR through directly. IR/plain mounts default to retained Sessions with an explicit raw static full option, while Scene mounts remain static full rendering.',
      },
      highlights: [
        {
          label: { zh: 'View 与 Scene 同步持有 artifacts', en: 'Views retain artifacts with the Scene' },
          content: {
            zh: '`VanillaView.artifacts` 与 `CanvasView.artifacts` 在 `update()` 后和 Scene 一起替换；直接传入 Scene 时固定为空 immutable 数组。`toScene()` 仍只返回 Scene。',
            en: '`VanillaView.artifacts` and `CanvasView.artifacts` update atomically alongside Scene after `update()`. Direct Scene input exposes an empty immutable array, and `toScene()` returns Scene only.',
          },
        },
        {
          label: { zh: 'Retained / static 明确判别', en: 'Explicit retained/static modes' },
          content: {
            zh: 'IR与plain spec默认返回`retained + auto` view，也可显式选择保留事务的`retained + full`或无Session的`static`。raw static update接受IR/plain spec并完整归一化、编译、重绘；预编译Scene仍是独立static入口并拒绝整个runtime字段。策略变化要求dispose后remount。',
            en: 'IR and plain specs default to `retained + auto` views and can explicitly select transactional `retained + full` or `static` without a Session. Raw static updates accept IR/plain specs and fully normalize, compile, and redraw. Precompiled Scenes remain a separate static entry that rejects the entire runtime field. Strategy changes require disposal and remounting.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '交付 SVG/Canvas retained / static view、auto / full 更新策略、transactional update/diagnostics/hydration、第三方 renderer 注入与 plain-spec composite callback transaction。',
            en: 'Ships retained / static SVG and Canvas views, auto / full update strategies, transactional updates/diagnostics/hydration, third-party renderer injection, and plain-spec composite callback transactions.',
          },
          items: [
            {
              label: { zh: 'BREAKING：通用编译驱动', en: 'BREAKING: Generic compile drivers' },
              content: {
                zh: 'Vanilla 基础包只提供领域中立 `VanillaCompileDriver` 与 authoring site。BREAKING：删除 plain spec 的 inspection sidecar 与 `VanillaPathSpec.inspect`；改用 `@retikz/inspect/vanilla` 的 authoring 标记和编译驱动。',
                en: 'The Vanilla base package now provides only the domain-neutral `VanillaCompileDriver` and authoring sites. BREAKING: removes plain-spec inspection sidecars and `VanillaPathSpec.inspect`; migrate to the authoring markers and compile driver from `@retikz/inspect/vanilla`.',
              },
            },
          ],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: 'plain spec 支持新增 placement / path / text 契约；mount view 新增只读 artifacts，不二次 compile。',
            en: 'Plain specs support the new placement, path, and text contracts, while mounted views add readonly artifacts without a second compile.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/tex',
      version: 'v0.5',
      description: {
        zh: 'MathJax 接入升级为可选 profile、扩展集合、多路径 paint lowering、结构化诊断与可复用 factory / React hook，同时保持 optional peer 延迟加载。',
        en: 'MathJax gains selectable profiles, extensions, multi-path paint lowering, structured diagnostics, and reusable factory/React-hook APIs while keeping the optional peer lazy.',
      },
      highlights: [
        {
          label: { zh: 'MathJax 数学 profile', en: 'MathJax math profile' },
          content: {
            zh: '`profile: "math"` 启用 `ams`、`newcommand`、`boldsymbol`、`braket`、`cancel`、`cases`、`centernot`、`mathtools` 与 `color`；也可通过 `extensions` 选择性加载，配置均使用字面量 dynamic import。',
            en: '`profile: "math"` enables `ams`, `newcommand`, `boldsymbol`, `braket`, `cancel`, `cases`, `centernot`, `mathtools`, and `color`. `extensions` can load them selectively, using literal dynamic imports throughout.',
          },
        },
        {
          label: { zh: '多路径样式与确定失败', en: 'Multi-path styling and deterministic failures' },
          content: {
            zh: '`LoweredTex.paths` 为每条路径保留 fill / stroke / opacity / fillRule。无法表达的 `<text>`、nested SVG、clip、group opacity 或 transform 会整次返回结构化 diagnostic，避免丢失视觉语义。',
            en: '`LoweredTex.paths` preserves fill, stroke, opacity, and fillRule per path. Unrepresentable `<text>`, nested SVG, clipping, group opacity, or transforms fail the whole run with a structured diagnostic so visual semantics are not dropped.',
          },
        },
        {
          label: { zh: 'Factory、cache 与 React 生命周期', en: 'Factory, cache, and React lifecycle' },
          content: {
            zh: '`createMathJaxLowerTex()` 提供一次性配置入口；确定失败按完整 key 缓存并重放 diagnostic，engine error 可重试。`useLowerTex()` 隔离不同配置并防止过期初始化覆盖当前状态。',
            en: '`createMathJaxLowerTex()` provides a one-shot configured entry point. Deterministic failures are cached by a complete key and replay diagnostics, while engine errors remain retryable. `useLowerTex()` isolates configurations and prevents stale initialization from overwriting current state.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '随 Kernel release group lockstep 升级；不新增 TeX 能力。',
            en: 'Version-only alignment with the Kernel release group; no new TeX capabilities.',
          },
          items: [],
        },
        {
          version: 'alpha.1',
          date: '2026-07-26',
          summary: {
            zh: '交付 MathJax profile、9 个公开扩展、多路径 SVG paint lowering、诊断/cache/factory 与 React 生命周期；默认采用 base profile。',
            en: 'Ships MathJax profiles, nine public extensions, multi-path SVG paint lowering, diagnostics, caching, factory APIs, and React lifecycle handling; the default is the base profile.',
          },
          items: [],
        },
      ],
    },
  ],
};
