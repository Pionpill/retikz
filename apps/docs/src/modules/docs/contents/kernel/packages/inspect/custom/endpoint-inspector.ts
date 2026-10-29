import { defineInspector } from '@retikz/inspect';
import { number, strictObject } from 'zod';

/** 自定义端点检查器的注册键 */
export const endpointInspectorKey = { namespace: 'docs', type: 'path-endpoints' };

/** 读取最终 Scene path，使用普通 Node 标记显式端点 */
export const endpointInspector = defineInspector({
  ...endpointInspectorKey,
  subject: { kind: 'primitive', type: 'path' },
  optionsSchema: strictObject({ size: number().positive().default(10) }),
  inspect: (subject, context) =>
    subject.commands.flatMap(command =>
      'to' in command
        ? [
            {
              coordinateSpace: 'local' as const,
              child: {
                type: 'node' as const,
                position: [command.to[0], command.to[1]] as [number, number],
                shape: 'circle',
                layout: { minimumSize: context.options.size, padding: 0 },
                style: { fill: context.appearance.scopeColor, stroke: 'none' },
              },
            },
          ]
        : [],
    ),
});
