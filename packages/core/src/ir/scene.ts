import { z } from 'zod';
import { CoordinateSchema } from './coordinate';
import { NodeSchema } from './node';
import { PathSchema } from './path';

export const ChildSchema = z
  .discriminatedUnion('type', [NodeSchema, PathSchema, CoordinateSchema])
  .describe(
    'Top-level scene child: a node, a path, or a coordinate placeholder; discriminator field is `type`',
  );

/** 顶层 Scene 的子节点：node / path / coordinate */
export type IRChild = z.infer<typeof ChildSchema>;

export const SceneSchema = z
  .object({
    version: z
      .literal(1)
      .describe(
        'IR major version number; bump only on breaking schema changes',
      ),
    type: z
      .literal('scene')
      .describe('Discriminator marking this object as the root scene'),
    children: z
      .array(ChildSchema)
      .describe(
        'Top-level children of the scene; nodes register ids that paths can reference',
      ),
  })
  .describe(
    'Top-level retikz IR scene — the canonical, JSON-serializable representation of a drawing',
  );

/** retikz IR 顶层 Scene——可序列化 JSON 形式的绘制描述 */
export type IR = z.infer<typeof SceneSchema>;

/** IR 当前主版本号；只在 schema 出现破坏性变更时递增 */
export const CURRENT_IR_VERSION = 1 as const;
