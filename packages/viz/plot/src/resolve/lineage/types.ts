import type { DataLineageOptions } from '@retikz/data';

import type { PlotLineageOptions, PlotRowValueOptions } from '../../contract';

/** 单次运行调用中已解析默认值的绘图溯源选项 */
export type EffectivePlotLineageOptions = {
  /** 已补齐的数据层来源追踪开关 */
  data: DataLineageOptions;
  /** 是否记录作者指定的 mark id */
  markIdentity: boolean;
  /** 是否记录 mark 编码消费的字段与通道 */
  markEncoding: boolean;
  /** 是否记录根与 mark 局部变换的分段关系 */
  transformScopes: boolean;
  /** 是否记录尺度配置及通道绑定摘要 */
  scaleMappings: boolean;
  /** 是否记录视图、分面与轨道布局摘要 */
  layoutContext: boolean;
  /** 是否记录数据目标的地址与最终锚点 */
  locatorAnchors: boolean;
  /** 禁用行值记录，或按字段白名单与行数限制采样 */
  rowValues: false | PlotRowValueOptions;
  /** 禁用宿主信息记录，或按选择开关透传 */
  hostMetadata: false | NonNullable<PlotLineageOptions['hostMetadata']>;
};
