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

/** Entity 的 Vanilla authoring 输入 */
export type InputEntity = EntityCreateOptions & Readonly<{ type: 'entity' }>;

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
export type InputRelation = Omit<RelationCreateOptions, 'route'> & (InputRelationRoute | InputRelationWay);

type BlockCellCreateOptions = NonNullable<BlockRowCreateOptions['children']>[number];

/** 与 Block Cell Source 对齐、但允许 Vanilla child authoring sugar 的输入 */
export type InputBlockCell = Omit<BlockCellCreateOptions, 'child'> & Readonly<{ child: InputGraphChild }>;

/** 与 Block Row Source 对齐、但允许 Cell 使用 Vanilla child authoring sugar 的输入 */
export type InputBlockRow = Omit<BlockRowCreateOptions, 'children'> &
  Readonly<{
    type?: 'blockRow';
    children?: ReadonlyArray<InputBlockCell>;
  }>;

/** 与 Block Section Source 对齐、但允许任意 Vanilla child authoring sugar 的输入 */
export type InputBlockSection = Omit<BlockSectionCreateOptions, 'children'> &
  Readonly<{
    type?: 'blockSection';
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Block Header Source 对齐、但允许 icon / trailing 使用 Vanilla child authoring sugar 的输入 */
export type InputBlockHeader = Omit<BlockHeaderCreateOptions, 'icon' | 'trailing'> &
  Readonly<{
    type?: 'blockHeader';
    icon?: InputGraphChild;
    trailing?: InputGraphChild;
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
