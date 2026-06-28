import { z } from 'zod';
import { ShapeRefSchema } from '../shape';

/** 连接面引用：保留字 'shape'/'circle' 或借用已注册 shape（裸名 / {type, params}） */
export const BoundarySchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe(
    'Connection surface: how edges meet this node and how compass anchors resolve, independent of the visual `shape`. Reserved keywords: "shape" (default — the node\'s own visual shape) and "circle" (true circle, radius = larger AABB half-axis). Any other registered shape name ("rectangle" / "ellipse" / "polygon" / …) or `{ type, params }` borrows that shape\'s boundary over this node\'s bounding box. Layout-neutral: never changes the node footprint. Named shape-specific anchors and edge proportional points always resolve against the visual shape.',
  );
