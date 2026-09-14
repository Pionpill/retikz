import type { IRChild, IRPosition, IRStep, ScopeOwnerOutput } from '@retikz/core';
import { ScopeOwnerOutputSchema } from '@retikz/core';
import { mergeProperties } from '@retikz/foundation';
import type { output as ZodOutput } from 'zod';

import type { InspectorContext } from '../contract';
import { defineInspector } from '../contract';
import { ScopeInspectOptionsSchema } from '../schema';
import {
  cornersOfRect,
  isolateInspectionChildren,
  labelNode,
  markerNode,
  pathStyle,
  rectCornersToPath,
} from './geometry';

type ScopeInspectorOptions = ZodOutput<typeof ScopeInspectOptionsSchema>;

/** 内置 Core Scope Inspector key */
export const SCOPE_INSPECTOR_KEY = Object.freeze({ namespace: 'core', type: 'scope' });

/** 根据 Scope envelope 绘制固有包络，不应用 Scope 最终 transform */
const envelopeChildrenOf = (subject: ScopeOwnerOutput, color: string): Array<IRChild> => {
  const envelope = subject.envelope;
  if (envelope === null) return [];
  const rect = envelope.rect;
  if (envelope.shape === 'rectangle') {
    return [rectCornersToPath(cornersOfRect(rect), pathStyle(color, { dashPattern: [6, 3] }))];
  }

  const rotation = rect.rotate ?? 0;
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  const start: IRPosition = [rect.x + halfWidth, rect.y];
  const steps: Array<IRStep> = [
    { type: 'step', kind: 'move', to: start },
    {
      type: 'step',
      kind: 'arc',
      center: [rect.x, rect.y],
      radius: { x: halfWidth, y: halfHeight },
      startAngle: 0,
      endAngle: 360,
    },
    { type: 'step', kind: 'cycle' },
  ];
  if (rotation === 0) {
    return [{ type: 'path', children: steps, style: pathStyle(color, { dashPattern: [6, 3] }) }];
  }
  return [
    {
      type: 'scope',
      transforms: [{ kind: 'rotate', degrees: (rotation * 180) / Math.PI, pivot: [rect.x, rect.y] }],
      defaults: { reset: true },
      children: [{ type: 'path', children: steps, style: pathStyle(color, { dashPattern: [6, 3] }) }],
    },
  ];
};

/** 内置 Scope 层级与坐标框 Inspector */
export const SCOPE_INSPECTOR = defineInspector({
  ...SCOPE_INSPECTOR_KEY,
  owner: { kind: 'scope' },
  subjectSchema: ScopeOwnerOutputSchema,
  optionsSchema: ScopeInspectOptionsSchema,
  mergeOptionsInput: (inherited, local) => ({
    ...inherited,
    ...mergeProperties([local], { shouldOverride: value => value !== undefined }),
  }),
  inspect: (subject: ScopeOwnerOutput, context: InspectorContext<ScopeInspectorOptions>): Array<IRChild> => {
    const color = context.appearance.scopeColor;
    const output: Array<IRChild> = [];
    if (context.options.envelope) output.push(...envelopeChildrenOf(subject, color));
    if (context.options.origin) output.push(markerNode([0, 0], color, 5));
    if (context.options.axes) {
      const endpoints: Array<IRPosition> = [
        [40, 0],
        [0, 40],
      ];
      for (const endpoint of endpoints) {
        output.push({
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: endpoint },
          ],
          marks: [{ pos: 1, mark: { kind: 'arrow', length: 6, width: 5 } }],
          style: pathStyle(color, { dashPattern: [2, 2] }),
        });
      }
      output.push(labelNode([52, 0], 'x', color), labelNode([0, 52], 'y', color));
    }
    if (context.options.labels) {
      const depth = context.ancestors.length + 1;
      output.push(labelNode([6, -12], `scope ${depth}`, color));
    }
    return isolateInspectionChildren(output);
  },
});
