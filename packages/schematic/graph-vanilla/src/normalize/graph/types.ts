import type { EntityCreateOptions, GraphCreateOptions, RelationCreateOptions } from '@retikz/graph';
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

/** Graph children 中可直接书写的 semantic 输入 */
export type InputGraphMember = InputEntity | InputRelation;

/** Graph root children 的 Vanilla authoring union */
export type InputGraphChild = InputGraphMember | InputChild;

/** 与 Graph Source root 对齐、但允许 Vanilla child authoring sugar 的输入 */
export type InputGraph = Omit<GraphCreateOptions, 'children'> &
  Readonly<{
    children?: ReadonlyArray<InputGraphChild>;
  }>;
