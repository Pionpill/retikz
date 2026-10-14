import { Plot, PlotAxis, PlotScale, PointMark } from '@retikz/plot-react';

import type { Lang } from '@/i18n';

import { scopeOperationOf, scopeRows } from './transform-scope.data';
import { transformScopeI18n } from './transform-scope.i18n';

/** 根级或局部扰动的演示参数 */
export type TransformScopePreviewValues = {
  scope: 'root' | 'local';
  amount: number;
};

/** 保持两层与数据域不变，只切换扰动的作用域 */
export const TransformScopePreview = (
  values: TransformScopePreviewValues,
  lang: Lang,
  dimensions?: { width: number; height: number },
) => {
  const i18n = transformScopeI18n[lang];
  const operation = scopeOperationOf(values);
  const declarations = [{ operation }];
  return (
    <Plot
      data={scopeRows}
      width={400}
      height={220}
      dataTransforms={values.scope === 'root' ? declarations : undefined}
      style={
        dimensions
          ? { width: 'auto', height: 'auto', maxWidth: dimensions.width, maxHeight: dimensions.height }
          : undefined
      }
    >
      <PlotScale dimension="x" type="linear" domain={[0, 4]} />
      <PlotScale dimension="y" type="linear" domain={[0, 3]} />
      <PointMark x="x" y="layerA" fill="gray" size={7} />
      <PointMark
        x="x"
        y="layerB"
        fill="dodgerblue"
        size={8}
        shape={{ kind: 'constant', value: 'diamond' }}
        transform={values.scope === 'local' ? declarations : undefined}
      />
      <PlotAxis dimension="x" title={i18n.axis} grid />
    </Plot>
  );
};
