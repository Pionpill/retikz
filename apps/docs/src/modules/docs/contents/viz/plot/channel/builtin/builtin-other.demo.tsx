import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinOtherControls, previewControlContract } from './builtin-other.controls';
import { otherRows } from './builtin-other.data';

/** 注册回退使用的其他通道数据面板 */
export const previewControls = builtinOtherControls;

const controlledPreview = defineControlledPreview(previewControlContract, () => (
  <Plot
    data={otherRows}
    model={[
      { name: 'step', type: 'continuous' },
      { name: 'value', type: 'continuous' },
      { name: 'series', type: 'categorical' },
    ]}
    width={380}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="step" y="value" size={12} fill="#bfdbfe" stroke="#1d4ed8" zIndex={2} />
    <PathMark x="step" y="value" order="step" series="series" color="series" strokeWidth={3} zIndex={1} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 排序、系列拆分与绘制顺序 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
