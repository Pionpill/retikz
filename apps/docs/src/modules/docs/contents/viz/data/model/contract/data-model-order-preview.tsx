import type { IRDataFieldDefinition } from '@retikz/data';

import { Axis, IntervalMark, Plot, Scale } from '@retikz/plot-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import type { dataModelOrderControls } from './data-model-order.controls';

import { sizeSales } from './data-model-order.data';

type DataModelOrderValues = PreviewControlValuesFor<typeof dataModelOrderControls>;

/** 按控件状态解析分类域顺序 */
const categoryOrderOf = (mode: DataModelOrderValues['orderMode']): IRDataFieldDefinition['order'] =>
  mode === 'business' ? ['S', 'M', 'L', 'XL'] : mode;

/** 渲染分类域顺序试验场 */
export const renderDataModelOrderPreview = (values: DataModelOrderValues) => (
  <Plot
    data={sizeSales}
    model={[
      { name: 'size', type: 'categorical', order: categoryOrderOf(values.orderMode) },
      { name: 'value', type: 'continuous' },
    ]}
    width={410}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <IntervalMark x="size" y="value" color="size" />
    <Scale dimension="y" type="linear" domainPadding={0} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);
