import { translateEntityApiReference } from './entity.en';

/** Block 专属说明译文 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '将开放内容 Block Source 接入 React 编写流程': 'Integrate open-content Block Source into React authoring',
  'Block Source 的 React 编写参数': 'React authoring props for Block Source',
  '按声明顺序进入 Block 纵向布局的任意 children':
    'Arbitrary children entering the Block column layout in authored order',
  '将独立 Block Header Source 接入 React 编写流程': 'Integrate independent Block Header Source into React authoring',
  'Block Header 的 React 编写参数': 'React authoring props for Block Header',
  'Header 左侧至多一个任意 child': 'At most one arbitrary child on the left of the Header',
  'Header 右侧至多一个任意 child': 'At most one arbitrary child on the right of the Header',
  '将独立 Block Section Source 接入 React 编写流程': 'Integrate independent Block Section Source into React authoring',
  'Block Section 的 React 编写参数': 'React authoring props for Block Section',
  '按声明顺序进入 Section 纵向布局的任意 children':
    'Arbitrary children entering the Section column layout in authored order',
  '将独立 Block Row Source 接入 React 编写流程': 'Integrate independent Block Row Source into React authoring',
  'Block Row 的 React 编写参数': 'React authoring props for Block Row',
  '创建 Block Source 的 authoring embed 节点': 'Create a Block Source authoring embed',
  'Block embed 的 Source authoring 输入': 'Source authoring input for a Block embed',
  '创建 Block Header Source 的 authoring embed 节点': 'Create a Block Header Source authoring embed',
  'Block Header embed 的 Source authoring 输入': 'Source authoring input for a Block Header embed',
  '创建 Block Section Source 的 authoring embed 节点': 'Create a Block Section Source authoring embed',
  'Block Section embed 的 Source authoring 输入': 'Source authoring input for a Block Section embed',
  '创建 Block Row Source 的 authoring embed 节点': 'Create a Block Row Source authoring embed',
  'Block Row embed 的 Source authoring 输入': 'Source authoring input for a Block Row embed',
  '将 Block 开放内容 authoring 输入组装为单个 Source composite':
    'Assemble open-content Block authoring input into one Source composite',
  '与 Block Source 对齐、但允许开放 children 使用 Vanilla child authoring sugar 的输入':
    'Input aligned with Block Source, allowing Vanilla child authoring sugar',
  '将 Block Header authoring 输入组装为独立 Source composite':
    'Assemble Block Header authoring input into an independent Source composite',
  '与 Block Header Source 对齐、但允许 icon / trail 使用 Vanilla child authoring sugar 的输入':
    'Input aligned with Block Header Source, allowing Vanilla child sugar in icon / trail',
  '将 Block Section authoring 输入组装为独立 Source composite':
    'Assemble Block Section authoring input into an independent Source composite',
  '与 Block Section Source 对齐、但允许任意 Vanilla child authoring sugar 的输入':
    'Input aligned with Block Section Source, allowing arbitrary Vanilla child authoring sugar',
  '将 Block Row authoring 输入组装为独立 Source composite':
    'Assemble Block Row authoring input into an independent Source composite',
  '与 Block Row Source 对齐、但允许 children 使用 Vanilla child authoring sugar 的输入':
    'Input aligned with Block Row Source, allowing Vanilla child authoring sugar',
  'Block Header Source 的 InputEmbed adapter': 'InputEmbed adapter for Block Header Source',
  'Block Source 的 InputEmbed adapter': 'InputEmbed adapter for Block Source',
  'Block Row Source 的 InputEmbed adapter': 'InputEmbed adapter for Block Row Source',
  'Block Section Source 的 InputEmbed adapter': 'InputEmbed adapter for Block Section Source',
  '组装 Block Source record': 'Create a Block Source record',
  'Block Source record 的作者输入': 'Authoring input for a Block Source record',
  '组装 Block Header Source record': 'Create a Block Header Source record',
  'Block Header Source record 的作者输入': 'Authoring input for a Block Header Source record',
  '组装 Block Section Source record': 'Create a Block Section Source record',
  'Block Section Source record 的作者输入': 'Authoring input for a Block Section Source record',
  '组装 Block Row Source record': 'Create a Block Row Source record',
  'Block Row Source record 的作者输入': 'Authoring input for a Block Row Source record',
  代码实体内容组合时已经生效的主题: 'Effective theme available during code entity composition',
  '当前 Graph style 的有限视觉 token': 'Visual tokens for the current Graph style',
  '当前 Core Scope 的有效主题': 'Effective theme of the current Core Scope',
  '用独立 Source 描述一个封装代码实体，内容下沉为唯一 Graph Block':
    'Describe a code entity with independent Source, lowering its content into one Graph Block',
  'schema 校验且传入 compose 的领域 Source': 'Domain Source validated by schema and passed to compose',
  '生成 Header 与内容区，不生成根 Block 或第二份实体 identity':
    'Generate the Header and content without creating a root Block or a second entity identity',
  自定义实体的公开命名空间: 'Public namespace of the custom entity',
  '组合完整公共 Block surface 的严格 Source schema': 'Strict Source schema including the complete public Block surface',
  命名空间内的实体判别值: 'Entity discriminator within its namespace',
  代码实体内部共享的有限视觉角色: 'Shared visual roles inside code entities',
  '默认 icon 颜色': 'Default icon color',
  签名与方法名称字体: 'Font for signatures and method names',
  '说明、类型与默认 trail 颜色': 'Color for descriptions, types, and default trail',
  '内容分区背景；省略使用基础 Section 默认': 'Section background; omission uses the base Section default',
  '标题、成员名称与逻辑正文颜色': 'Color for titles, member names, and logic text',
  'Block 结构文字 Source': 'Source for Block structure text',
  '代码实体共享事实与开放 composite 标识；具体实体由独立 schema 派生':
    'Shared code entity facts and open composite identity; concrete entities derive from independent schemas',
  '创建代码实体及其完整下层依赖的 Core contribution':
    'Create a Core contribution containing the code entity and all lower-level dependencies',
  'Definition 拥有的领域 Source': 'Domain Source owned by the Definition',
  '已定义的代码实体，重复使用同一个对象保持 provider identity':
    'Defined code entity; reusing the same object preserves provider identity',
  'Graph 定义与主题选项': 'Graph definition and theme options',
  '包含实体根与 Block 下层依赖的贡献；宿主装配时检测冲突':
    'Contribution containing the entity root and Block dependencies; the host checks assembly conflicts',
  '定义共享主题与 Block 根语义的代码实体': 'Define a code entity sharing theme and Block root semantics',
  '严格 schema 校验的领域 Source，包含公共外框和稳定判别字段':
    'Domain Source validated by a strict schema, including the public shell and stable discriminators',
  '领域 schema 与内容组合回调': 'Domain schema and content composition callback',
  '冻结后的同一个 Definition 对象；注册由 createCodeBlockContribution 完成':
    'The same Definition object, frozen; register through createCodeBlockContribution',
};

/** 复用共享 Graph 译文，缺失时停止生成 */
export const translateBlockApiReference = (source: string): string =>
  translations[source.replace(/\r/g, '')] ?? translateEntityApiReference(source);
