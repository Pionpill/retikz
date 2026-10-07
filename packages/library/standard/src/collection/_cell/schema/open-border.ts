import { PathSchema } from '@retikz/core';

/** 线性容器开放边框的非结构路径属性与默认外观 */
export const OpenBorderSchema = PathSchema.omit({
  type: true,
  id: true,
  children: true,
  kind: true,
  kindOptions: true,
})
  .extend({
    style: PathSchema.shape.style
      .unwrap()
      .extend({
        stroke: PathSchema.shape.style
          .unwrap()
          .shape.stroke.default('currentColor')
          .describe('Border stroke color; defaults to currentColor.'),
        strokeWidth: PathSchema.shape.style
          .unwrap()
          .shape.strokeWidth.default(1)
          .describe('Border stroke width in drawing units.'),
        fill: PathSchema.shape.style.unwrap().shape.fill.default('none').describe('Optional fill; defaults to none.'),
      })
      .optional(),
  })
  .describe('Non-structural Core path properties of the open border.');
