import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { LegendContentKind } from '@retikz/standard';
import { Legend, LegendItem, LegendRamp, LegendTick, LegendTitle } from '@retikz/standard-react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { defineControlledPreview } from '@/modules/docs/preview';

import { legendPlaygroundControls, previewControlContract } from './legend-playground.controls';

export const previewControls = legendPlaygroundControls;

const LEGEND_WIDTH = 300;

type LegendPlaygroundValues = PreviewControlValuesFor<typeof legendPlaygroundControls>;

const sample = (id: string, color: string, height: number) => (
  <Node
    id={id}
    position={[0, 0]}
    text=""
    minimumSize={{ width: 28, height }}
    padding={0}
    stroke={color}
    fill={color}
    fillOpacity={0.14}
    cornerRadius={4}
  />
);

const label = (id: string, text: string) => <Node id={id} position={[0, 0]} text={text} stroke="none" />;

const title = (values: LegendPlaygroundValues) =>
  values.title === '' ? null : (
    <LegendTitle>
      <Node
        id="legend-title"
        position={[0, 0]}
        text={values.title}
        align={values.titleAlign}
        font={{
          size: values.titleFontSize,
          weight: values.titleFontWeight,
          style: values.titleFontStyle,
        }}
        padding={0}
        stroke="none"
        fill="none"
      />
    </LegendTitle>
  );

const rampSample = (direction: 'vertical' | 'horizontal') => (
  <Node
    id="ramp-sample"
    position={[0, 0]}
    text=""
    minimumSize={direction === 'horizontal' ? { width: 160, height: 16 } : { width: 16, height: 120 }}
    padding={0}
    stroke="lightgray"
    fill={{
      kind: 'linearGradient',
      angle: direction === 'horizontal' ? 0 : 90,
      stops: [
        { offset: 0, color: 'dodgerblue' },
        { offset: 0.5, color: 'gold' },
        { offset: 1, color: 'orangered' },
      ],
    }}
  />
);

/** 使用控制值构造可测试的 Legend playground React authoring */
export const LegendPlaygroundPreview = (values: LegendPlaygroundValues) => (
  <Layout
    width={400}
    height={245}
    viewBox={{ x: -20, y: -20, width: 400, height: 245 }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    {values.kind === LegendContentKind.Items ? (
      <Legend
        kind={LegendContentKind.Items}
        size={{ x: { kind: 'fixed', value: LEGEND_WIDTH }, y: { kind: 'fixed', value: 175 } }}
        padding={values.padding}
        titleGap={values.titleGap}
        contentAlign={values.contentAlign}
        overflow={values.overflow}
        direction={values.direction}
        wrap={values.wrap}
        sampleAlign={values.sampleAlign}
        columnGap={values.columnGap}
        rowGap={values.rowGap}
        sampleGap={values.sampleGap}
      >
        {title(values)}
        <LegendItem itemKey="a" sample={sample('sample-a', 'dodgerblue', 20)}>
          {label('label-a', 'A')}
        </LegendItem>
        <LegendItem itemKey="b" sample={sample('sample-b', 'darkorange', 32)}>
          {label('label-b', 'B')}
        </LegendItem>
        <LegendItem itemKey="c" sample={sample('sample-c', 'darkviolet', 24)}>
          {label('label-c', 'C')}
        </LegendItem>
        <LegendItem itemKey="d" sample={sample('sample-d', 'green', 28)}>
          {label('label-d', 'D')}
        </LegendItem>
      </Legend>
    ) : (
      <Legend
        kind={LegendContentKind.Ramp}
        size={{ x: { kind: 'fixed', value: LEGEND_WIDTH }, y: { kind: 'fixed', value: 175 } }}
        padding={values.padding}
        titleGap={values.titleGap}
        contentAlign={values.contentAlign}
        overflow={values.overflow}
        direction={values.direction}
        sampleGap={values.sampleGap}
      >
        {title(values)}
        <LegendRamp>{rampSample(values.direction)}</LegendRamp>
        <LegendTick tickKey="start" offset={0}>
          {label('tick-start', '0')}
        </LegendTick>
        <LegendTick tickKey="middle" offset={0.5}>
          {label('tick-middle', '50')}
        </LegendTick>
        <LegendTick tickKey="end" offset={1}>
          {label('tick-end', '100')}
        </LegendTick>
      </Legend>
    )}
  </Layout>
);

const controlledPreview = defineControlledPreview(previewControlContract, LegendPlaygroundPreview);

export const previewSource = controlledPreview.source;

/** Legend 排列、换行、对齐、间距与溢出 playground */
const Demo: FC = controlledPreview.Component;

export default Demo;
