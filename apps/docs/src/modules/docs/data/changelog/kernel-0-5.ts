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
      ],
      subVersions: [
        {
          version: 'alpha.2',
          date: '2026-07-26',
          summary: {
            zh: '交付 performance trace、Owner / Program typed identity、同步 transaction、fallback、diagnostic queue 与 exactly-once lifecycle。',
            en: 'Ships performance traces, typed Owner/Program identity, synchronous transactions, fallback, diagnostic queues, and exactly-once lifecycle management.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/core',
      version: 'v0.5',
      description: {
        zh: 'v0.5 alpha.1 补齐跨图元布局与文本语义：Node / Scope 锚点、正交路径、自动对比色、标签视觉盒、布局感知 Composite、typed artifacts 与多路径 TeX lowering。',
        en: 'v0.5 alpha.1 adds Node/Scope anchors, orthogonal paths, automatic text contrast, visual-box labels, layout-aware composites, typed artifacts, and multi-path TeX lowering.',
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
            zh: '`defineComposite()` 支持与 `expand` 互斥的 `compile` 分支，可通过 `layoutChild()` 做 intrinsic / constrained 布局并单次 replay。`compileToScene()` 返回 `{ scene, artifacts }`；混合 registry 使用 `AnyCompositeDefinition`，Node layout 通过带 `occurrence` 的 opt-in typed artifact 提供。',
            en: '`defineComposite()` supports a `compile` branch mutually exclusive with `expand`, enabling intrinsic or constrained `layoutChild()` work followed by one replay. `compileToScene()` returns `{ scene, artifacts }`; mixed registries use `AnyCompositeDefinition`, and Node layouts are exposed as opt-in typed artifacts with an `occurrence`.',
          },
        },
      ],
      subVersions: [
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
        zh: 'SVG / Canvas renderer 继续只消费 Scene；alpha.1 验证多路径 TeX paint / opacity 与 CompileResult 不引入 renderer 私有 API。',
        en: 'SVG and Canvas continue to consume Scene only; alpha.1 verifies multi-path TeX paint and opacity plus CompileResult without renderer-specific APIs.',
      },
      highlights: [],
      subVersions: [
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
        zh: 'React 等价暴露 Core v0.5 的 Node / Scope placement、正交 Step 与文本语义，并让 `<Layout>` 在 commit 后通知同次 compile 的 immutable artifacts。',
        en: 'React exposes Core v0.5 Node/Scope placement, orthogonal steps, and text semantics, while `<Layout>` reports immutable artifacts from the same compile after commit.',
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
      ],
      subVersions: [
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
        zh: 'Vanilla plain spec 直接透传 Core v0.5 IR；SVG / Canvas view 与当前 Scene 原子持有同次 compile 的 artifacts。',
        en: 'Vanilla plain specs pass Core v0.5 IR through directly, while SVG and Canvas views atomically retain artifacts from the same compile as the current Scene.',
      },
      highlights: [
        {
          label: { zh: 'View 与 Scene 同步持有 artifacts', en: 'Views retain artifacts with the Scene' },
          content: {
            zh: '`VanillaView.artifacts` 与 `CanvasView.artifacts` 在 `update()` 后和 Scene 一起替换；直接传入 Scene 时固定为空 immutable 数组。`toScene()` 仍只返回 Scene。',
            en: '`VanillaView.artifacts` and `CanvasView.artifacts` update atomically alongside Scene after `update()`. Direct Scene input exposes an empty immutable array, and `toScene()` returns Scene only.',
          },
        },
      ],
      subVersions: [
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
