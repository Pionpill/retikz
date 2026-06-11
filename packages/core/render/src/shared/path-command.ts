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
