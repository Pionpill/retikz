import { StrokePathOwnerOutputSchema } from '@retikz/core';
import { defineInspector } from '@retikz/inspect';
import { z } from 'zod';

/** 自定义 Path 端点 Inspector 的注册键 */
export const PATH_ENDPOINTS_INSPECTOR_KEY = Object.freeze({
  namespace: 'docs',
  type: 'path-endpoints',
});

/** 用普通 Core Node 标记显式 Path command 端点 */
export const PATH_ENDPOINTS_INSPECTOR = defineInspector({
  ...PATH_ENDPOINTS_INSPECTOR_KEY,
  owner: { kind: 'pathKind', name: 'stroke' },
  subjectSchema: StrokePathOwnerOutputSchema,
  optionsInputSchema: z.strictObject({}),
  optionsSchema: z.strictObject({}),
  inspect: (subject, context) => {
    const markers = subject.commands.flatMap(command =>
      'to' in command
        ? [
            {
              type: 'node' as const,
              position: command.to,
              shape: 'circle',
              minimumSize: 10,
              padding: 0,
              fill: context.appearance.scopeColor,
              stroke: context.appearance.scopeColor,
              strokeWidth: 1,
            },
          ]
        : [],
    );
    if (subject.transforms.length === 0) return markers;
    return {
      type: 'scope' as const,
      transforms: subject.transforms,
      children: markers,
    };
  },
});
