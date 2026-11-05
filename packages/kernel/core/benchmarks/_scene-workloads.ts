import type { BoundsRect } from '@retikz/math';

import type { CompiledArrowEnd, PathCommand, PathPrimitive, ScenePrimitive, SceneResource } from '../src/contract';

/** 可见边界基准的六类代表负载 */
export type SceneBoundsMode = 'polyline' | 'bezier' | 'ellipse' | 'arrows' | 'hidden-arrows' | 'clipped-group';

/** 单次边界求值的完整输入及独立几何预期 */
export type SceneBoundsWorkload = {
  /** 最终Scene图元，不在采样中增长 */
  primitives: Array<ScenePrimitive>;
  /** 配套裁剪资源 */
  resources: Array<SceneResource>;
  /** 按输入构造规则计算的独立轴对齐边界 */
  expectedBounds: BoundsRect;
};

/** 构造单路径或单裁剪组；规模包含首条move命令，不包含固定marker及5条clip命令 */
export const createSceneBoundsWorkload = (count: number, mode: SceneBoundsMode): SceneBoundsWorkload => {
  const commands: Array<PathCommand> = [{ kind: 'move', to: [0, 0] }];
  const hasEllipses = mode === 'ellipse' || mode === 'arrows' || mode === 'hidden-arrows';
  for (let index = 1; index < count; index++) {
    if (hasEllipses) {
      commands.push({
        kind: 'ellipseArc',
        center: [index * 20, 0],
        radiusX: 8,
        radiusY: 4,
        rotation: 30,
        startAngle: 0,
        endAngle: 90,
      });
    } else if (mode === 'bezier') {
      commands.push({
        kind: 'cubic',
        control1: [index - 1, 10],
        control2: [index, -10],
        to: [index, 0],
      });
    } else {
      commands.push({ kind: 'line', to: [index, index % 2 === 0 ? 0 : 10] });
    }
  }

  const path: PathPrimitive = { type: 'path', commands, stroke: '#000', strokeWidth: 2, lineJoin: 'round' };
  let expectedBounds: BoundsRect;
  if (hasEllipses) {
    // 旋转30度、半轴8/4的完整保守包络：半宽sqrt(52)，半高sqrt(28)
    const halfWidth = Math.sqrt(52);
    const halfHeight = Math.sqrt(28);
    expectedBounds = {
      x: -1,
      y: -halfHeight - 1,
      width: (count - 1) * 20 + halfWidth + 2,
      height: halfHeight * 2 + 2,
    };
  } else {
    expectedBounds = {
      x: -1,
      y: mode === 'bezier' ? -11 : -1,
      width: count + 1,
      height: mode === 'bezier' ? 22 : 12,
    };
  }

  if (mode === 'arrows' || mode === 'hidden-arrows') {
    // 2x2实际尺寸的marker完整落在上述含描边包络内，首尾可见箭头仍参与求值
    const arrow: CompiledArrowEnd = {
      shape: 'bounds-benchmark',
      baseSize: 10,
      refX: 0,
      markerWidth: 1,
      markerHeight: 1,
      marker: [{ type: 'rect', x: 0, y: 0, width: 10, height: 10, fill: '#000' }],
      ...(mode === 'hidden-arrows' ? { opacity: 0 } : {}),
    };
    path.arrowStart = arrow;
    path.arrowEnd = arrow;
  }

  if (mode === 'clipped-group') {
    const clipWidth = (count - 1) / 2;
    return {
      primitives: [
        {
          type: 'group',
          clipRef: 'bounds-window',
          transforms: [{ kind: 'translate', x: 3, y: 7 }],
          children: [path],
        },
      ],
      resources: [
        {
          kind: 'clip',
          id: 'bounds-window',
          path: {
            fillRule: 'nonzero',
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [clipWidth, 0] },
              { kind: 'line', to: [clipWidth, 5] },
              { kind: 'line', to: [0, 5] },
              { kind: 'close' },
            ],
          },
        },
      ],
      expectedBounds: { x: 3, y: 7, width: clipWidth, height: 5 },
    };
  }

  return { primitives: [path], resources: [], expectedBounds };
};
