import { createOpenStringSchema } from '@retikz/foundation';
import { union } from 'zod';

import { BuiltinShape, ShapeRefSchema } from '../shape';
import { BoundaryKeyword } from './constants';

const BoundaryNameSchema = createOpenStringSchema({ ...BuiltinShape, Self: BoundaryKeyword.Self });

/** 校验路径端点和方向锚点使用的连接面名称或参数化形状引用 */
export const BoundarySchema = union([BoundaryNameSchema, ShapeRefSchema]).describe(
  'Connection surface for edge endpoints and direction anchors. "shape" uses the visual shape; registered boundary providers override shape fallback.',
);
