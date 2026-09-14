import type { CoordinateOwnerOutput, IRChild } from '@retikz/core';
import { CoordinateOwnerOutputSchema } from '@retikz/core';
import { mergeProperties } from '@retikz/foundation';
import type { output as ZodOutput } from 'zod';

import type { InspectorContext } from '../contract';
import { defineInspector } from '../contract';
import { CoordinateInspectOptionsSchema } from '../schema';
import { isolateInspectionChildren, labelNode, markerNode } from './geometry';

type CoordinateInspectorOptions = ZodOutput<typeof CoordinateInspectOptionsSchema>;

/** 内置 Core Coordinate Inspector key */
export const COORDINATE_INSPECTOR_KEY = Object.freeze({ namespace: 'core', type: 'coordinate' });

/** 内置已解析 Coordinate 点 Inspector */
export const COORDINATE_INSPECTOR = defineInspector({
  ...COORDINATE_INSPECTOR_KEY,
  owner: { kind: 'coordinate' },
  subjectSchema: CoordinateOwnerOutputSchema,
  optionsSchema: CoordinateInspectOptionsSchema,
  mergeOptionsInput: (inherited, local) => ({
    ...inherited,
    ...mergeProperties([local], { shouldOverride: value => value !== undefined }),
  }),
  inspect: (subject: CoordinateOwnerOutput, context: InspectorContext<CoordinateInspectorOptions>): Array<IRChild> => {
    const color = context.appearance.scopeColor;
    const output: Array<IRChild> = [markerNode(subject.position, color, 5)];
    if (context.options.labels) {
      output.push(labelNode([subject.position[0] + 6, subject.position[1] + 12], subject.id, color));
    }
    return isolateInspectionChildren(output);
  },
});
