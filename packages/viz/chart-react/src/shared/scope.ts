import type { IRChild, IRScope } from '@retikz/core';

import type { ChartRootProps } from './types';

/** 将 Chart 包裹为带外层 Scope 行为的 Core child */
export const wrapChartScope = <TChart extends IRChild>(chart: TChart, props: Omit<ChartRootProps, 'id'>): IRChild => {
  const { x, y, transforms, placement, zIndex, clip, theme } = props;
  const scopeTransforms =
    x !== undefined || y !== undefined
      ? ([{ kind: 'translate', x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])] as NonNullable<IRScope['transforms']>)
      : transforms;
  if (
    scopeTransforms === undefined &&
    placement === undefined &&
    zIndex === undefined &&
    clip === undefined &&
    theme === undefined
  ) {
    return chart;
  }
  return {
    type: 'scope',
    ...(scopeTransforms === undefined ? {} : { transforms: scopeTransforms }),
    ...(placement === undefined ? {} : { placement }),
    ...(zIndex === undefined ? {} : { zIndex }),
    ...(clip === undefined ? {} : { clip }),
    ...(theme === undefined ? {} : { theme }),
    children: [chart],
  };
};
