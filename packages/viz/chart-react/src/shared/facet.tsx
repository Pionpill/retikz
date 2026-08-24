import type { InputChartFacet } from '@retikz/chart-vanilla';
import type { FC } from 'react';

/** Chart facet 的高层 authoring 属性 */
export type ChartFacetProps = InputChartFacet;

/** 将当前 Chart recipe 按字段重复为 Plot facet panels */
export const ChartFacet: FC<ChartFacetProps> = () => null;
