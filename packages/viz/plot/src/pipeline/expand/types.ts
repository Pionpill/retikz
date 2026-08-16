import type {
  AnyRowSelectorDefinition,
  AnyStatisticsReducerDefinition,
  AnyTransformDefinition,
  FieldFormatDefinition,
  ResolveField,
} from '@retikz/data';

import type {
  AnchorIdGenerator,
  AnyChannelDefinition,
  AnyCoordinateDefinition,
  AnyMarkDefinition,
  AnyScaleDefinition,
  PlotThemeStyleDefinition,
  ResolveLabel,
} from '../../contract';
import type { Margins } from '../../shared';

export type { CoordinateFrameResolution, MarkDataView } from '../../resolve/coordinate';

/** lowerPlots 运行时选项；尺寸、registry 与 runtime resolver 均不进入 Plot IR */
export type LowerPlotsOptions = {
  /** 运行时注入的 Plot Theme style definitions */
  plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
  /** 整图宽（user units），默认 480 */
  width?: number;
  /** 整图高（user units），默认 300 */
  height?: number;
  /** label 字号（估算占位 + 实绘 label 共用），默认 DEFAULT_FONT_SIZE */
  fontSize?: number;
  /** 逐边覆盖自动估算的 margin */
  margin?: Partial<Margins>;
  /** 总开关：开启才写 layer/series meta + 合成 `<plotId>.` 内部 id；默认 false 时不写 provenance id/meta */
  provenance?: boolean;
  /** 每个 datum Node 写 per-datum 来源 meta（hit-test；O(rows) 增量，蕴含需 provenance 开），默认 false */
  datumProvenance?: boolean;
  /** 数据属性名：把该字段值绑成 `<plotId>.datum.<值>` 的 Node.id（opt-in 可连接；缺字段 / 重复值 fail loud） */
  datumIdField?: string;
  /** Runtime-only functions referenced by AnchorId.generator; IRPlot stores only generator keys. */
  anchorIdGenerators?: Record<string, AnchorIdGenerator>;
  /** 逻辑字段 → 物理数据路径映射（按数据集 reference 键，不进 IR）；需 data.model；缺省恒等 */
  fieldMaps?: Record<string, Record<string, string>>;
  /** 抽样校验绑定数据（字段缺失 / 不可强制 → fail-loud）；默认关、不 warn */
  validateData?: boolean | { sampleRows?: number };
  /**
   * 非法 / 缺失值策略（运行时、不进 IR）：`'skip'`（默认）归一化写 NaN/undefined 哨兵、不删行，
   * 下游 mark 自跳非法几何；`'error'` 在 transform 之前对 spec 参与字段全量校验，遇任一非法 / 缺失即 fail-loud
   */
  invalid?: 'skip' | 'error';
  /** 程序化字段解析逃生舱（运行时函数，不进 IR）：按字段名覆盖类型 + 自定义值解析；返回 undefined → 回退 model/推断 + 内置 coerce */
  resolveField?: ResolveField;
  /**
   * datum label 内容逃生舱（运行时函数，不进 IR）：按 mark id 映射的「行 → 完全自定义标签串」。
   * @description 优先级最高（resolveLabel > field+format > value），覆盖该 mark 的 label / text 内容声明。
   *   按 mark id 取（宿主 mark 的 priority-1 label / 独立 TextMark 的 priority-2 text 共用）；未命中的 mark 走声明层 field/value/format。
   *   不进 IRPlot，故不破坏 IR JSON 可序列化
   */
  resolveLabel?: Record<string, ResolveLabel>;
  /**
   * 自定义坐标系 definition 数组（运行时函数，不进 IR）：spec 的 `coordinate: {type:<customType>, ...config}` 据此解析投影。
   * @description 让用户插入任意坐标系几何（曲线一维 / 拱形 x 轴等），无需给坐标系枚举塞成员、也不破坏 IR JSON 化。未注册 type → fail-loud
   */
  coordinates?: Array<AnyCoordinateDefinition>;
  /** 自定义 transform definitions；内置项与自定义项通过同一个 registry 解析 */
  transformDefinitions?: Array<AnyTransformDefinition>;
  /** 自定义 statistics reducer definitions；内置项与自定义项通过同一个 registry 解析 */
  statisticsReducerDefinitions?: Array<AnyStatisticsReducerDefinition>;
  /** 自定义 row selector definitions；内置项与自定义项通过同一个 registry 解析 */
  rowSelectorDefinitions?: Array<AnyRowSelectorDefinition>;
  /** 自定义 scale definitions；position 与 channel scale 共用解析后的 registry */
  scaleDefinitions?: Array<AnyScaleDefinition>;
  /** 自定义 channel definitions；position、mark、node 与 path channel 共用 registry */
  channelDefinitions?: Array<AnyChannelDefinition>;
  /** 自定义命名配色 scheme；IR 只保存 scheme 名，runtime 解析为插值函数 */
  colorSchemes?: Record<string, (t: number) => string>;
  /** 自定义 mark definitions；未注册或冲突的 type 会 fail-loud */
  markDefinitions?: Array<AnyMarkDefinition>;
  /** 自定义字段格式 definitions；definition 提供蕴含类型与 canonical parser */
  formatDefinitions?: Array<FieldFormatDefinition>;
};
