import type { IRPlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { Layout } from '@retikz/react';

import { PreviewPlot as Plot } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { CUSTOM_MARK_CONTROL_IDS, customMarkControls, previewControlContract } from './mark-custom.controls';
import { glyphRows } from './mark-custom.data';
import { diamondMark } from './mark-custom.definition';

/**
 * 自定义图元：每行投影成一个 diamond glyph。
 * @description type='diamond' 是非内置判别串；collectFields 登记读取的源字段；lower 拿到坐标系 frame，
 *   把每行的 x/y 经 frame.projectRoles 投成屏幕点，再装配 core Node（diamond shape）。
 */
// 自定义图元没有专属 React 组件，经 spec 入口创作：marks 里写 { type: 'diamond', ... }，运行时由 markDefinitions 解释。
/** controls registry 缺失时使用的显式回退 */
export const previewControls = customMarkControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const spec: IRPlotSpec = {
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'glyphs' },
    coordinate: { type: 'cartesian2D', x: 'month', y: 'sales' },
    scales: [
      { type: 'linear', name: 'month' },
      { type: 'linear', name: 'sales' },
    ],
    marks: [
      {
        type: 'diamond',
        minimumSize: values[CUSTOM_MARK_CONTROL_IDS.size],
        fill: values[CUSTOM_MARK_CONTROL_IDS.fill],
        encoding: { x: { field: 'month' }, y: { field: 'sales' } },
      },
    ],
    guides: [
      { type: 'axis', dimension: 'x' },
      { type: 'axis', dimension: 'y', grid: true },
    ],
  };

  return (
    <Layout
      width={450}
      height={250}
      viewBox={{ x: -15, y: -15, width: 450, height: 290 }}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <Plot spec={spec} data={{ glyphs: glyphRows }} width={420} height={260} markDefinitions={[diamondMark]} />
    </Layout>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

const Demo: FC = controlledPreview.Component;

export default Demo;
