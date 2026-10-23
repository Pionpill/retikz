import { PositionSchema } from '@retikz/core';
import { PositiveNumberSchema } from '@retikz/foundation';
import { number, boolean, discriminatedUnion, literal, strictObject } from 'zod';

/** 校验将子路径起点移到指定坐标的裁剪输入命令 */
const MovePathClipCommandSchema = strictObject({
  kind: literal('move').describe('Discriminator for move path commands.'),
  to: PositionSchema.describe('Move target point.'),
});

/** 校验绘制到指定终点的裁剪输入直线命令 */
const LinePathClipCommandSchema = strictObject({
  kind: literal('line').describe('Discriminator for line path commands.'),
  to: PositionSchema.describe('Line target point.'),
});

/** 校验带单控制点的二次贝塞尔裁剪输入命令 */
const QuadPathClipCommandSchema = strictObject({
  kind: literal('quad').describe('Discriminator for quadratic Bezier path commands.'),
  control: PositionSchema.describe('Quadratic Bezier control point.'),
  to: PositionSchema.describe('Quadratic Bezier target point.'),
});

/** 校验带双控制点的三次贝塞尔裁剪输入命令 */
const CubicPathClipCommandSchema = strictObject({
  kind: literal('cubic').describe('Discriminator for cubic Bezier path commands.'),
  control1: PositionSchema.describe('First cubic Bezier control point.'),
  control2: PositionSchema.describe('Second cubic Bezier control point.'),
  to: PositionSchema.describe('Cubic Bezier target point.'),
});

/** 校验圆心、半径、起止角与方向组成的圆弧命令 */
const ArcPathClipCommandSchema = strictObject({
  kind: literal('arc').describe('Discriminator for circular arc path commands.'),
  center: PositionSchema.describe('Arc center point.'),
  radius: PositiveNumberSchema.describe('Arc radius in user units.'),
  startAngle: number().describe('Arc start angle in degrees.'),
  endAngle: number().describe('Arc end angle in degrees.'),
  counterClockwise: boolean().optional().describe('Whether to draw counter-clockwise.'),
});

/** 校验双轴半径、旋转与起止角组成的椭圆弧命令 */
const EllipseArcPathClipCommandSchema = strictObject({
  kind: literal('ellipseArc').describe('Discriminator for elliptical arc path commands.'),
  center: PositionSchema.describe('Ellipse arc center point.'),
  radiusX: PositiveNumberSchema.describe('Ellipse arc x radius in user units.'),
  radiusY: PositiveNumberSchema.describe('Ellipse arc y radius in user units.'),
  rotation: number().optional().describe('Ellipse rotation in degrees.'),
  startAngle: number().describe('Ellipse arc start angle in degrees.'),
  endAngle: number().describe('Ellipse arc end angle in degrees.'),
  counterClockwise: boolean().optional().describe('Whether to draw counter-clockwise.'),
});

/** 校验闭合当前子路径的裁剪输入命令 */
const ClosePathClipCommandSchema = strictObject({
  kind: literal('close').describe('Discriminator for close-path commands.'),
});

/** 校验路径裁剪输入的结构化命令 */
export const PathClipCommandSchema = discriminatedUnion('kind', [
  MovePathClipCommandSchema,
  LinePathClipCommandSchema,
  QuadPathClipCommandSchema,
  CubicPathClipCommandSchema,
  ArcPathClipCommandSchema,
  EllipseArcPathClipCommandSchema,
  ClosePathClipCommandSchema,
]).describe('Structured command authored in a path clip input.');
