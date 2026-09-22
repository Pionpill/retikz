import type {
  BlockCreateOptions,
  BlockHeaderCreateOptions,
  BlockRowCreateOptions,
  BlockSectionCreateOptions,
  EntityCreateOptions,
  GraphCreateOptions,
  GroupCreateOptions,
  RelationCreateOptions,
} from '@retikz/graph';
import type { InputChild, InputPath } from '@retikz/vanilla';

/** 从 authoring 输入移除由 builder 确定的 Source discriminator，并保留 union 分支 */
export type WithoutInputType<TInput> = TInput extends unknown ? Omit<TInput, 'type'> : never;

/** Entity 的 Vanilla authoring 输入 */
export type InputEntity = EntityCreateOptions & Readonly<{ type: 'entity' }>;

/** Relation endpoint 的 Vanilla authoring 输入，可直接引用 id 或提供完整 NodeTarget */
export type InputRelationEndpoint = string | RelationCreateOptions['source'];

type InputRelationFields = Omit<RelationCreateOptions, 'route' | 'source' | 'target'> &
  Readonly<{
    source: InputRelationEndpoint;
    target: InputRelationEndpoint;
  }>;

/** 直接使用规范 Core route steps 的 Relation authoring 输入 */
export type InputRelationRoute = Readonly<{
  type: 'relation';
  route?: RelationCreateOptions['route'];
  way?: never;
}>;

/** 使用 Core Way DSL、并在 Vanilla normalize 阶段转为 route 的 Relation authoring 输入 */
export type InputRelationWay = Readonly<{
  type: 'relation';
  route?: never;
  way: NonNullable<InputPath['way']>;
}>;

/** Relation 的 Vanilla authoring 输入 */
export type InputRelation = InputRelationFields & (InputRelationRoute | InputRelationWay);

type BlockRowContentInput = Extract<BlockRowCreateOptions, Readonly<{ content: unknown }>>['content'];

type InputBlockRowFields = Omit<BlockRowCreateOptions, 'content' | 'children'> & Readonly<{ type?: 'blockRow' }>;

/** 与 Block Row Source 对齐、但允许 children 使用 Vanilla child authoring sugar 的输入 */
export type InputBlockRow = InputBlockRowFields &
  (
    | Readonly<{ content: BlockRowContentInput; children?: never }>
    | Readonly<{ content?: never; children?: ReadonlyArray<InputGraphChild> }>
  );

/** 与 Block Section Source 对齐、但允许任意 Vanilla child authoring sugar 的输入 */
export type InputBlockSection = Omit<BlockSectionCreateOptions, 'children'> &
  Readonly<{
    type?: 'blockSection';
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Block Header Source 对齐、但允许 icon / trail 使用 Vanilla child authoring sugar 的输入 */
export type InputBlockHeader = Omit<BlockHeaderCreateOptions, 'icon' | 'trail'> &
  Readonly<{
    type?: 'blockHeader';
    icon?: InputGraphChild;
    trail?: InputGraphChild;
  }>;

/** 与 Block Source 对齐、但允许开放 children 使用 Vanilla child authoring sugar 的输入 */
export type InputBlock = Omit<BlockCreateOptions, 'children'> &
  Readonly<{
    type?: 'block';
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Group Source 对齐、但允许 Vanilla child authoring sugar 的输入 */
export type InputGroup = Omit<GroupCreateOptions, 'children'> &
  Readonly<{
    type?: 'group';
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Graph Source root 对齐、但允许 Vanilla child authoring sugar 的输入 */
export type InputGraph = Omit<GraphCreateOptions, 'children'> &
  Readonly<{
    type?: 'graph';
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** Graph children 中可直接书写的 semantic 输入 */
export type InputGraphMember =
  | (InputGraph & Readonly<{ type: 'graph' }>)
  | (InputGroup & Readonly<{ type: 'group' }>)
  | (InputBlock & Readonly<{ type: 'block' }>)
  | (InputBlockHeader & Readonly<{ type: 'blockHeader' }>)
  | (InputBlockSection & Readonly<{ type: 'blockSection' }>)
  | (InputBlockRow & Readonly<{ type: 'blockRow' }>)
  | InputEntity
  | InputRelation;

/** Graph-family content 的 Vanilla authoring union */
export type InputGraphChild = InputGraphMember | InputChild;

/** Block children 的 Vanilla authoring union */
export type InputBlockChild = InputGraphChild;

/** Group children 的 Vanilla authoring union */
export type InputGroupChild = InputGraphChild;
