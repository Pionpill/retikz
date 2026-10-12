import type { Release } from '../types';

/** Viz v0.2 开发中里程碑 */
export const vizV02: Release = {
  minor: 'v0.2',
  stableDate: null,
  packages: [
    {
      pkg: '@retikz/data',
      stableDate: null,
      version: 'v0.2',
      description: {
        zh: 'Data v0.2 统一开放 operation 的 Source schema 与 Definition dispatch，使宿主只消费一次精确 Zod 解析结果。',
        en: 'Data v0.2 unifies open-operation Source schemas and Definition dispatch so hosts consume one exact Zod parse result.',
      },
      highlights: [
        {
          label: { zh: '待发布：排序与分桶计算分组', en: 'Unreleased: grouped sorting and binning' },
          content: {
            zh: 'sort 与 bin 支持可选 params.groupBy，多个字段组成计算分组。sort 在组内稳定排序，组按字段层级及每层首次出现顺序输出；bin 各组独立分桶并保留组字段与类型，显式 extent 让所有组共用范围，来源证据仅包含实际桶成员。未指定分组时行为保持。行组织文档提供全局、team、item 和组合分组控件。',
            en: 'sort and bin accept optional params.groupBy with composite field keys. sort is stable within each group and emits groups in field hierarchy with first-seen keys at each level. bin computes independent bins, retains group fields and types, shares explicit extents across groups, and tracks only actual bucket members. Ungrouped behavior is unchanged. Row organization demos expose global, team, item, and composite grouping.',
          },
        },
        {
          label: {
            zh: '待发布：BREAKING 统一 transform 参数',
            en: 'Unreleased: BREAKING unified transform parameters',
          },
          content: {
            zh: '所有数据变换统一使用 { kind, params }。各变换公开 XxxParamsSchema，defineTransform 接收 kind 与 paramsSchema，通过 createTransformSchema 组装完整操作契约。Plot、Chart、Table 及适配器同步采用新写法；operation/dataExecution 外层声明、统计子算子、计算算法与默认行为保持不变，不保留扁平写法。',
            en: 'All data transforms use { kind, params }. Each exposes XxxParamsSchema; defineTransform accepts kind and paramsSchema and assembles the operation contract through createTransformSchema. Plot, Chart, Table, and adapters use this shape. The operation/dataExecution declaration, statistical sub-operations, algorithms, and defaults are unchanged; flat operations are removed.',
          },
        },
        {
          label: {
            zh: '待发布：变换结果模型与错误定位修复',
            en: 'Unreleased: transform result models and diagnostics',
          },
          content: {
            zh: '外部结果补充的字段类型在后续本地保留或继承字段时继续有效，空结果也不会丢失类型证据。阶段结果模型或值域不匹配的错误现在携带 operation 下标并保留原因为 cause。',
            en: 'Field types supplied by external results survive subsequent local field preservation or inheritance, including empty results. Stage result model or value mismatches now include the operation index and preserve the original cause.',
          },
        },
        {
          label: { zh: '待发布：可扩展分类顺序', en: 'Unreleased: extensible category orders' },
          content: {
            zh: '新增 naturalAscending / naturalDescending，按数字片段排列版本标签。Data 统一提供 defineFieldOrder、resolveFieldOrderRegistry 与 resolveCategoryDomain；Plot、Table 及适配器通过 fieldOrderDefinitions 注入。原有顺序语义不变，Table 不自动重排行列。移除 Plot 的 CategoryOrder / orderedCategoryDomain 导出。',
            en: 'Adds naturalAscending / naturalDescending for version labels. Data exports defineFieldOrder, resolveFieldOrderRegistry, and resolveCategoryDomain; Plot, Table, and adapters accept fieldOrderDefinitions. Existing orders remain unchanged; Table does not reorder rows or columns. Removes Plot CategoryOrder / orderedCategoryDomain exports.',
          },
        },
        {
          label: {
            zh: '待发布：BREAKING 变换语义与计算分离',
            en: 'Unreleased: BREAKING transform semantics and computation split',
          },
          content: {
            zh: 'Definition 只声明 schema、字段模型与统计依赖；计算移入独立 Implementation。Data 根入口提供 executor、builtin/external/hybrid、Promise、取消与完整结果模型接入。宿主声明改为 { operation, dataExecution? }；不保留旧组合 Definition 或裸 operation 宿主写法。',
            en: 'Definitions declare schemas, field models and statistical dependencies; separate Implementations compute results. The Data root exposes executors, builtin/external/hybrid modes, Promises, cancellation and complete result-model ingress. Host declarations use { operation, dataExecution? }; combined Definitions and bare host operations are removed.',
          },
        },
        {
          label: { zh: '待发布：BREAKING 数据变换统一归属', en: 'Unreleased: BREAKING unified data transforms' },
          content: {
            zh: 'stack、bin、normalize、derive-interval、relate、jitter、density 与 smooth 的 schema、类型和实现迁入 @retikz/data 根入口，与既有四种操作共用默认 registry；从 BuiltinDataTransform 和 IRDataXxxTransform 导入，不再使用 Plot 的具体变换导出或组合 registry。PlotTransform 作者组件保留；宿主声明使用 operation 包装，执行策略独立配置，操作默认值与声明顺序保持不变。',
            en: 'The schemas, types, and implementations of stack, bin, normalize, derive-interval, relate, jitter, density, and smooth move to the @retikz/data package root and share the default registry with its four existing operations. Import BuiltinDataTransform and IRDataXxxTransform from Data instead of Plot-specific exports or its combined registry. The PlotTransform authoring component remains; host declarations wrap operation parameters and configure execution separately, preserving operation defaults and declaration order.',
          },
        },
        {
          label: { zh: '单一 Source 校验边界', en: 'Single Source validation boundary' },
          content: {
            zh: 'transform 的 params JSON 对象、reducer 与 selector 的开放配置由各自 Source schema 校验；registry dispatch 后只运行命中的 Definition schema，不再在前后重复执行通用 JSON object 检查。',
            en: 'Transform params JSON objects and open reducer and selector configuration are validated by their Source schemas. After registry dispatch, only the matched Definition schema runs, with no generic JSON-object checks before or after it.',
          },
        },
      ],
      subVersions: [
        {
          version: 'alpha.1',
          date: '2026-09-05',
          summary: {
            zh: '让 owner Zod schema 成为开放 Data operation 的唯一 Source 校验与投影边界。',
            en: 'Makes the owner Zod schema the only Source validation and projection boundary for open Data operations.',
          },
          items: [
            {
              label: {
                zh: 'BREAKING：Definition 精确 schema 独占解析',
                en: 'BREAKING: exact Definition schemas own parsing',
              },
              content: {
                zh: '公开 operation schema 直接拒绝 function、symbol、bigint、非有限数等非法 JSON 叶子并使用 Zod 原生 catchall path；命中的 Definition schema transform 结果直接交给 callback，不再被第二道通用 JSON guard 否定。',
                en: 'Public operation schemas reject functions, symbols, bigints, non-finite numbers, and other invalid JSON leaves through native Zod catchall paths. A matched Definition schema transform now flows directly to its callback instead of being rejected by a second generic JSON guard.',
              },
            },
          ],
        },
      ],
    },
    {
      pkg: '@retikz/plot',
      stableDate: null,
      version: 'v0.2',
      description: {
        zh: '整理 Plot 文档入口，按图形语法组织阅读路径。',
        en: 'Reorganizes the Plot docs entry points around the grammar of graphics.',
      },
      highlights: [
        {
          label: { zh: '待发布：BREAKING 渐进式视觉属性', en: 'Unreleased: BREAKING progressive visual properties' },
          content: {
            zh: "opacity 支持简单值或 overall/fill/stroke 分组，各成员独立绑定字段、常量和比例尺。标签使用 label: 'name' 或 { field/value, position, distance, ... }，支持数组；删除平级 label 配置。Source 标签继续使用 content 分组，Core 标签字符串仍是文字。",
            en: "opacity accepts a simple value or an overall/fill/stroke group with independent field, constant, and scale bindings. Use label: 'name' or { field/value, position, distance, ... }, including arrays; flat label options are removed. Source labels retain content grouping, and Core label strings remain literal text.",
          },
        },
        {
          label: { zh: '待发布：入口文档', en: 'Unreleased: Entry documentation' },
          content: {
            zh: '新增简介与快速开始，将更新日志移至入口区，补充图形语法侧栏分区与面向使用者的总纲。',
            en: 'Adds Introduction and Quick start, moves Changelog to the entry area, and adds a grammar sidebar group and user-facing overview.',
          },
        },
      ],
      subVersions: [],
    },
    {
      pkg: '@retikz/plot-react',
      stableDate: null,
      version: 'v0.2',
      description: { zh: '补充 React 首次接入示例。', en: 'Adds a first-use example for React.' },
      highlights: [
        {
          label: { zh: '待发布：React 快速开始', en: 'Unreleased: React quick start' },
          content: {
            zh: '通过 Plot、PathMark 与 PlotAxis 展示从安装、数据绑定到挂载图形的完整步骤。',
            en: 'Shows installation, data binding, and mounting through Plot, PathMark, and PlotAxis.',
          },
        },
      ],
      subVersions: [],
    },
    {
      pkg: '@retikz/plot-vanilla',
      stableDate: null,
      version: 'v0.2',
      description: { zh: '补充 Vanilla 首次接入示例。', en: 'Adds a first-use example for Vanilla.' },
      highlights: [
        {
          label: { zh: '待发布：Vanilla 快速开始', en: 'Unreleased: Vanilla quick start' },
          content: {
            zh: '通过 plot() 与 renderPlot() 展示显式比例尺、坐标系、图元和辅助配置，以及 SVG 输出。',
            en: 'Shows explicit scales, coordinates, marks, guides, and SVG output with plot() and renderPlot().',
          },
        },
      ],
      subVersions: [],
    },
  ],
};
