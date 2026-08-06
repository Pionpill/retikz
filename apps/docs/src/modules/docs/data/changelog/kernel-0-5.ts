import type { Release } from '../types';

export const kernelV05: Release = {
  minor: 'v0.5',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/math',
      version: 'v0.5',
      description: {
        zh: '随 Kernel release group lockstep 进入 v0.5；alpha.1 不新增 math 能力。',
        en: 'Moves to v0.5 in lockstep with the Kernel release group; alpha.1 adds no math capabilities.',
      },
      highlights: [],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-08-04',
          summary: {
            zh: '随 Kernel release group lockstep 升级；不新增 math 能力。',
            en: 'Version-only alignment with the Kernel release group; no new math capabilities.',
          },
          items: [],
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
            zh: '交付 Core Runtime Program、单 root Node fill 局部增量闭环、布局感知 Composite proposal / probe 合同、可继承 Theme 环境与可扩展 Inspector 内容。',
            en: 'Ships the Core Runtime Program, the one-root Node fill incremental path, layout-aware composite proposal / probe contracts, inherited Theme, and extensible Inspector content.',
          },
          items: [
            {
              label: { zh: 'BREAKING：可扩展 Inspector 内容', en: 'BREAKING: Extensible Inspector content' },
              content: {
                zh: 'Inspector 现在依附 Composite / PathKind Definition，通过 `defineInspector()` 把 settled artifact / subject 转为普通 Core `IRChild`，再隔离编译为每个 entry 的静态 `scene`；不提供 `outputSchema`。BREAKING：移除 `InspectionPrimitive`、`InspectionTone` 与 `CompositeInspectorDefinition`；entry 的 `primitives` 改为 `scene`，locator 必填 `target`，policy 的 `component` 改为 `self`，公开 `CompileWarning.origin` 改为必填。旧 API 不保留别名或兼容桥。',
                en: 'Inspectors now attach to Composite or PathKind Definitions and use `defineInspector()` to convert settled artifacts or subjects into ordinary Core `IRChild` values, isolated into one static `scene` per entry with no `outputSchema`. BREAKING: removes `InspectionPrimitive`, `InspectionTone`, and `CompositeInspectorDefinition`; replaces entry `primitives` with `scene`; requires locator `target`; renames policy `component` to `self`; and makes public `CompileWarning.origin` required. No aliases or compatibility bridge remain.',
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
              label: { zh: 'Inspection 普通 Scene 执行', en: 'Ordinary Scene inspection execution' },
              content: {
                zh: 'SVG 与 Canvas 删除 Inspector 专用 primitive、palette 与 hatch consumer，改为在 occurrence transform 下执行普通静态 Scene。每个 entry 的资源命名空间独立；辅助内容不进入 hydration、hit-test、动画或 retained identity，prepare / commit / rollback 仍与主 Scene 原子切换。',
                en: 'SVG and Canvas remove Inspector-specific primitives, palettes, and hatch consumers and execute ordinary static Scenes under occurrence transforms instead. Every entry has an isolated resource namespace; auxiliary content stays out of hydration, hit testing, animation, and retained identity while prepare, commit, and rollback remain atomic with the primary Scene.',
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
              label: { zh: 'Path Inspector authoring', en: 'Path Inspector authoring' },
              content: {
                zh: '`<Path inspect>` 为当前 Path occurrence 生成 runtime-only `target:path + self` sidecar；boolean 与开放对象形式都不会进入 Core IR，第三方 Path kind 的额外字段由其 Inspector schema 统一校验。Scope `enabled:false` 同时阻断 Composite 与 Path 后代。',
                en: '`<Path inspect>` creates a runtime-only `target:path + self` sidecar for the current Path occurrence. Boolean and open-object forms never enter Core IR, and a third-party Path kind validates extra keys through its Inspector schema. Scope `enabled:false` blocks both Composite and Path descendants.',
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
              label: { zh: 'Path Inspector authoring', en: 'Path Inspector authoring' },
              content: {
                zh: '`VanillaPathSpec.inspect` 在 normalization 时从 Path IR 剥离，并生成与 React 同构的 `target:path + self` sidecar。内置与第三方 Path kind 的开放选项保持原样到达 owner schema；raw static 与 retained IR / plain-spec 路径共享该行为。',
                en: '`VanillaPathSpec.inspect` is stripped from Path IR during normalization and creates the same `target:path + self` sidecar as React. Open options for built-in and third-party Path kinds reach the owner schema unchanged across raw-static and retained IR or plain-spec paths.',
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
