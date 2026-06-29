import { z } from 'zod';

import { ShapeRefSchema } from '../shape';

/** 连接面引用：保留字 'shape'/'circle' 或借用已注册 shape（裸名 / {type, params}） */
export const BoundarySchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe(
    'Connection surface for edge endpoints and standard direction anchors, independent of the visual `shape`. Reserved name: "shape"; other names first use CompileOptions.boundaries, then fall back to registered shape boundaries. Does not change node layout.',
  );
