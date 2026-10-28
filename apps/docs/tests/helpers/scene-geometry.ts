import type { Scene, ScenePrimitive, Transform } from '@retikz/core';
import type { BoundsRect, Position } from '@retikz/math';

/** 测试中按 Scene 分组变换投影实际图元 */
const project = (point: Position, transforms: ReadonlyArray<Transform>): Position => {
  let [x, y] = point;
  for (const transform of [...transforms].reverse()) {
    if (transform.kind === 'translate') {
      x += transform.x;
      y += transform.y;
    } else if (transform.kind === 'scale') {
      x *= transform.x;
      y *= transform.y ?? transform.x;
    } else {
      const cx = transform.cx ?? 0,
        cy = transform.cy ?? 0,
        r = (transform.degrees * Math.PI) / 180,
        dx = x - cx,
        dy = y - cy;
      x = cx + dx * Math.cos(r) - dy * Math.sin(r);
      y = cy + dx * Math.sin(r) + dy * Math.cos(r);
    }
  }
  return [x, y];
};

/** 读取实际节点图元的中心和尺寸，不依赖节点布局附加产物 */
export const sceneNodes = (scene: Scene) => {
  const result: Array<{ id?: string; rect: { x: number; y: number; width: number; height: number; rotate: number } }> =
    [];
  const visit = (
    primitives: ReadonlyArray<ScenePrimitive>,
    transforms: ReadonlyArray<Transform>,
    id?: string,
  ): void => {
    for (const p of primitives) {
      if (p.type === 'group') visit(p.children, [...transforms, ...(p.transforms ?? [])], p.id ?? id);
      else if (p.type === 'rect' || p.type === 'ellipse') {
        const x = p.type === 'rect' ? p.x + p.width / 2 : p.cx,
          y = p.type === 'rect' ? p.y + p.height / 2 : p.cy;
        const w = p.type === 'rect' ? p.width : p.rx * 2,
          h = p.type === 'rect' ? p.height : p.ry * 2;
        const c = project([x, y], transforms),
          r = project([x + w / 2, y], transforms),
          b = project([x, y + h / 2], transforms);
        result.push({
          id: p.id ?? id,
          rect: {
            x: c[0],
            y: c[1],
            width: Math.hypot(r[0] - c[0], r[1] - c[1]) * 2,
            height: Math.hypot(b[0] - c[0], b[1] - c[1]) * 2,
            rotate: Math.atan2(r[1] - c[1], r[0] - c[0]),
          },
        });
      }
    }
  };
  visit(scene.primitives, []);
  return result;
};

/** 从命名 Surface 的实际边框路径读取轴对齐外框，限本测试的矩形边框 */
export const sceneSurfaceBounds = (scene: Scene, target: string): BoundsRect => {
  const points: Array<Position> = [];
  const visit = (
    primitives: ReadonlyArray<ScenePrimitive>,
    transforms: ReadonlyArray<Transform>,
    id?: string,
  ): void => {
    for (const primitive of primitives) {
      if (primitive.type === 'group')
        visit(primitive.children, [...transforms, ...(primitive.transforms ?? [])], primitive.id ?? id);
      else if (primitive.type === 'path' && id === target) {
        const halfStroke = (primitive.strokeWidth ?? 0) / 2;
        for (const command of primitive.commands)
          if ('to' in command) {
            points.push(project([command.to[0] - halfStroke, command.to[1] - halfStroke], transforms));
            points.push(project([command.to[0] + halfStroke, command.to[1] + halfStroke], transforms));
          }
      }
    }
  };
  visit(scene.primitives, []);
  if (!points.length) throw new Error('Missing surface border: ' + target);
  const xs = points.map(point => point[0]),
    ys = points.map(point => point[1]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
};
