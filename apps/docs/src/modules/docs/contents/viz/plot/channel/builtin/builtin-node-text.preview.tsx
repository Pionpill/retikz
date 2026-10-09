import { BuiltinShape } from '@retikz/core';
import { Plot, PlotAxis, BuiltinPlotScale, PointMark } from '@retikz/plot-react';

import { nodeTextRows } from './builtin-node-text.data';

/** 图形参数 */
export type BuiltinNodeTextPreviewValues = {
  padding: number;
  cornerRadius: number;
  rotate: number;
  minimumSize: number;
  scale: number;
  showLabel: boolean;
  labelPosition: 'top' | 'right' | 'bottom' | 'left';
  labelDistance: number;
  labelPin: boolean;
  labelTextColor: string;
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  blendMode: 'overlay' | 'normal' | 'multiply' | 'screen';
  textColor: string;
  align: 'start' | 'middle' | 'end';
  fontSize: number;
  lineHeight: number;
  maxTextWidth: number;
};

/** 绘制示例图形 */
export const BuiltinNodeTextPreview = (values: BuiltinNodeTextPreviewValues) => (
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
  >
    <BuiltinPlotScale dimension="x" type="linear" domain={[0.5, 3.5]} domainPadding={0} />
    <BuiltinPlotScale dimension="y" type="linear" domain={[8, 24]} domainPadding={0} />
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
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
