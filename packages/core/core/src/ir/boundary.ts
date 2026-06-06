import { z } from 'zod';
import type { ValueOf } from '../types';
import { ShapeRefSchema } from './shape';

/** 连接面引用：保留字 'shape'/'circle' 或借用已注册 shape（裸名 / {type, params}） */
export const BoundarySchema = z
  .union([z.string().min(1), ShapeRefSchema])
  .describe(
    'Connection surface: how edges meet this node and how compass anchors resolve, independent of the visual `shape`. Reserved keywords: "shape" (default — the node\'s own visual shape) and "circle" (true circle, radius = larger AABB half-axis). Any other registered shape name ("rectangle" / "ellipse" / "polygon" / …) or `{ type, params }` borrows that shape\'s boundary over this node\'s bounding box. Layout-neutral: never changes the node footprint. Named shape-specific anchors and edge proportional points always resolve against the visual shape.',
  );

/** 连接面引用类型（'shape' | 'circle' | 其它 shape 名 | {type, params}） */
export type IRBoundary = z.infer<typeof BoundarySchema>;

/** 连接面保留关键字：非「借用已注册 shape」的两个内置语义（编译期消解） */
export const Boundary = {
  /** 连接面 = 节点自身视觉形状（默认） */
  Self: 'shape',
  /** 真圆：半径 = 节点 AABB 较长半轴 max(halfWidth, halfHeight) */
  Circle: 'circle',
} as const;

/** 连接面保留关键字联合（'shape' | 'circle'；其余取值为借用的 shape 引用） */
export type BoundaryKeyword = ValueOf<typeof Boundary>;
