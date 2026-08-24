import type { AssertEqual } from '@retikz/foundation';

import type { ChartHostProps } from './types';

import { RetikzChartReactError } from '../error';

/** Chart standalone 入口允许透传给 Layout 的宿主字段 */
const CHART_HOST_PROP_KEYS = [
  'width',
  'height',
  'className',
  'style',
  'renderer',
  'themeStyles',
  'runtime',
  'animate',
  'snapshotAt',
  'animationRef',
  'onArtifacts',
  'onCompileResult',
] as const satisfies ReadonlyArray<keyof ChartHostProps>;

type ChartHostPropKeysCheck = AssertEqual<(typeof CHART_HOST_PROP_KEYS)[number], keyof ChartHostProps>;
const chartHostPropKeysCheck: ChartHostPropKeysCheck = true;
void chartHostPropKeysCheck;

const chartHostPropKeySet = new Set<string>(CHART_HOST_PROP_KEYS);

/** 提取 standalone Chart 交给 Layout 的宿主字段 */
export const chartHostPropsOf = (props: ChartHostProps): ChartHostProps =>
  Object.fromEntries(CHART_HOST_PROP_KEYS.filter(key => Object.hasOwn(props, key)).map(key => [key, props[key]]));

/** 从内部 Chart embed 输入移除已由 Layout 消费的宿主字段 */
export const chartContentPropsOf = <TProps extends ChartHostProps>(props: TProps): TProps =>
  Object.fromEntries(Object.entries(props).filter(([key]) => !chartHostPropKeySet.has(key))) as TProps;

/** 拒绝 embedded Chart 自有的 standalone Layout 字段 */
export const assertEmbeddedChartHostProps = (props: ChartHostProps): void => {
  const unsupportedHostProps = CHART_HOST_PROP_KEYS.filter(key => Object.hasOwn(props, key));
  if (unsupportedHostProps.length === 0) return;
  throw new RetikzChartReactError(
    `chart react: embedded Chart does not support standalone Layout props: ${unsupportedHostProps.join(', ')}; move them to the outer <Layout>`,
  );
};
