import type { DataFieldTypeMap, ExternalRow, IRDataFieldDefinition } from '@retikz/data';

import type { AnyMarkDefinition, ChannelPaletteContext, ChannelScaleResolution } from '../../contract';
import type { ChannelScaleResolveContext } from '../../contract';
import type { ChannelRegistry } from '../../providers';
import type { IRPlot, IRPlotScaleOperation } from '../../schemas';

/** channel 领域 resolver 的窄上下文；provider definition context 由 resolver 在调用点投影 */
export type ChannelResolveContext = {
  /** 当前 plot source，用于 definition 读取 scale / data model 等声明 */
  node: IRPlot;
  /** 当前 mark 实际消费的数据行 */
  rows: Array<ExternalRow>;
  /** 已确定的字段类型映射；未定类型字段不进入映射 */
  fieldTypeMap: DataFieldTypeMap;
  /** 已合并的 channel definitions */
  channelRegistry: ChannelRegistry;
  /** 已合并的 mark definitions，供 channel-kind selection 与 operation validation 使用 */
  markRegistry: ReadonlyMap<string, AnyMarkDefinition>;
  /** 当前 mark / series 的默认颜色 */
  defaultColor: string;
  /** 由 resolve/scale 提供的 channel scale resolver */
  resolveChannelScale: (
    operation: IRPlotScaleOperation,
    values: Array<unknown>,
    context: ChannelScaleResolveContext,
  ) => ChannelScaleResolution;
  /** 按 IR data.model 的 order 计算分类 domain */
  resolveCategoryDomain: (
    values: Array<unknown>,
    order?: NonNullable<IRDataFieldDefinition['order']>,
  ) => Array<string | number>;
  /** 解析命名配色 scheme */
  resolveColorScheme: (name: string) => (t: number) => string;
  /** Plot 级 palette 默认值 */
  palette?: ChannelPaletteContext;
};
