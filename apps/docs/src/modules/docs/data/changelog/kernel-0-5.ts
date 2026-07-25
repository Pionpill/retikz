import type { Release } from '../types';

export const kernelV05: Release = {
  minor: 'v0.5',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/core',
      version: 'v0.5',
      description: {
        zh: 'v0.5 继续补齐跨图元布局能力；alpha.1 增加 Node 锚点与标签视觉盒语义，并引入布局感知 Composite、compile-local replay 与 typed artifacts。',
        en: 'v0.5 continues the cross-primitive layout foundation; alpha.1 adds Node anchor and label-box semantics plus layout-aware composites, compile-local replay, and typed artifacts.',
      },
      highlights: [
        {
          label: { zh: 'Node 锚点对齐定位', en: 'Node anchor-to-anchor placement' },
          content: {
            zh: '`Node.position` 新增 `{ kind: "anchor", target, selfAnchor? }`：文本、shape、padding、margin、scale 与 rotate 布局完成后再整体平移；目标支持已完成布局的 Node、Coordinate 与 Scope，双方 anchor 默认 center。未定义、后置、自引用和仍在布局的祖先 Scope 会直接报错，已解析空 Scope 合法。',
            en: '`Node.position` adds `{ kind: "anchor", target, selfAnchor? }`. The compiler completes text, shape, padding, margin, scale, and rotation layout before translating the whole Node. Targets may be already-laid-out Nodes, Coordinates, or Scopes, and both anchors default to center. Undefined, later, self, and still-open ancestor Scope targets fail loudly, while a resolved empty Scope remains valid.',
          },
        },
        {
          label: { zh: 'Node 标签视觉框间距', en: 'Node label visual-box spacing' },
          content: {
            zh: '`Node.label.distance` 现在表示节点边界到旋转后标签视觉框的净距，而不是到标签中心的距离；`distance: 0` 精确贴边，inside / outside 共用同一盒几何。标签度量在节点矩形前完成，之后不再重新测量；基线、pin 精确交点、Scene 边界与自动 viewBox 复用同一结果。非法默认距离或 `measureText` 度量会立即报错；非法 TeX 盒仍发出 `TEX_INVALID` warning 并跳过对应 run。',
            en: '`Node.label.distance` now means the net gap from the node boundary to the rotated label visual box rather than the label center. `distance: 0` touches exactly, and inside / outside share the same box geometry. Label metrics settle before the node rectangle and the same result drives baselines, exact pin intersections, Scene bounds, and the automatic viewBox. Invalid default distances or `measureText` metrics fail loudly; invalid TeX boxes still emit a `TEX_INVALID` warning and skip the affected run.',
          },
        },
        {
          label: { zh: '布局感知 Composite 与显式编译产物', en: 'Layout-aware composites and explicit artifacts' },
          content: {
            zh: '`defineComposite()` 新增与 `expand` 互斥的 `compile` 分支，可通过 `layoutChild()` 完成 intrinsic / constrained 布局并单次 replay；未采用的 probe 不发布副作用。`compileToScene()` 现在返回 `{ scene, artifacts }`，原 `const scene = compileToScene(ir)` 需改为 `const { scene, artifacts } = compileToScene(ir)`；`onNodeLayout` 改为 `artifacts: { nodeLayouts: true }` 后筛选 Node layout artifact。',
            en: '`defineComposite()` adds a `compile` branch mutually exclusive with `expand`. It can perform intrinsic or constrained child layout through `layoutChild()` and replay the selected result once, while discarded probes publish no side effects. `compileToScene()` now returns `{ scene, artifacts }`; migrate `const scene = compileToScene(ir)` to `const { scene, artifacts } = compileToScene(ir)`, and replace `onNodeLayout` with `artifacts: { nodeLayouts: true }` plus Node-layout artifact filtering.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-25',
          summary: {
            zh: '新增 Node anchor-to-anchor 定位与标签视觉盒间距，并让 layout-aware Composite 在同次 compile 中测量、约束、replay 与返回 typed artifacts；`compileToScene()` 改为返回 `CompileResult`。',
            en: 'Adds Node anchor-to-anchor placement and visual-box label spacing, while layout-aware composites can measure, constrain, replay, and return typed artifacts in one compile; `compileToScene()` now returns `CompileResult`.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/react',
      version: 'v0.5',
      description: {
        zh: 'React 等价暴露 core 的 anchor-to-anchor 定位，并让 `<Layout>` 在 commit 后通知同次 compile 的 immutable artifacts。',
        en: 'React exposes core anchor-to-anchor placement and lets `<Layout>` notify immutable artifacts from the same compile after commit.',
      },
      highlights: [
        {
          label: { zh: 'Layout 编译产物通知', en: 'Layout compile-artifact notification' },
          content: {
            zh: '`<Layout>` 新增 `artifacts` 与 `onArtifacts`：前者声明 Node layout 等 opt-in 产物，后者只在 React commit 后接收 Core 返回的 immutable 数组。原 `onNodeLayouts` 需改为 `artifacts={{ nodeLayouts: true }}` 与 `onArtifacts`，再用 `isNodeLayoutCompileArtifact()` 筛选。',
            en: '`<Layout>` adds `artifacts` and `onArtifacts`: the former requests opt-in outputs such as Node layouts, while the latter receives Core’s immutable array only after the React commit. Replace `onNodeLayouts` with `artifacts={{ nodeLayouts: true }}` and `onArtifacts`, then filter with `isNodeLayoutCompileArtifact()`.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-25',
          summary: {
            zh: '`NodeProps.position` 接受 `IRAnchorPosition`；`LayoutProps` 以 `artifacts` / `onArtifacts` 替代 `onNodeLayouts`，不增加 React 私有产物通道。',
            en: '`NodeProps.position` accepts `IRAnchorPosition`; `LayoutProps` replaces `onNodeLayouts` with `artifacts` / `onArtifacts` without adding a React-only artifact channel.',
          },
          items: [],
        },
      ],
    },
    {
      pkg: '@retikz/vanilla',
      version: 'v0.5',
      description: {
        zh: 'Vanilla plain spec 透传 `IRAnchorPosition`，SVG / Canvas view 同步暴露与当前 Scene 原子更新的 compile artifacts。',
        en: 'Vanilla plain specs pass through `IRAnchorPosition`, while SVG and Canvas views expose compile artifacts updated atomically with the current Scene.',
      },
      highlights: [
        {
          label: { zh: 'View 与 Scene 同步持有 artifacts', en: 'Views retain artifacts with the Scene' },
          content: {
            zh: '`VanillaView.artifacts` 与 `CanvasView.artifacts` 返回当前 IR / plain spec 同次 compile 的 immutable 产物数组，并在 `update()` 后与 Scene 一起替换；直接传入 Scene 时固定为空数组。`toScene()` 仍只返回 Scene。',
            en: '`VanillaView.artifacts` and `CanvasView.artifacts` expose the immutable outputs from the same IR or plain-spec compile and replace them atomically with the Scene after `update()`. Direct Scene input always yields an empty array, and `toScene()` still returns only the Scene.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-07-25',
          summary: {
            zh: '`node()` 直接接受 core anchor position；mount view 新增只读 `artifacts`，保持与 Core `CompileResult` 同源且不二次 compile。',
            en: '`node()` directly accepts core anchor positions; mounted views add readonly `artifacts` sourced from Core `CompileResult` without a second compile.',
          },
          items: [],
        },
      ],
    },
  ],
};
