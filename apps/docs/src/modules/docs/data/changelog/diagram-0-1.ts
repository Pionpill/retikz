import type { Release, SubVersion } from '../types';

const diagramMilestones: Array<SubVersion> = [
  {
    version: 'alpha.1',
    date: '2026-09-14',
    summary: {
      zh: '首次发布 Diagram package family，以 LLM-first Flow Source、自动分层布局和 renderer-neutral artifact 完成站点逻辑图闭环。',
      en: 'First Diagram package-family release, completing site logic diagrams with an LLM-first Flow Source, automatic layered layout, and renderer-neutral artifacts.',
    },
    items: [
      {
        label: { zh: '待发布 · 同级容器等宽', en: 'Unreleased · Equal-width sibling containers' },
        content: {
          zh: 'FlowLayout 增加 containerWidth: match-largest，为同级横向行或单内容根 Group 分配相同宽度；内部 itemWidth: fill 在自然宽度上均分增量，固定宽度节点不增长。',
          en: 'FlowLayout adds containerWidth: match-largest for sibling horizontal rows or single-root Groups. Inner itemWidth: fill shares extra space over natural widths while fixed-width nodes remain unchanged.',
        },
      },
      {
        label: { zh: '待发布 · 端点选侧与自动等分', en: 'Unreleased · Endpoint sides and automatic spacing' },
        content: {
          zh: 'Relation source/target 支持 { id, side?, overlap? } 或固定 anchor；separate 在同侧按 i/(n+1) 分配独立位置，allow 共用位置，固定锚点不移动。BREAKING：自定义布局输入端点改为对象并声明 endpointPlacement，输出及 artifact 的 source/target 改为 { id, anchor? }；用 resolveEndpoint 查询真实边界。自动比例要求形状支持 Core side anchor，当前 polygon 不支持；不保证箭头图形或路径无重叠。',
          en: 'Relation source/target supports { id, side?, overlap? } or a fixed anchor. Separate endpoints use i/(n+1) slots per side; allow endpoints share a slot and fixed anchors never move. BREAKING: custom layouts consume endpoint objects and declare endpointPlacement; output and artifact endpoints become { id, anchor? }. Use resolveEndpoint for real boundaries. Automatic fractions require Core side-anchor support, currently unavailable for polygon; arrow-shape and route overlap are not prevented.',
        },
      },
      {
        label: { zh: '待发布 · 正交连线自动避让', en: 'Unreleased · Automatic orthogonal avoidance' },
        content: {
          zh: 'orthogonal 省略 turnPosition 时比较中点、四分之一与四分之三候选；显式比例保持不变。全部受阻保留最佳路线并警告，水平或垂直对齐时直接连接，不作避让。同步三入口与文档控件。公开 routeFlowRelations，供自定义布局在最终元素边界上复用内置路由；避让示例支持移动障碍。',
          en: 'Orthogonal routes compare midpoint, quarter and three-quarter candidates when turnPosition is omitted, preserving explicit fractions. Exhausted searches retain the best route with a warning; aligned endpoints connect directly without avoidance. All entry points and documentation controls share the contract. Public routeFlowRelations lets custom layouts reuse built-in routing on final element bounds; avoidance demos support moving obstacles.',
        },
      },
      {
        label: { zh: '待发布 · 过点曲线路由', en: 'Unreleased · Through-point routing' },
        content: {
          zh: 'Relation 新增 smooth，保留完整 Target 经过点与正数 tension；自动追加关系终点。Core 提供同次编译的真实 Target 查询和 smooth 终点边界连接。布局输出核对所有 knots，保留重复点；逐段最多二分 8 层检测，冲突警告但不搜索或改点。React、Vanilla、IR、完整标签与 artifact 使用同一契约。',
          en: 'Relations add smooth routing with full Target waypoints and positive tension, automatically appending the relation target. Core provides compile-local Target queries and smooth terminal boundary connections. Output validation checks all knots and retains duplicates. Per-segment collision checks subdivide up to 8 levels and warn without searching or moving points. React, Vanilla, IR, full labels and artifacts share the contract.',
        },
      },
      {
        label: {
          zh: '待发布 · 贝塞尔路由与 BREAKING 布局能力声明',
          en: 'Unreleased · Bezier routing and BREAKING layout capabilities',
        },
        content: {
          zh: 'Relation 支持自动及完整显式 curve/cubic，省略控制点自动求解，三次部分控制点拒绝。有限搜索最多提出 13/49 条候选，碰撞最多二分 8 层；冲突保留路线并警告，仅保证参考几何检测。自定义 Layout Definition 将 capabilities.routingKinds 迁移为 capabilities.routing，每项为 { kind }，贝塞尔额外声明 modes。artifact.regions.drawing 新增必填 origin，用于控制点回写 Flow 根坐标。',
          en: 'Relations support automatic and complete explicit curve/cubic routing. Omitted controls request generation; partial cubic controls are rejected. Search proposes at most 13/49 candidates and collision checks bisect at most 8 levels; conflicts retain routes with warnings and checks cover reference geometry only. Custom Layout Definitions must replace capabilities.routingKinds with capabilities.routing entries { kind }, adding modes for Bezier. artifact.regions.drawing now requires origin for converting controls back to Flow root coordinates.',
        },
      },
      {
        label: { zh: '曲线路由与完整标签', en: 'Bend routing and complete labels' },
        content: {
          zh: 'Flow 新增 bend 常规曲线路由，支持左右 30°/45°/60° 自动选择（节点优先、标签次级，不比较边交叉）、显式方向和完整切线配置；节点冲突保留绘制并提供 Source 定位警告。Relation.label 支持完整 Core 几何与外观配置。Layout provider 输出从 points 改为有判别的 route，artifact 保留同一参考几何。provider 对称 bend 输入允许省略角度进行搜索，Definition 不设置 bendAngle 默认；不提供全局避障或自环。',
          en: 'Flow adds regular bend routing with automatic selection among left/right 30°/45°/60° candidates (nodes first, labels second, no edge-crossing comparison), explicit sides, and complete tangent parameters. Node conflicts retain the drawing and emit source-located warnings. Relation.label accepts complete Core geometry and appearance settings. Layout provider outputs change from points to discriminated route objects, shared by artifacts. Symmetric provider inputs may omit the angle for automatic search; Definitions do not set a bendAngle default. Global obstacle avoidance and self-loops are not provided.',
        },
      },
      {
        label: { zh: '布局边界贡献控制', en: 'Layout bounds contribution' },
        content: {
          zh: 'FlowLayout 的 excludeFromBounds 可局部排除直接子项对上层占位的贡献，同时保留子树排列、独立连线与完整绘制范围。Linear/Grid 和三入口使用统一契约；可见 Group 仍包含全部后代，不提供 absolute 定位或自动避障。',
          en: 'FlowLayout excludeFromBounds locally excludes direct children from the footprint reported to its parent while preserving subtree placement, independent relations, and complete drawing bounds. Linear/Grid and all three entries share one contract. Visible Groups still enclose all descendants; absolute positioning and obstacle avoidance are not provided.',
        },
      },
      {
        label: { zh: '单折角路由', en: 'Single-elbow routing' },
        content: {
          zh: 'Flow routing 新增 `-|`（先水平后垂直）与 `|-`（先垂直后水平），支持继承圆角半径与显式零半径。复用 Layout Definition 能力声明、Graph/Core 边界裁剪与三入口；默认路由和间距不变，不提供自动避障。',
          en: 'Flow routing adds `-|` (horizontal then vertical) and `|-` (vertical then horizontal), with inherited corner radii and explicit zero-radius corners. Both reuse Layout Definition capabilities, Graph/Core boundary clipping, and all three entries. Default routing and spacing remain unchanged; automatic obstacle avoidance is not provided.',
        },
      },
      {
        label: { zh: '平级 JSON Source', en: 'Flat JSON Source' },
        content: {
          zh: '`IRFlowDiagram` 使用平级 `entities` / `groups` / `layouts` catalog，根、Group 与 Layout 的 `children` id 列表是唯一包含事实。数组已表达声明类别，因此记录不重复保存元素 `type`，Group 也不再携带变体 `kind`。这是 breaking 变更：旧递归 `elements`、Group `kind` 与 element `type` 不提供兼容入口。',
          en: '`IRFlowDiagram` uses flat `entities` / `groups` / `layouts` catalogs, with root, Group, and Layout `children` id lists as the only containment fact. The catalogs already identify declaration categories, so records repeat neither element `type` nor a Group variant `kind`. This is a breaking change: old recursive `elements`, Group `kind`, and element `type` have no compatibility entry.',
        },
      },
      {
        label: { zh: '统一主题与布局扩展', en: 'Unified theme and layout extensions' },
        content: {
          zh: '同名 Theme Definition 生成 Source 同构的稀疏默认，作者通过 `diagramDefaults` / `flowDefaults` 覆盖，实例字段最终优先。内置 `layered` 与自定义同步 Layout Definition 经过同一 registry、catalog、capability preflight 和输出校验；同名 Graph Theme 提供 reference 外观，Flow 只物化自己的明确覆盖。',
          en: 'Same-name Theme Definitions generate sparse defaults shaped like Source. Authors override them through `diagramDefaults` and `flowDefaults`, with instance fields taking final priority. Built-in `layered` and custom synchronous Layout Definitions share one registry, catalog, capability preflight, and output validation path. Graph Theme supplies reference appearance, while Flow materializes only its own explicit overrides.',
        },
      },
      {
        label: { zh: 'BREAKING：Source 与默认片段对齐', en: 'BREAKING: Source and default fragments align' },
        content: {
          zh: '删除 `diagramTheme`、`flowTheme` 和 `flowThemeTokens`。标题与描述改用 `{ text, style?, layout? }`；Entity 文本排版移至 `layout`，Group 改用根 Surface 字段与 `caption.title`，Relation marker/label 格式回到根字段。Root/Group 的 `layout` 与 `routing` 分离，Relation 直接使用 `routing`；主题默认不再决定方向或路由。Node font 整体替换，labelFont 按字段补全，不提供旧结构兼容。',
          en: 'Removes `diagramTheme`, `flowTheme`, and `flowThemeTokens`. Titles and descriptions use `{ text, style?, layout? }`; Entity text layout moves to `layout`, Groups use root Surface fields and `caption.title`, and Relation marker/label formatting returns to root fields. Root/Group `layout` and `routing` are separate, and Relations use `routing` directly. Theme defaults no longer choose direction or routing. Node fonts replace as a whole, labelFont fields merge, and old structures have no compatibility aliases.',
        },
      },
      {
        label: { zh: '自动布局、固定排列与路由', en: 'Automatic layout, fixed placement, and routing' },
        content: {
          zh: 'layered 支持四方向、rank、cycle、parallel relation、递归 scope、跨 scope relation 和 Group endpoint。FlowLayout 通过 kind 选择 linear 或 grid，复用 Flex / Grid 排列直接子项；Layout 不可作为 endpoint。自动 nodeGap/rankGap 默认 48，固定排列默认横向 48、纵向 32，作者显式间距优先。',
          en: 'layered supports four directions, ranks, cycles, parallel and cross-scope relations, recursive scopes, and Group endpoints. FlowLayout selects linear or grid by kind and reuses Flex/Grid to place direct children; Layouts cannot be endpoints. Automatic nodeGap/rankGap default to 48; fixed placement defaults to 48 horizontally and 32 vertically, with explicit author gaps taking priority.',
        },
      },
      {
        label: { zh: '可诊断结果与三入口等价', en: 'Diagnosable results and entry parity' },
        content: {
          zh: 'compile 返回 `entity | group | layout` 递归 element bounds、按 Source 顺序对齐的 relation routes、label reservation、Foundation regions 与真实 spatial handles；Layout 使用独立 `layout` artifact kind 与 handle role。Direct IR、平级 Vanilla 与嵌套 React JSX 最终逐字段归一为同一 Source。',
          en: 'Compilation returns recursive `entity | group | layout` element bounds, relation routes aligned by Source order, label reservations, Foundation regions, and real spatial handles. Layouts use an independent `layout` artifact kind and handle role. Direct IR, flat Vanilla input, and nested React JSX normalize field-for-field into the same Source.',
        },
      },
      {
        label: {
          zh: 'BREAKING：Source 字段遵循 Zod optional',
          en: 'BREAKING: Source fields follow Zod optional semantics',
        },
        content: {
          zh: 'Diagram foundation schema 不再单独递归拒绝已知 optional 字段中的显式 `undefined`；字段缺失与显式值完全遵循 owner schema，同时继续保留各 owner 的非空与跨字段约束（Flow Entity / Relation 文本须含非空内容）。Flow Layout Definition 因没有持久化 schema，仍保留独立 plain-container guard。',
          en: 'Diagram foundation schemas no longer recursively reject explicit `undefined` in known optional fields. Missing and explicit values follow the owner schema, while owner-specific nonempty and cross-field constraints remain (Flow Entity/Relation text must contain nonblank content). Flow Layout Definitions have no persisted schema and retain their independent plain-container guard.',
        },
      },
      {
        label: { zh: '统一宽度与 Graph 外观', en: 'Uniform widths and Graph appearance' },
        content: {
          zh: 'FlowLayout.itemWidth 可为直接 Entity 统一测量宽度；Flow 接入 graphRules、Entity 状态与分组颜色。Entity、关系标签、标题与描述复用 Core TextBlock；布局仅消费真实文本测量。',
          en: 'FlowLayout.itemWidth can unify measurement widths for direct Entities. Flow supports graphRules, Entity statuses, and group colors. Entity text, relation labels, titles, and descriptions reuse Core TextBlock and actual text measurement.',
        },
      },
      {
        label: { zh: 'Node.js 22', en: 'Node.js 22' },
        content: {
          zh: '最低 Node.js 版本调整为 22.12.0。',
          en: 'The minimum Node.js version is now 22.12.0.',
        },
      },
    ],
  },
];

/** Diagram v0.1 里程碑 */
export const diagramV01: Release = {
  minor: 'v0.1',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/diagram',
      version: 'v0.1',
      description: {
        zh: 'LLM-first Flow Source、Definition registry、自动布局 / 路由、Graph materialization 与 renderer-neutral artifact。',
        en: 'LLM-first Flow Sources, Definition registries, automatic layout/routing, Graph materialization, and renderer-neutral artifacts.',
      },
      highlights: [
        {
          label: { zh: '站点逻辑图闭环', en: 'Site logic-diagram closure' },
          content: {
            zh: '`FlowDiagramSchema`、Flow Theme / Layout Definitions、内置 `layered`、单次编排与 artifact 组成同一 `/flow` 公共入口，可从关系、分组与少量约束确定性推导完整图。',
            en: '`FlowDiagramSchema`, Flow Theme/Layout Definitions, built-in `layered`, single-pass orchestration, and artifacts share one `/flow` public entry and deterministically derive a complete diagram from relations, groups, and a small set of constraints.',
          },
        },
      ],
      subVersions: [...diagramMilestones],
    },
    {
      pkg: '@retikz/diagram-react',
      version: 'v0.1',
      description: {
        zh: 'FlowDiagram 的 React authoring 入口，提供 standalone host 与 embedded composite。',
        en: 'React authoring for FlowDiagram with standalone-host and embedded-composite modes.',
      },
      highlights: [
        {
          label: { zh: '声明式 Flow 组件', en: 'Declarative Flow components' },
          content: {
            zh: '`FlowDiagram`、单项 `FlowEntity` / `FlowRelation`、可追加或用 `complete` 声明完整清单的 `FlowEntities` / `FlowRelations`、`FlowGroup` 与 `FlowLayout` 归一化为同一 Source；standalone 复用 Layout host，embedded 只贡献 composite。',
            en: '`FlowDiagram`, individual `FlowEntity` / `FlowRelation`, additive or `complete` `FlowEntities` / `FlowRelations` lists, `FlowGroup`, and `FlowLayout` normalize into the same Source; standalone mode reuses the Layout host while embedded mode contributes only a composite.',
          },
        },
      ],
      subVersions: [...diagramMilestones],
    },
    {
      pkg: '@retikz/diagram-vanilla',
      version: 'v0.1',
      description: {
        zh: 'FlowDiagram 的无框架 builder、normalize 与 InputEmbed adapter。',
        en: 'Framework-free FlowDiagram builders, normalization, and InputEmbed adapters.',
      },
      highlights: [
        {
          label: { zh: 'Vanilla 与 Direct IR 同源', en: 'Vanilla and Direct IR share one source' },
          content: {
            zh: '`flowDiagram()` 与 `FlowDiagramInputEmbedAdapter` 只组装 `IRFlowDiagram` 并复用 Diagram provider contribution，不在 adapter 中维护布局、测量、主题或 catalog。',
            en: '`flowDiagram()` and `FlowDiagramInputEmbedAdapter` only assemble `IRFlowDiagram` and reuse the Diagram provider contribution, keeping layout, measurement, themes, and catalogs out of the adapter.',
          },
        },
      ],
      subVersions: [...diagramMilestones],
    },
  ],
};
