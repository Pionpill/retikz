/**
 * PathCommand 几何（renderer 无关纯函数）。
 */
import type { PathCommand } from '@retikz/core';

const DEG_TO_RAD = Math.PI / 180;

/**
 * 取一个 PathCommand 的末端 endpoint（与 core 同口径）
 * @description move/line/quad/cubic → `to`；arc/ellipseArc → 极坐标末点（绕 center 按 endAngle）；close 无端点 → null。
 *   drawScene 末端箭头定位、animate pathDraw 弧长揭示等共用，避免多处口径漂移。
 */
export const commandEndpoint = (cmd: PathCommand): [number, number] | null => {
  switch (cmd.kind) {
    case 'move':
    case 'line':
    case 'quad':
    case 'cubic':
      return [cmd.to[0], cmd.to[1]];
    case 'arc': {
      const rad = cmd.endAngle * DEG_TO_RAD;
      return [cmd.center[0] + Math.cos(rad) * cmd.radius, cmd.center[1] + Math.sin(rad) * cmd.radius];
    }
    case 'ellipseArc': {
      const rad = cmd.endAngle * DEG_TO_RAD;
      return [cmd.center[0] + Math.cos(rad) * cmd.radiusX, cmd.center[1] + Math.sin(rad) * cmd.radiusY];
    }
    case 'close':
      return null;
  }
};

/**
 * 收集一段 path commands 的「控制点」松包围点集（renderer 无关纯函数）
 * @description 曲线取控制点、弧取半径外接角点：move/line → `to`；quad → `control` + `to`；cubic → `control1` +
 *   `control2` + `to`；arc → `center ± radius` 两角点；ellipseArc → `center ± (radiusX, radiusY)` 两角点；close 无点。
 *   控制点凸包必含曲线，故其并集 bbox 是真包围盒的松上界——做 gradient 映射 / 聚合几何足够，避免曲线精确求极值。
 *   drawScene 的 `pathBBox`、hydration 聚合几何的 path 叶子角点共用，钉死松包围口径不漂移。
 */
export const pathControlPoints = (commands: ReadonlyArray<PathCommand>): Array<[number, number]> => {
  const points: Array<[number, number]> = [];
  for (const command of commands) {
    switch (command.kind) {
      case 'move':
      case 'line':
        points.push(command.to);
        break;
      case 'quad':
        points.push(command.control, command.to);
        break;
      case 'cubic':
        points.push(command.control1, command.control2, command.to);
        break;
      case 'arc':
        points.push(
          [command.center[0] - command.radius, command.center[1] - command.radius],
          [command.center[0] + command.radius, command.center[1] + command.radius],
        );
        break;
      case 'ellipseArc':
        points.push(
          [command.center[0] - command.radiusX, command.center[1] - command.radiusY],
          [command.center[0] + command.radiusX, command.center[1] + command.radiusY],
        );
        break;
      case 'close':
        break;
    }
  }
  return points;
};
