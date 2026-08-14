import type { IRPlotSpec } from '@retikz/plot';

type CompositionSpec = NonNullable<IRPlotSpec['composition']>;
type ArrangementSpec = NonNullable<CompositionSpec['arrangements']>[number];
type FacetGridSpec = Extract<ArrangementSpec, { kind: 'facet' }>;
type SharedScaffoldSpec = Extract<ArrangementSpec, { kind: 'tracks' }>;
type ScaffoldTrackSpec = SharedScaffoldSpec['tracks'][number];

/** 分面维度输入：字段名简写或完整的分面维度配置 */
export type FacetDimensionInput = string | NonNullable<FacetGridSpec['row']>;

/** 分面布局声明属性 */
export type FacetProps = Omit<FacetGridSpec, 'kind' | 'view' | 'row' | 'column'> & {
  /** 行分面维度；字符串会展开为对应字段配置 */
  row?: FacetDimensionInput;
  /** 列分面维度；字符串会展开为对应字段配置 */
  column?: FacetDimensionInput;
  /** 分面面板使用的坐标视图 id；省略时由分面 id 派生 */
  view?: string;
  /** 当前分面的间距配置 */
  spacing?: CompositionSpec['spacing'];
  /** 当前分面的 scale、axis 与 grid 共享策略 */
  resolve?: CompositionSpec['resolve'];
  /** 自动绑定到分面坐标视图的 mark 与 axis 声明 */
};

/** 共享轨道骨架声明属性 */
export type ScaffoldProps = Omit<SharedScaffoldSpec, 'kind' | 'coordinate' | 'tracks'> & {
  /** 轨道使用的坐标系；省略时继承 `<Plot coordinate>` */
  coordinate?: SharedScaffoldSpec['coordinate'];
  /** 直接传入的轨道配置；也可改用 `<Track>` children */
  tracks?: Array<ScaffoldTrackSpec>;
  /** 当前骨架的轨道与坐标轴间距配置 */
  spacing?: CompositionSpec['spacing'];
  /** 当前骨架的 scale、axis 与 grid 共享策略 */
  resolve?: CompositionSpec['resolve'];
  /** 共享 axis 与 `<Track>` 声明 */
};

/** 单条共享轨道声明属性 */
export type TrackProps = ScaffoldTrackSpec;

/** 声明按数据字段拆分的分面布局，由 `<Plot>` 收集为 composition */

/** 声明管理多条共享坐标轨道的骨架，由 `<Plot>` 收集为 composition */

/** 声明共享骨架中的单条轨道，并为其 children 提供坐标视图绑定 */

export type InputFacet = FacetProps;
export type InputScaffold = ScaffoldProps;
export type InputTrack = TrackProps;
