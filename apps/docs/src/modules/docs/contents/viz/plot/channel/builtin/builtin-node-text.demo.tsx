import type { FC } from 'react';

import { BuiltinShape } from '@retikz/core';
import { Axis, Plot, PointMark, Scale } from '@retikz/plot-react';

import { defineControlledPreview } from '@/modules/docs/preview';

import { builtinNodeTextControls, previewControlContract } from './builtin-node-text.controls';
import { nodeTextRows } from './builtin-node-text.data';

/** 注册回退使用的节点与文本 controls */
export const previewControls = builtinNodeTextControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Plot
    data={nodeTextRows}
    model={[
      { name: 'x', type: 'continuous' },
      { name: 'nodeY', type: 'continuous' },
      { name: 'textY', type: 'continuous' },
      { name: 'word', type: 'categorical' },
      { name: 'tag', type: 'categorical' },
    ]}
    width={520}
    height={360}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <Scale dimension="x" type="linear" domain={[0.5, 3.5]} domainPadding={0} />
    <Scale dimension="y" type="linear" domain={[8, 24]} domainPadding={0} />
    <PointMark
      x="x"
      y="nodeY"
      shape={{ kind: 'constant', value: BuiltinShape.Rectangle }}
      fill={{ kind: 'constant', value: '#dbeafe' }}
      stroke={{ kind: 'constant', value: '#1d4ed8' }}
      strokeWidth={1.5}
      padding={values.padding}
      cornerRadius={values.cornerRadius}
      rotate={values.rotate}
      minimumSize={values.minimumSize}
      scale={values.scale}
      label={values.showLabel ? 'tag' : undefined}
      labelPosition={values.labelPosition}
      labelDistance={values.labelDistance}
      labelPin={values.labelPin}
      labelTextColor={values.labelTextColor}
      shadow={values.shadow}
      blendMode={values.blendMode}
    />
    <PointMark
      x="x"
      y="textY"
      text="word"
      textColor={{ kind: 'constant', value: values.textColor }}
      align={values.align}
      font={{ size: values.fontSize, weight: 'bold' }}
      lineHeight={values.lineHeight}
      maxTextWidth={values.maxTextWidth}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
));

/** canonical 状态派生的稳定源码配置 */
export const previewSource = controlledPreview.source;

/** 节点几何、文本、标签与效果 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
