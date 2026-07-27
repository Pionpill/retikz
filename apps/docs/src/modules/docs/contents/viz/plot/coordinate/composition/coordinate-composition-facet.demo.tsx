import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_FACET_CONTROL_IDS,
  coordinateCompositionFacetControls,
  previewControlContract,
} from './coordinate-composition-facet.controls';
import { accountRows } from './coordinate-composition-facet.data';

/** 注册回退使用的分面布局控件 */
export const previewControls = coordinateCompositionFacetControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const isGrid = values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.layout] === 'grid';

  return (
    <Plot data={accountRows} width={660} height={330}>
      <Facet
        id="accounts"
        row={isGrid ? { field: 'tier', order: ['T1', 'T2'] } : undefined}
        column={{ field: 'product', order: ['P1', 'P2', 'P3'] }}
        empty={isGrid ? values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.empty] : 'drop'}
        header={{
          row: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers],
          column: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.headers],
        }}
        resolve={{ scale: { y: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.scale] } }}
        spacing={{ panelGap: values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.panelGap] }}
      >
        <Axis dimension="x" grid={values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.xGridVisible]} />
        <Axis dimension="y" grid={values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.yGridVisible]} />
        <PathMark
          x="month"
          y="accounts"
          order="month"
          stroke="steelblue"
          strokeWidth={values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.lineWidth]}
        />
        <PointMark
          x="month"
          y="accounts"
          fill="lightblue"
          stroke="steelblue"
          strokeWidth={1}
          size={values[COORDINATE_COMPOSITION_FACET_CONTROL_IDS.pointSize]}
        />
      </Facet>
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 单行或网格分面、共享或独立纵轴范围的试验场 */
export default controlledPreview.Component;
