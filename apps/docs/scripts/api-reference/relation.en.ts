import { translateEntityApiReference } from './entity.en';

/** 经核对的 Relation API 英文说明 */
const translations: Readonly<Partial<Record<string, string>>> = {
  '校验 predicate 参数的 JSON 对象 schema，其输出类型传给结构解析回调':
    'JSON object schema validating predicate arguments; its output type is passed to the structure resolution callback',
  关系编写输入的判别字段: 'Relation authoring input discriminator',
  '完整 Core Step 序列；省略时直连端点': 'Complete Core Step sequence; omission connects endpoints directly',
  'route 形式不接受 way': 'The route variant excludes way',
  'way 形式不接受 route': 'The way variant excludes route',
  '入口归一为 route 的 Core Way 路径': 'Core Way path normalized to route at the entry',
  '将 Relation Source 接入 React 编写流程': 'Integrate Relation Source into React authoring',
  'Relation Source 的 React 编写参数': 'React authoring props for Relation Source',
  '可选 Core Step authoring，与 route / way prop 互斥':
    'Optional Core Step authoring, mutually exclusive with route / way props',
  '创建 Relation Source 的 authoring embed 节点': 'Create a Relation Source authoring embed',
  'Relation embed 的 Source authoring 输入': 'Source authoring input for a Relation embed',
  '关系编写字段，端点可使用 id 字符串，路径可使用 way':
    'Relation authoring fields; endpoints accept id strings and paths accept way',
  '供 Vanilla 内容树使用的 embed 节点，由 RelationInputEmbedAdapter 转换为 Relation Source':
    'An embed for Vanilla content trees, converted to Relation Source by RelationInputEmbedAdapter',
  '将 endpoint 与可选 Way sugar 归一为直接持有 route 的 Relation Source record':
    'Normalize endpoints and optional Way sugar into a Relation Source record with a direct route',
  'Relation 的 Vanilla authoring 输入': 'Vanilla authoring input for Relation',
  '带 type 判别字段的关系编写输入': 'Relation authoring input with its type discriminator',
  '端点为完整 NodeTarget、way 转为 route 的 Relation Source 记录':
    'Relation Source with complete NodeTarget endpoints and way converted to route',
  'Relation endpoint 的 Vanilla authoring 输入，可直接引用 id 或提供完整 NodeTarget':
    'Vanilla endpoint input: an id string or a complete NodeTarget',
  '直接使用规范 Core route steps 的 Relation authoring 输入':
    'Relation authoring input using canonical Core route steps',
  '使用 Core Way DSL、并在 Vanilla normalize 阶段转为 route 的 Relation authoring 输入':
    'Relation authoring input using Core Way DSL, converted to route during Vanilla normalization',
  'Relation Source 的 InputEmbed adapter': 'InputEmbed adapter for Relation Source',
  '组装 Graph root 使用的 Relation Source record': 'Create a Relation Source record for a Graph root',
  'Relation 单 record 工厂的作者输入': 'Authoring input for the single-record Relation factory',
  '关系字段，不包含由工厂补齐的 namespace 和 type':
    'Relation fields excluding namespace and type supplied by the factory',
  '新建的 Relation Source 记录；不解析 Schema、不生成 id，也不补齐主题默认值':
    'A new Relation Source record; does not parse the schema, generate an id, or fill theme defaults',
  'Relation kind 的稳定子类型、方向收窄与稀疏展示定义':
    'Stable Relation subtype with narrowed directions and sparse presentation overrides',
  'kind 对所属 role 方向集合的非空收窄': 'Non-empty narrowing of the parent role direction set',
  'kind 覆盖的默认方向': 'Default direction overridden by this kind',
  '按有效方向提供的稀疏结构 delta': 'Sparse structure overrides by effective direction',
  '全局唯一的开放 Relation kind key': 'Globally unique open Relation kind key',
  'kind 所属的 Relation role': 'Relation role owning this kind',
  'Relation predicate registry 保存的参数擦除定义':
    'Parameter-erased definition stored by the Relation predicate registry',
  '可选允许的 Relation kind keys；省略表示该 role 的全部 kind':
    'Optional allowed Relation kind keys; omission allows all kinds of the role',
  '根据已校验 Canonical params 解析稀疏结构 delta':
    'Resolve sparse structure overrides from validated canonical parameters',
  'predicate 所属的 Relation role': 'Relation role owning this predicate',
  'Relation predicate 作者侧的类型安全定义': 'Type-safe authoring definition for a Relation predicate',
  'Relation role 的主要语义、方向约束与完整基础展示定义':
    'Relation role semantics, direction constraints, and complete base presentation',
  'role 允许的全部有效方向': 'All effective directions allowed by the role',
  '省略 Source direction 时使用的有效方向': 'Effective direction when Source direction is omitted',
  '每个允许方向对应的完整结构 recipe': 'Complete structure recipe for each allowed direction',
  '开放的 Relation role key': 'Open Relation role key',
  'Relation 内置角色词汇值': 'Built-in Relation role values',
  'Relation 有向性词汇': 'Relation direction vocabulary',
  'Relation 的内置语义角色': 'Built-in Relation semantic roles',
  '定义一个可注册的 Relation kind': 'Define a registrable Relation kind',
  '传给 GraphDefinitionOptions.relationKinds 的定义；此函数不执行注册或校验':
    'Definition supplied through GraphDefinitionOptions.relationKinds; this function does not register or validate it',
  '定义一个类型安全并可注册的 Relation predicate': 'Define a type-safe, registrable Relation predicate',
  '传给 GraphDefinitionOptions.relationPredicates 的定义；此函数不执行注册或校验':
    'Definition supplied through GraphDefinitionOptions.relationPredicates; this function does not register or validate it',
  '定义一个可注册的 Relation role': 'Define a registrable Relation role',
  '传给 GraphDefinitionOptions.relationRoles 的定义；此函数不执行注册或校验':
    'Definition supplied through GraphDefinitionOptions.relationRoles; this function does not register or validate it',
};

/** 共用 Graph 字段复用已有译文，缺译时阻止生成 */
export const translateRelationApiReference = (source: string): string =>
  translations[source.replace(/\r/g, '')] ?? translateEntityApiReference(source);
