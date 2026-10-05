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

/**
 * 从 authoring 输入移除由 builder 确定的 Source discriminator，并保留 union 分支
 * @template TInput 待移除 type 的作者输入类型；联合类型按分支分别处理
 */
export type WithoutInputType<TInput> = TInput extends unknown ? Omit<TInput, 'type'> : never;

/** Entity 的 Vanilla authoring 输入 */
export type InputEntity = EntityCreateOptions &
  Readonly<{
    /** 实体编写输入的判别字段，固定为 entity */
    type: 'entity';
  }>;

/** Relation endpoint 的 Vanilla authoring 输入，可直接引用 id 或提供完整 NodeTarget */
export type InputRelationEndpoint = string | RelationCreateOptions['source'];

type InputRelationFields = Omit<RelationCreateOptions, 'route' | 'source' | 'target'> &
  Readonly<{
    source: InputRelationEndpoint;
    target: InputRelationEndpoint;
  }>;

/** 直接使用规范 Core route steps 的 Relation authoring 输入 */
export type InputRelationRoute = Readonly<{
  /** 关系编写输入的判别字段 */
  type: 'relation';
  /** 完整 Core Step 序列；省略时直连端点 */
  route?: RelationCreateOptions['route'];
  /** route 形式不接受 way */
  way?: never;
}>;

/** 使用 Core Way DSL、并在 Vanilla normalize 阶段转为 route 的 Relation authoring 输入 */
export type InputRelationWay = Readonly<{
  /** 关系编写输入的判别字段 */
  type: 'relation';
  /** way 形式不接受 route */
  route?: never;
  /** 入口归一为 route 的 Core Way 路径 */
  way: NonNullable<InputPath['way']>;
}>;

/** Relation 的 Vanilla authoring 输入 */
export type InputRelation = InputRelationFields & (InputRelationRoute | InputRelationWay);

type BlockRowContentInput = Extract<BlockRowCreateOptions, Readonly<{ content: unknown }>>['content'];

type InputBlockRowFields = Omit<BlockRowCreateOptions, 'content' | 'children'> & Readonly<{ type?: 'blockRow' }>;

/** 与 Block Row Source 对齐、但允许 children 使用 Vanilla child authoring sugar 的输入 */
export type InputBlockRow = InputBlockRowFields &
  (
    | Readonly<{
        /** 行的便捷内容入口，与显式 children 互斥 */
        content: BlockRowContentInput;
        children?: never;
      }>
    | Readonly<{
        content?: never;
        /** 当前行按作者顺序排列的绘制子内容，与 content 互斥 */
        children?: ReadonlyArray<InputGraphChild>;
      }>
  );

/** 与 Block Section Source 对齐、但允许任意 Vanilla child authoring sugar 的输入 */
export type InputBlockSection = Omit<BlockSectionCreateOptions, 'children'> &
  Readonly<{
    /** 可省略的 BlockSection 作者输入判别值 */
    type?: 'blockSection';
    /** 当前区段按作者顺序排列的绘制子内容 */
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Block Header Source 对齐、但允许 icon / trail 使用 Vanilla child authoring sugar 的输入 */
export type InputBlockHeader = Omit<BlockHeaderCreateOptions, 'icon' | 'trail'> &
  Readonly<{
    /** 可省略的 BlockHeader 作者输入判别值 */
    type?: 'blockHeader';
    /** 标题前方的可选绘制内容 */
    icon?: InputGraphChild;
    /** 标题尾部的可选绘制内容 */
    trail?: InputGraphChild;
  }>;

/** 与 Block Source 对齐、但允许开放 children 使用 Vanilla child authoring sugar 的输入 */
export type InputBlock = Omit<BlockCreateOptions, 'children'> &
  Readonly<{
    /** 可省略的 Block 作者输入判别值 */
    type?: 'block';
    /** 块容器内按作者顺序排列的绘制子内容 */
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Group Source 对齐、但允许 Vanilla child authoring sugar 的输入 */
export type InputGroup = Omit<GroupCreateOptions, 'children'> &
  Readonly<{
    /** 可省略的 Group 作者输入判别值 */
    type?: 'group';
    /** 可见分组包含的有序绘制子内容 */
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** 与 Graph Source root 对齐、但允许 Vanilla child authoring sugar 的输入 */
export type InputGraph = Omit<GraphCreateOptions, 'children'> &
  Readonly<{
    /** 可省略的 Graph 作者输入判别值 */
    type?: 'graph';
    /** 共享当前 Graph 上下文的有序绘制子内容 */
    children?: ReadonlyArray<InputGraphChild>;
  }>;

/** Graph children 中可直接书写的 semantic 输入 */
export type InputGraphMember =
  | (InputGraph &
      Readonly<{
        /** 在混合子内容中识别具体 Graph 组件的显式判别值 */
        type: 'graph';
      }>)
  | (InputGroup &
      Readonly<{
        /** 在混合子内容中识别具体 Graph 组件的显式判别值 */
        type: 'group';
      }>)
  | (InputBlock &
      Readonly<{
        /** 在混合子内容中识别具体 Graph 组件的显式判别值 */
        type: 'block';
      }>)
  | (InputBlockHeader &
      Readonly<{
        /** 在混合子内容中识别具体 Graph 组件的显式判别值 */
        type: 'blockHeader';
      }>)
  | (InputBlockSection &
      Readonly<{
        /** 在混合子内容中识别具体 Graph 组件的显式判别值 */
        type: 'blockSection';
      }>)
  | (InputBlockRow &
      Readonly<{
        /** 在混合子内容中识别具体 Graph 组件的显式判别值 */
        type: 'blockRow';
      }>)
  | InputEntity
  | InputRelation;

/** Graph-family content 的 Vanilla authoring union */
export type InputGraphChild = InputGraphMember | InputChild;

/** Block children 的 Vanilla authoring union */
export type InputBlockChild = InputGraphChild;

/** Group children 的 Vanilla authoring union */
export type InputGroupChild = InputGraphChild;
