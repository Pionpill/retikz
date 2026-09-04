import { definePositionAdjustment } from '@retikz/plot';
import { z } from 'zod';

const ScreenNudgeSchema = z.strictObject({
  kind: z.literal('screen-nudge'),
  dx: z.number(),
  dy: z.number(),
});

type ScreenNudge = z.infer<typeof ScreenNudgeSchema>;

/** 投影完成后给整组 Point 添加固定屏幕方向偏移 */
export const screenNudge = definePositionAdjustment<ScreenNudge>({
  space: 'screen',
  schema: ScreenNudgeSchema,
  initialize: (operation, context) =>
    context.targets.map(target => ({
      key: target.key,
      position:
        target.position === null ? null : [target.position[0] + operation.dx, target.position[1] + operation.dy],
    })),
});
