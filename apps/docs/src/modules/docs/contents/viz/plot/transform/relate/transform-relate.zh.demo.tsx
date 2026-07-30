import { Axis, PathMark, Plot, PointMark, RelationMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract, relateControls, relateOperationOf } from './transform-relate.controls';
import { monthlyTrend } from './transform-relate.data';

/** 注册回退使用的行配对控件 */
export const previewControls = relateControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  return (
    <Plot data={monthlyTrend} width={520} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
      <Scale dimension="x" type="linear" domain={[0.5, 6.5]} />
      <Scale dimension="y" type="linear" domain={[20, 62]} />
      <PathMark
        color="series"
        series="series"
        x="month"
        y="value"
        order="month"
        strokeWidth={2.2}
        anchorId={{ prefix: 'trend', field: 'id' }}
      />
      <PointMark
        x="month"
        y="value"
        fill={{ kind: 'constant', value: 'white' }}
        stroke="series"
        strokeWidth={1.2}
        size={5}
      />
      <RelationMark
        transform={[relateOperationOf(values)]}
        source={{ anchorId: { prefix: 'trend', field: 'sourceId' } }}
        target={{ anchorId: { prefix: 'trend', field: 'targetId' } }}
        style={{
          color: { kind: 'constant', value: 'mediumvioletred' },
          strokeWidth: { kind: 'constant', value: 1.6 },
        }}
        path={{
          routing: { kind: 'bend', bendDirection: 'left', bendAngle: 28 },
          label: {
            text: { field: 'deltaLabel' },
            position: 0.5,
            side: 'top',
            distance: 4,
            sloped: true,
            textColor: 'mediumvioletred',
            font: { size: 11, weight: 'bold' },
          },
          options: { marks: [{ pos: 1, mark: { kind: 'arrow' } }] },
        }}
      />
      <Axis dimension="x" title="月份" grid />
      <Axis dimension="y" title="数值" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 切换配对范围并独立选择 source / target 行的行配对试验场 */
export default controlledPreview.Component;
