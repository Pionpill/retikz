import type {
  InputCoreNodeChannels,
  InputCorePathChannels,
  InputDatumLabel,
  InputExtensionChannel,
  InputFieldName,
  InputIntervalMark,
  InputPathMark,
  InputPointMark,
  InputReferenceMark,
  InputRelationMark,
} from '@retikz/plot-vanilla';
import type { FC } from 'react';

export type PathMarkProps = InputPathMark;
export type PointMarkProps = InputPointMark;
export type IntervalMarkProps = InputIntervalMark;
export type ReferenceMarkProps = InputReferenceMark;
export type RelationMarkProps = InputRelationMark;
export type FieldName = InputFieldName;
export type ExtensionChannelProp = InputExtensionChannel;
export type CoreNodeChannelProps = InputCoreNodeChannels;
export type CorePathChannelProps = InputCorePathChannels;
export type DatumLabelProps = InputDatumLabel;

/** 折线图层声明组件 */
export const PathMark: FC<PathMarkProps> = () => null;
/** 散点或文本图层声明组件 */
export const PointMark: FC<PointMarkProps> = () => null;
/** 区间图层声明组件 */
export const IntervalMark: FC<IntervalMarkProps> = () => null;
/** 参考标注图层声明组件 */
export const ReferenceMark: FC<ReferenceMarkProps> = () => null;
/** 起点到终点的关系路径图层 */
export const RelationMark: FC<RelationMarkProps> = () => null;
