import type { ContourCommand } from '../algorithms';
import type { Position } from './point';

/**
 * 矩形 outline：两对角 → 顺时针 path 算子序列
 * @description from/to 任意顺序，归一化 (x0,y0)=min、(x1,y1)=max。直角 = 3 line + close（起点左上 (x0,y0)）；
 *   圆角 = 4 line + 4 quarter-arc + close（起点 (x0+r, y0)）。cornerRadius clamp 到 min(w,h)/2。
 *   角度约定同 `@retikz/math` arc（y-down：0=+x, 90=+y/下, 180=-x, 270=-y/上）
 */
export const rectOutline = (from: Position, to: Position, cornerRadius?: number): Array<ContourCommand> => {
  const x0 = Math.min(from[0], to[0]);
  const x1 = Math.max(from[0], to[0]);
  const y0 = Math.min(from[1], to[1]);
  const y1 = Math.max(from[1], to[1]);
  const r = cornerRadius === undefined ? 0 : Math.min(cornerRadius, (x1 - x0) / 2, (y1 - y0) / 2);

  if (r <= 0) {
    return [
      { kind: 'move', to: [x0, y0] },
      { kind: 'line', to: [x1, y0] },
      { kind: 'line', to: [x1, y1] },
      { kind: 'line', to: [x0, y1] },
      { kind: 'close' },
    ];
  }

  return [
    { kind: 'move', to: [x0 + r, y0] },
    { kind: 'line', to: [x1 - r, y0] },
    { kind: 'arc', center: [x1 - r, y0 + r], radius: r, startAngle: 270, endAngle: 360 },
    { kind: 'line', to: [x1, y1 - r] },
    { kind: 'arc', center: [x1 - r, y1 - r], radius: r, startAngle: 0, endAngle: 90 },
    { kind: 'line', to: [x0 + r, y1] },
    { kind: 'arc', center: [x0 + r, y1 - r], radius: r, startAngle: 90, endAngle: 180 },
    { kind: 'line', to: [x0, y0 + r] },
    { kind: 'arc', center: [x0 + r, y0 + r], radius: r, startAngle: 180, endAngle: 270 },
    { kind: 'close' },
  ];
};
