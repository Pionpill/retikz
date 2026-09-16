import { StrokePathOwnerOutputSchema } from '@retikz/core';
import { defineInspector } from '@retikz/inspect';

/** Registry key shared by both hosts. */
export const endpointInspectorKey = { namespace: 'docs', type: 'path-endpoints' };

/** Mark explicit path endpoints using final owner geometry. */
export const endpointInspector = defineInspector({
  ...endpointInspectorKey,
  owner: { kind: 'path', name: 'stroke' },
  subjectSchema: StrokePathOwnerOutputSchema,
  inspect: (subject, context) => {
    const markers = subject.commands.flatMap(command =>
      'to' in command
        ? [
            {
              type: 'node' as const,
              position: command.to,
              shape: 'circle',
              layout: { minimumSize: 10, padding: 0 },
              style: {
                fill: context.appearance.scopeColor,
                stroke: context.appearance.scopeColor,
                strokeWidth: 1,
              },
            },
          ]
        : [],
    );
    if (subject.transforms.length === 0) return markers;
    return { type: 'scope' as const, transforms: subject.transforms, children: markers };
  },
});
