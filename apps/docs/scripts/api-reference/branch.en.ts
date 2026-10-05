const translations: Partial<Record<string, string>> = {
  '分支方向与净间距覆盖值，由布局解析补齐缺省项':
    'Overrides for branch direction and clear gaps; layout resolution fills omitted values',
  '共享节点目录，保留各节点可省略的尺寸与外观字段':
    'Shared node catalog preserving optional size and appearance fields on each node',
  保留节点与布局缺省值尚未物化的分支图作者输入:
    'Branch authoring input with node and layout defaults not yet materialized',
  能力提供者的注册键: 'provider key',
  'Core 节点的位置': 'Core Node position',
  平级节点与有序分支声明: 'Flat node and ordered branch declarations',
  '将 BranchDiagram Source root 接入 React 编写与 Layout 宿主':
    'Connect a BranchDiagram Source root to React authoring and the Layout host',
  'Branch JSX 作者属性': 'Branch JSX authoring props',
  '声明一个共享节点；位置由 Branch 布局决定': 'Declare a shared node positioned by Branch layout',
  'Branch 节点声明属性': 'Branch node declaration props',
  '声明 BranchDiagram 内一条有序路径': 'Declare an ordered path inside BranchDiagram',
  有序节点路径声明属性: 'Ordered node path declaration props',
  '创建 Branch Diagram Source root 的 authoring embed 节点':
    'Create an authoring embed for a Branch Diagram Source root',
  'Branch Diagram embed 同时携带 Source authoring 输入与 definitions':
    'A Branch Diagram embed carries Source authoring input and definitions',
  '追加的命名布局，不能覆盖其他定义': 'Additional named layouts; existing definitions cannot be overridden',
  '缺省使用 lanes': 'Uses lanes by default',
  '与 Core Theme style 同名的 Diagram Theme definitions；使用命名主题时需提供匹配定义':
    'Diagram theme definitions matching the Core theme style name; named themes require a matching definition',
  '自定义 Entity kind definitions': 'Custom Entity kind definitions',
  '自定义 Entity predicate definitions': 'Custom Entity predicate definitions',
  '自定义 Entity role definitions': 'Custom Entity role definitions',
  '与 Core Theme style 同名的 Graph Theme definitions': 'Graph theme definitions matching the Core theme style name',
  '自定义 Relation kind definitions': 'Custom Relation kind definitions',
  '自定义 Relation predicate definitions': 'Custom Relation predicate definitions',
  '自定义 Relation role definitions': 'Custom Relation role definitions',
  'Branch 声明与运行时扩展；由 adapter 在编译时组装 Source 和 provider':
    'Branch declarations and runtime extensions; the adapter assembles Source and providers during compilation',
  '保留 input 对象引用的 embed 节点，不在此处执行布局': 'An embed retaining the input reference; no layout runs here',
  '将类型化作者输入组装为唯一 Branch Source，不物化默认值':
    'Assemble typed authoring input into a single Branch Source without materializing defaults',
  '省略固定判别字段的 Branch Diagram 作者输入': 'Branch Diagram authoring input without fixed discriminators',
  'Branch 有序路径的作者输入': 'Authoring input for an ordered Branch path',
  'Branch 节点的作者输入': 'Branch node authoring input',
  'Branch Diagram Source root embed 的稳定 kind': 'Stable embed kind for a Branch Diagram Source root',
  'Branch Diagram Source root 的 InputEmbed adapter': 'InputEmbed adapter for a Branch Diagram Source root',
  '从 adapter props 提取只供 Branch provider assembly 使用的 definitions':
    'Extract definitions for Branch provider assembly from adapter props',
  '创建可一次性传给 Vanilla normalize 的 Branch Diagram adapter 集合':
    'Create the Branch Diagram adapter collection for Vanilla normalization',
  'Branch 与基础 Diagram / Graph 的运行时定义选项':
    'Runtime definition options for Branch and the underlying Diagram and Graph',
  '内置和自定义 Branch 布局的统一同步协议': 'Shared synchronous protocol for built-in and custom Branch layouts',
  布局语义说明: 'Description of layout semantics',
  '完整支持有序分支、主线与测量占位的同步确定性布局':
    'Synchronous deterministic layout supporting ordered branches, the main path, and measured occupancy',
  全局唯一布局名称: 'Globally unique layout name',
  '同步布局的输入；节点保持稳定拓扑序，分支保持声明序':
    'Synchronous layout input with nodes in stable topological order and branches in declaration order',
  唯一有序连接事实源: 'Single source of truth for ordered connections',
  已解析的布局意图: 'Resolved layout intent',
  显式主分支: 'Explicit main branch',
  共享节点只出现一次: 'Each shared node occurs once',
  'Branch 布局所需的真实节点测量': 'Actual node measurements required by Branch layout',
  '作者节点 id': 'Authored node ID',
  原点处标记占位: 'Marker allocation at the origin',
  原点处含标注的可见包络: 'Visible envelope at the origin, including labels',
  '一个节点的 drawing-local 布局位置': 'One node position in drawing-local coordinates',
  '非负轨道编号；不是作者分支身份': 'Nonnegative lane index, not an authored branch identity',
  '原子布局结果，最终路径裁剪由 Core 执行': 'Atomic layout result; Core performs final path clipping',
  每个节点恰好一份几何: 'Exactly one geometry entry per node',
  每个有向相邻段恰好一份路由: 'Exactly one route per directed adjacent segment',
  唯一有向相邻段的参考路由: 'Reference route for a unique directed adjacent segment',
  'Core 圆角请求半径': 'Requested Core corner radius',
  包含端点中心的参考折线: 'Reference polyline including endpoint centers',
  '起点节点 id': 'Source node ID',
  '终点节点 id': 'Target node ID',
  'Branch composite 的公开 provider key': 'Public provider key for the Branch composite',
  '保持主线、共享节点与稳定推进的内置轨道布局':
    'Built-in lane layout preserving the main path, shared nodes, and stable progression',
  '携带布局和主题定义的 Branch provider': 'Branch provider carrying layout and theme definitions',
  '完整 Branch、Graph 与展示装配依赖贡献':
    'Complete dependency contribution for Branch, Graph, and presentation assembly',
  '定义与内置项共享调用和验证链的 Branch 布局':
    'Define a Branch layout using the same execution and validation chain as built-in layouts',
};

const missing = new Set<string>();

/** 翻译源码说明，保持代码字面量不变 */
export const translateBranchApiReference = (source: string): string => {
  const text = source.replace(/\r/g, '');
  if (!/[\u3400-\u9fff]/u.test(text)) return text;
  if (translations[text] !== undefined) return translations[text];

  missing.add(text);

  return text;
};

/** 缺译时阻止写入英文产物 */
export const assertBranchApiReferenceTranslated = (): void => {
  if (missing.size) throw new Error(`Branch API translations missing:\n${JSON.stringify([...missing])}`);
};
