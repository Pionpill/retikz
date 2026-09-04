import type { IRDataModel } from '@retikz/data';

import {
  DataFieldType,
  DataTransformBindingClass,
  DataTransformFieldEffect,
  DataTransformPhase,
  defineTransform,
} from '@retikz/data';
import { Plot, PlotAxis, PlotScale, PlotTransform, PointMark } from '@retikz/plot-react';
import { z } from 'zod';

import { customTransformRows } from './extension-transform.data';

type ExtensionTransformValues = {
  factor: number;
};

/** 按 JSON-safe factor 生成派生字段的自定义 transform */
export const scaleField = defineTransform({
  schema: z.strictObject({
    kind: z.literal('scale-field').describe('Discriminator: multiply a selected numeric field'),
    field: z.string().min(1).describe('Input field read from each row'),
    as: z.string().min(1).describe('Output field written to each row'),
    factor: z.number().positive().describe('Serializable multiplication factor'),
  }),
  inputFields: operation => [operation.field],
  outputFields: operation => [operation.as],
  outputModel: operation => ({
    kind: 'preserve',
    outputs: [{ field: operation.as, type: DataFieldType.Continuous }],
  }),
  schedule: {
    phase: DataTransformPhase.FieldDerive,
    bindingClass: DataTransformBindingClass.Field,
    fieldEffect: DataTransformFieldEffect.Preserve,
  },
  apply: (rows, operation) =>
    rows.map(row => ({
      ...row,
      [operation.as]: Number(row[operation.field]) * operation.factor,
    })),
});

const model: IRDataModel = [
  { name: 'x', type: 'continuous' },
  { name: 'y', type: 'continuous' },
];

/** 按受控倍数构造自定义 scale-field operation */
export const scaleFieldOperationOf = (values: ExtensionTransformValues) =>
  ({
    kind: 'scale-field',
    field: 'x',
    as: 'scaledX',
    factor: values.factor,
  }) as const;

/** 在固定 x 域中对照原值与受控 transform 输出 */
export const renderExtensionTransformPreview = (values: ExtensionTransformValues) => (
  <Plot
    data={customTransformRows}
    model={model}
    width={420}
    height={260}
    transformDefinitions={[scaleField]}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PlotTransform {...scaleFieldOperationOf(values)} />
    <PlotScale dimension="x" type="linear" domain={[0, 16]} />
    <PointMark x="x" y="y" fill="#94a3b8" opacity={0.7} size={5} />
    <PointMark x="scaledX" y="y" fill="#2563eb" size={7} />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);
