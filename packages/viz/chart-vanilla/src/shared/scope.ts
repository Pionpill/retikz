import type { IRChild, IRScope } from '@retikz/core';

import type { InputChartPanel } from './types';

/** 把 Chart 包装为可选的根 Scope */
export const wrapChartPanel = <TChart extends IRChild>(chart: TChart, panel: InputChartPanel | undefined): IRChild => {
  if (panel === undefined) return chart;
  const { x, y, transforms, placement, zIndex, clip, theme } = panel;
  const scopeTransforms =
    x !== undefined || y !== undefined
      ? ([{ kind: 'translate', x: x ?? 0, y: y ?? 0 }, ...(transforms ?? [])] as NonNullable<IRScope['transforms']>)
      : transforms === undefined
        ? undefined
        : [...transforms];
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
