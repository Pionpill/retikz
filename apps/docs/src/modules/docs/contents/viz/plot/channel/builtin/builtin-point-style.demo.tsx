import type { FC } from 'react';

import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinPointStyleControls, previewControlContract } from './builtin-point-style.controls';

const rows = [
  { x: 1, y: 12 },
  { x: 2, y: 18 },
  { x: 3, y: 14 },
  { x: 4, y: 22 },
  { x: 5, y: 17 },
];

/** 注册回退使用的点样式 controls */
export const previewControls = builtinPointStyleControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => {
  const usesColor = values.paintChannel === 'color';
  const usesFill = values.paintChannel === 'fill';
  const usesStroke = values.paintChannel === 'stroke';

  return (
    <Plot
      data={rows}
      model={[
        { name: 'x', type: 'continuous' },
        { name: 'y', type: 'continuous' },
      ]}
      width={440}
      height={280}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <PointMark
        x="x"
        y="y"
        color={usesColor ? { kind: 'constant', value: values.paint } : undefined}
        fill={
          usesFill
            ? { kind: 'constant', value: values.paint }
            : usesStroke
              ? { kind: 'constant', value: '#dbeafe' }
              : undefined
        }
        stroke={
          usesStroke
            ? { kind: 'constant', value: values.paint }
            : usesFill
              ? { kind: 'constant', value: '#1e3a8a' }
              : undefined
        }
        strokeWidth={values.strokeWidth}
        opacity={values.opacity}
        fillOpacity={values.fillOpacity}
        strokeOpacity={values.strokeOpacity}
        size={values.size}
        shape={{ kind: 'constant', value: values.shape }}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  );
});

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 点颜色、透明度、大小与形状 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
