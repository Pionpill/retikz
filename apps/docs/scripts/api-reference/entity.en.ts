import { translateNodeApiReference } from './node.en';

/** 经审阅的 Entity API 英文说明 */
const translations: Readonly<Partial<Record<string, string>>> = {
  'Entity Source 的 React 编写参数': 'React authoring props for an Entity Source',
  '仅接受 Core Node-compatible 文本 authoring，与 text prop 互斥':
    'Accepts only Node-compatible text authoring; mutually exclusive with the text prop',
  '将 Entity Source 接入 React 编写流程': 'Integrate an Entity Source into React authoring',
  'Entity embed 的 Source authoring 输入': 'Source authoring input for an Entity embed',
  '自定义 Entity kind definitions': 'Custom Entity kind definitions',
  '自定义 Entity predicate definitions': 'Custom Entity predicate definitions',
  '自定义 Entity role definitions': 'Custom Entity role definitions',
  '与 Core Theme style 同名的 Graph Theme definitions':
    'Graph Theme definitions named after their corresponding Core Theme styles',
  '自定义 Relation kind definitions': 'Custom Relation kind definitions',
  '自定义 Relation predicate definitions': 'Custom Relation predicate definitions',
  '自定义 Relation role definitions': 'Custom Relation role definitions',
  'Entity 的 Vanilla authoring 输入': 'Vanilla authoring input for Entity',
  'Entity Source 的 InputEmbed adapter': 'InputEmbed adapter for an Entity Source',
  '创建可一次性传给 Vanilla normalize 的 Graph adapter 集合':
    'Create the Graph adapters passed together to Vanilla normalization',
  '创建 Entity Source 的 authoring embed 节点': 'Create an authoring embed node for an Entity Source',
  '将 Entity authoring 输入组装为单个 Source record': 'Normalize Entity authoring input into a single Source record',
  'Entity 单 record 工厂的作者输入': 'Authoring input for the single-record Entity factory',
  'Entity kind 的稳定语义子类型定义': 'Definition of a stable Entity semantic subtype',
  面向作者与工具的稳定语义说明: 'Stable semantic description for authors and tools',
  'role 内唯一的开放 Entity kind key': 'Open Entity kind key unique within its role',
  'kind 所属的 Entity role': 'Entity role to which this kind belongs',
  'Entity predicate registry 保存的参数擦除定义': 'Parameter-erased definition stored in the Entity predicate registry',
  '可选允许的 Entity kind keys；省略表示该 role 的全部 kind':
    'Optional allowed Entity kind keys; omission allows every kind of the role',
  '全局唯一的 predicate definition name': 'Globally unique predicate definition name',
  'Source params 的 JSON object schema': 'JSON object schema for Source params',
  'predicate 所属的 Entity role': 'Entity role to which this predicate belongs',
  'Entity predicate 作者侧的类型安全定义': 'Type-safe authoring definition of an Entity predicate',
  'Entity role 的语义与完整基础结构定义': 'Entity role semantics and complete base structure',
  可选边界定义: 'Optional boundary definition',
  可选圆角半径: 'Optional corner radius',
  可选基础最小尺寸: 'Optional base minimum size',
  'role 独占的基础内边距': 'Base padding owned exclusively by the role',
  '开放的 Entity role key': 'Open Entity role key',
  'role 独占的 Core Node shape': 'Core Node shape owned exclusively by the role',
  'Entity 内置角色词汇值': 'Built-in Entity role values',
  '配置一组共享 Graph definitions 的运行时扩展': 'Runtime options for a shared set of Graph definitions',
  'Graph 内置语义状态词汇值': 'Built-in Graph semantic status values',
  'Entity 的内置上位语义角色': 'Built-in high-level semantic roles of Entity',
  'Graph Entity 与 Relation 共享的图式语义状态': 'Diagram semantic statuses shared by Graph Entity and Relation',
  '组装 Graph root 使用的 Entity Source record': 'Create an Entity Source record for a Graph root',
  '创建当前 Graph 包族的完整 composite definition 集合':
    'Create the complete composite definition set for the Graph package family',
  '创建当前 Graph 包族的完整 composite dependency provider 集合':
    'Create the complete composite dependency provider set for the Graph package family',
  '定义一个可注册的 Entity kind': 'Define a registrable Entity kind',
  '定义一个类型安全并可注册的 Entity predicate': 'Define a type-safe, registrable Entity predicate',
  '定义一个可注册的 Entity role': 'Define a registrable Entity role',
};

/** 共用 Node 字段复用同一译文，其余缺译时阻止生成 */
export const translateEntityApiReference = (source: string): string => {
  const translated = translations[source.replace(/\r/g, '')];
  if (translated !== undefined) return translated;
  return translateNodeApiReference(source);
};
