import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import {
  COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS,
  coordinateCompositionFacetMultilevelControls,
  previewControlContract,
} from './coordinate-composition-facet-multilevel.controls';
import { channelRows } from './coordinate-composition-facet-multilevel.data';

/** 注册回退使用的多级分面数据面板 */
export const previewControls = coordinateCompositionFacetMultilevelControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const rowHierarchy =
    values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHierarchy] === 'business-metric'
      ? [
          { field: 'business', order: ['B1', 'B2'] },
          { field: 'metric', order: ['M1', 'M2'] },
        ]
      : [
          { field: 'metric', order: ['M1', 'M2'] },
          { field: 'business', order: ['B1', 'B2'] },
        ];
  const columnHierarchy =
    values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHierarchy] === 'region-channel'
      ? [
          { field: 'region', order: ['R1', 'R2'] },
          { field: 'channel', order: ['C1', 'C2'] },
        ]
      : [
          { field: 'channel', order: ['C1', 'C2'] },
          { field: 'region', order: ['R1', 'R2'] },
        ];

  return (
    <Plot data={channelRows} width={660} height={330}>
      <Facet
        id="regionChannel"
        row={rowHierarchy}
        column={columnHierarchy}
        header={{
          row: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.rowHeaders],
          column: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.columnHeaders],
        }}
        resolve={{ scale: { y: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.scale] } }}
        spacing={{ panelGap: values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.panelGap] }}
      >
        <Axis dimension="x" grid={values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.xGridVisible]} />
        <Axis dimension="y" grid={values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.yGridVisible]} />
        <PathMark
          x="month"
          y="value"
          order="month"
          stroke="darkorange"
          strokeWidth={values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.lineWidth]}
        />
        <PointMark
          x="month"
          y="value"
          fill="white"
          stroke="darkorange"
          strokeWidth={1.25}
          size={values[COORDINATE_COMPOSITION_FACET_MULTILEVEL_CONTROL_IDS.pointSize]}
        />
      </Facet>
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 行列各使用多层字段的分面布局 */
export default controlledPreview.Component;
