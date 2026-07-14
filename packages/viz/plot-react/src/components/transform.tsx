import type { IRPlotTransform } from '@retikz/plot';
import type { FC } from 'react';

/**
 * <Transform> props：通用数据 transform 声明（按 kind 判别的扁平 props，与 IR Transform 一一对应）
 * @description 服务全部 transform kind（sort / stack / bin / summarize / select / annotate / normalize / derive-interval / relate / jitter）；
 *   props 即 IR transform operation（JSON 可序列化），由 <Plot> 同步内省装进 spec.transform。改行数与保行数 transform
 *   统一经此声明，显式可排序、可复用——不再走 mark-prop 自动装配（<IntervalMark bin> 等不识别）
 */
export type TransformProps = IRPlotTransform;

/**
 * 通用数据 transform 声明组件
 * @description 配置载体：不进 React render 栈、不渲染（返回 null），由 <Plot> 同步内省其 props 装进 spec.transform。
 *   一个 <Transform kind="..."> 对应一个 IR transform operation；按声明顺序折叠（与 <Plot transforms> 直传共用同一管线）
 */
export const Transform: FC<TransformProps> = () => null;
