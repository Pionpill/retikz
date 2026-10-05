import { PositiveNumberSchema } from '@retikz/foundation';
import { boolean, discriminatedUnion, literal, number, strictObject, tuple } from 'zod';

import { AngleDegreesSchema } from '../scalar';

const PointSchema = tuple([number(), number()]);

/** 校验将子路径起点移到指定坐标的场景命令 */
export const MovePathCommandSchema = strictObject({
  kind: literal('move').describe('Discriminator for move path commands.'),
  to: PointSchema.describe('Move target point.'),
});

/** 校验绘制到指定终点的场景直线命令 */
export const LinePathCommandSchema = strictObject({
  kind: literal('line').describe('Discriminator for line path commands.'),
  to: PointSchema.describe('Line target point.'),
});

/** 校验带单控制点的二次贝塞尔场景命令 */
export const QuadPathCommandSchema = strictObject({
  kind: literal('quad').describe('Discriminator for quadratic Bezier path commands.'),
  control: PointSchema.describe('Quadratic Bezier control point.'),
  to: PointSchema.describe('Quadratic Bezier target point.'),
});

/** 校验带双控制点的三次贝塞尔场景命令 */
export const CubicPathCommandSchema = strictObject({
  kind: literal('cubic').describe('Discriminator for cubic Bezier path commands.'),
  control1: PointSchema.describe('First cubic Bezier control point.'),
  control2: PointSchema.describe('Second cubic Bezier control point.'),
  to: PointSchema.describe('Cubic Bezier target point.'),
});

/** 校验圆心、半径、起止角与方向组成的圆弧命令 */
export const ArcPathCommandSchema = strictObject({
  kind: literal('arc').describe('Discriminator for circular arc path commands.'),
  center: PointSchema.describe('Arc center point.'),
  radius: PositiveNumberSchema.describe('Arc radius in user units.'),
  startAngle: AngleDegreesSchema.describe('Arc start angle in degrees.'),
  endAngle: AngleDegreesSchema.describe('Arc end angle in degrees.'),
  counterClockwise: boolean().optional().describe('Whether to draw counter-clockwise.'),
});

/** 校验双轴半径、旋转与起止角组成的椭圆弧命令 */
export const EllipseArcPathCommandSchema = strictObject({
  kind: literal('ellipseArc').describe('Discriminator for elliptical arc path commands.'),
  center: PointSchema.describe('Ellipse arc center point.'),
  radiusX: PositiveNumberSchema.describe('Ellipse arc x radius in user units.'),
  radiusY: PositiveNumberSchema.describe('Ellipse arc y radius in user units.'),
  rotation: AngleDegreesSchema.optional().describe('Ellipse rotation in degrees.'),
  startAngle: AngleDegreesSchema.describe('Ellipse arc start angle in degrees.'),
  endAngle: AngleDegreesSchema.describe('Ellipse arc end angle in degrees.'),
  counterClockwise: boolean().optional().describe('Whether to draw counter-clockwise.'),
});

/** 校验闭合当前子路径的场景命令 */
export const ClosePathCommandSchema = strictObject({
  kind: literal('close').describe('Discriminator for close-path commands.'),
});

/** 校验场景路径与路径类裁剪资源共享的结构化命令 */
export const PathCommandSchema = discriminatedUnion('kind', [
  MovePathCommandSchema,
  LinePathCommandSchema,
  QuadPathCommandSchema,
  CubicPathCommandSchema,
  ArcPathCommandSchema,
  EllipseArcPathCommandSchema,
  ClosePathCommandSchema,
]).describe('Structured path command used by Scene paths and path-like clip resources.');
