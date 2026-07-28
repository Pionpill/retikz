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
          date: '2026-07-29',
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
          label: { zh: '布局感知 Composite 与显式产物', en: 'Layout-aware composites and explicit artifacts' },
          content: {
            zh: '`defineComposite()` 的 `compile` 分支支持双轴 bounded / exact child constraint、独立 `slotSize`、显式 container allocation，以及带 transform / clip wrapper 的单次 replay。迁移时把 `constrained.maxWidth` 改为 `constrained.width` 轴，为自建 `LayoutChildResult` 补齐必填 `slotSize`，并把 replay 的 transform 数组移入 `wrapper.transforms`。`compileToScene()` 同次返回 `{ scene, artifacts }`。',
            en: '`defineComposite()` compile branches support two-axis bounded or exact child constraints, independent `slotSize`, explicit container allocation, and one replay with a transform/clip wrapper. To migrate, replace `constrained.maxWidth` with a `constrained.width` axis, add the required `slotSize` to manually constructed `LayoutChildResult` values, and move a replay transform array into `wrapper.transforms`. `compileToScene()` returns `{ scene, artifacts }` from the same compile.',
          },
        },
        {
          label: { zh: 'Core Runtime Program', en: 'Core Runtime Program' },
          content: {
            zh: '`createCoreProgram()` 让完整 IR Snapshot 在 Runtime transaction 中原子产出完整 CompileResult、带 canonical identity topology 的 Scene Snapshot 与 Patch。ChangeSet 会与前后 Snapshot 交叉校验；当前安全局部路径只重编一个 root Node 的纯色 fill，引用、资源、Scope、Path、Composite 与其它变化保守 full fallback。',
            en: '`createCoreProgram()` atomically derives a complete CompileResult, a Scene Snapshot with canonical identity topology, and a Patch from complete IR Snapshots inside Runtime transactions. ChangeSets are cross-checked against previous and next Snapshots. The current safe local path recompiles only one root Node solid fill, while references, resources, Scopes, Paths, composites, and other changes conservatively use full fallback.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-28',
          summary: {
            zh: '交付 Core Runtime Program、单 root Node fill 局部增量闭环，以及布局感知 Composite 的双轴 slot、显式 allocation 与 replay wrapper。',
            en: 'Ships the Core Runtime Program and one-root Node fill incremental path, plus two-axis slots, explicit allocation, and replay wrappers for layout-aware composites.',
          },
          items: [],
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
          date: '2026-07-29',
          summary: {
            zh: '交付 retained renderer contract、内置SVG/Canvas事务后端、capability fallback、hydration/resource/animation同步提交与5000规模性能门禁。',
            en: 'Ships the retained renderer contract, transactional built-in SVG/Canvas backends, capability fallback, synchronized hydration/resource/animation commits, and 5,000-entity performance gates.',
          },
          items: [],
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
        zh: 'React 等价暴露 Core v0.5 authoring，并让 `<Layout>` 以 retained Session 原子提交 Scene、handler、animation与compile artifacts。',
        en: 'React exposes Core v0.5 authoring and lets `<Layout>` atomically commit Scene, handlers, animation, and compile artifacts through a retained Session.',
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
          label: { zh: 'Layout retained Session', en: 'Layout retained Sessions' },
          content: {
            zh: '`<Layout runtime>` 可注入 retained renderer 与 diagnostic callback；React只声明宿主shell，SVG descendants/Canvas bitmap由Render拥有。SSR matching seed原位接管，mismatch在publish前replace，StrictMode按renderer instance exactly-once释放。',
            en: '`<Layout runtime>` can inject a retained renderer and diagnostic callback. React declares only the host shell while Render owns SVG descendants or the Canvas bitmap. Matching SSR seeds are adopted in place, mismatches replace before publish, and StrictMode disposes each renderer instance exactly once.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-29',
          summary: {
            zh: '让Layout进入retained Runtime Session，补齐SSR handoff、transaction diagnostic、commit后artifact/ref出口与第三方renderer注入。',
            en: 'Moves Layout onto retained Runtime Sessions with SSR handoff, transaction diagnostics, post-commit artifact/ref outputs, and third-party renderer injection.',
          },
          items: [],
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
        zh: 'Vanilla plain spec 直接透传 Core v0.5 IR；IR/plain mount使用retained Session，Scene mount保留static full render。',
        en: 'Vanilla plain specs pass Core v0.5 IR through directly. IR/plain mounts use retained Sessions, while Scene mounts preserve static full rendering.',
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
            zh: 'IR与plain spec返回`mode: "retained"` view，`update()`原子切换Scene、runtimeMeta、artifacts、animation与renderer config；升级后必须继续传同层IR/plain输入。预编译Scene返回`mode: "static"`，用于保留Scene→Scene完整重绘；DPR、compile或Definition拓扑变化要求dispose后remount。Plain-spec composite callback失败时回滚。',
            en: 'IR and plain specs return `mode: "retained"` views whose `update()` atomically switches Scene, runtime metadata, artifacts, animation, and renderer config; after upgrading, keep passing input from the same IR/plain layer. Precompiled Scenes return `mode: "static"` for full-redraw Scene-to-Scene updates. DPR, compile, or Definition topology changes require disposal and remounting. Plain-spec composite callbacks roll back on failure.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-29',
          summary: {
            zh: '交付SVG/Canvas retained view、transactional update/diagnostics/hydration、第三方renderer注入与plain-spec composite callback transaction。',
            en: 'Ships retained SVG/Canvas views, transactional updates/diagnostics/hydration, third-party renderer injection, and plain-spec composite callback transactions.',
          },
          items: [],
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
