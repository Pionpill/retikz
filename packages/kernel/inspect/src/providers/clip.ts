import type { ClipOwnerOutput, IRChild, IRPosition, PathCommand } from '@retikz/core';
import type { output as ZodOutput } from 'zod';

import { ClipOwnerOutputSchema } from '@retikz/core';

import type { InspectorContext } from '../contract';

import { defineInspector } from '../contract';
import { ClipInspectOptionsSchema } from '../schema';
import { isolateInspectionChildren, labelNode, pathCommandsToChildren, pathStyle, pointAtArcCommand } from './geometry';

type ClipInspectorOptions = ZodOutput<typeof ClipInspectOptionsSchema>;

/** 内置 Core Clip Inspector key */
export const CLIP_INSPECTOR_KEY = Object.freeze({ namespace: 'core', type: 'clip' });

/** 取最终 Clip 路径的第一个可见位置，供应用标签定位 */
const firstPathPosition = (commands: ReadonlyArray<PathCommand>): IRPosition | undefined => {
  let current: IRPosition | undefined;
  for (const command of commands) {
    switch (command.kind) {
      case 'move':
        return command.to;
      case 'line':
      case 'quad':
      case 'cubic':
        current = command.to;
        break;
      case 'arc':
      case 'ellipseArc':
        current = pointAtArcCommand(command, command.startAngle);
        break;
      case 'close':
        break;
    }
    if (current !== undefined) return current;
  }
  return current;
};

/** 内置 Clip application Inspector */
export const CLIP_INSPECTOR = defineInspector({
  ...CLIP_INSPECTOR_KEY,
  owner: { kind: 'clip' },
  subjectSchema: ClipOwnerOutputSchema,
  optionsSchema: ClipInspectOptionsSchema,
  mergeOptionsInput: (inherited, local) => ({
    ...inherited,
    ...(local.outline === undefined ? {} : { outline: local.outline }),
    ...(local.labels === undefined ? {} : { labels: local.labels }),
  }),
  inspect: (subject: ClipOwnerOutput, context: InspectorContext<ClipInspectorOptions>): Array<IRChild> => {
    const output: Array<IRChild> = [];
    if (context.options.outline) {
      output.push(
        ...pathCommandsToChildren(subject.path.commands, pathStyle(context.appearance.scopeColor), {
          implicitClose: true,
        }),
      );
    }
    if (context.options.labels) {
      const position = firstPathPosition(subject.path.commands);
      if (position !== undefined) {
        output.push(labelNode([position[0] + 6, position[1] - 12], 'clip', context.appearance.scopeColor));
      }
    }
    return isolateInspectionChildren(output);
  },
});
