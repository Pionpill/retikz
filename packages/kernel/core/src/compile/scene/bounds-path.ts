import type { BoundsRect } from '@retikz/math';
import { DEG_TO_RAD, boundsToRect } from '@retikz/math';

import type { PathCommand } from '../../contract';
import type { IRPosition } from '../../schemas';

/** 计算旋转椭圆的轴对齐边界 */
export const calculateEllipseBounds = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotationDegrees = 0,
): BoundsRect => {
  const theta = rotationDegrees * DEG_TO_RAD;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const halfWidth = Math.sqrt((rx * cos) ** 2 + (ry * sin) ** 2);
  const halfHeight = Math.sqrt((rx * sin) ** 2 + (ry * cos) ** 2);

  return {
    x: cx - halfWidth,
    y: cy - halfHeight,
    width: halfWidth * 2,
    height: halfHeight * 2,
  };
};

/** 单次遍历汇总命令的保守边界，曲线仍使用控制点包络，不物化中间点集 */
export const calculatePathBounds = (commands: ReadonlyArray<PathCommand>): BoundsRect | undefined => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let pointCount = 0;

  /** 保持boundsOf的比较顺序、负零与非有限数语义，仅将点提取和扫描融合 */
  const includePoint = (x: number, y: number): void => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    pointCount++;
  };

  for (const command of commands) {
    switch (command.kind) {
      case 'move':
      case 'line':
        includePoint(command.to[0], command.to[1]);
        break;
      case 'quad':
        includePoint(command.control[0], command.control[1]);
        includePoint(command.to[0], command.to[1]);
        break;
      case 'cubic':
        includePoint(command.control1[0], command.control1[1]);
        includePoint(command.control2[0], command.control2[1]);
        includePoint(command.to[0], command.to[1]);
        break;
      case 'arc':
        includePoint(command.center[0] - command.radius, command.center[1] - command.radius);
        includePoint(command.center[0] + command.radius, command.center[1] + command.radius);
        break;
      case 'ellipseArc': {
        const rect = calculateEllipseBounds(
          command.center[0],
          command.center[1],
          command.radiusX,
          command.radiusY,
          command.rotation,
        );
        includePoint(rect.x, rect.y);
        includePoint(rect.x + rect.width, rect.y + rect.height);
        break;
      }
      case 'close':
        break;
    }
  }

  return pointCount === 0 ? undefined : boundsToRect({ minX, minY, maxX, maxY });
};

/** 箭头定位需要的路径端点及切线 */
type EndpointSample = {
  /** 路径端点坐标 */
  point: IRPosition;
  /** 采样处的切线方向 */
  tangent: IRPosition;
};

/** 遍历子路径取得首尾采样点和朝外切线，供箭头边界计算 */
export const samplePathEndpoints = (
  commands: ReadonlyArray<PathCommand>,
): {
  start?: EndpointSample;
  end?: EndpointSample;
} => {
  let cursor: IRPosition = [0, 0];
  let subpathStart: IRPosition = cursor;
  let start: EndpointSample | undefined;
  let end: EndpointSample | undefined;

  for (const command of commands) {
    if (command.kind === 'move') {
      cursor = command.to;
      subpathStart = command.to;
      continue;
    }

    let next = cursor;
    let startTangent: IRPosition = [1, 0];
    let endTangent: IRPosition = [1, 0];

    switch (command.kind) {
      case 'line':
        next = command.to;
        startTangent = [next[0] - cursor[0], next[1] - cursor[1]];
        endTangent = startTangent;
        break;
      case 'quad':
        next = command.to;
        startTangent = [command.control[0] - cursor[0], command.control[1] - cursor[1]];
        endTangent = [next[0] - command.control[0], next[1] - command.control[1]];
        break;
      case 'cubic':
        next = command.to;
        startTangent = [command.control1[0] - cursor[0], command.control1[1] - cursor[1]];
        endTangent = [next[0] - command.control2[0], next[1] - command.control2[1]];
        break;
      case 'arc': {
        const startAngle = command.startAngle * DEG_TO_RAD;
        const endAngle = command.endAngle * DEG_TO_RAD;
        const direction = command.counterClockwise === true ? -1 : 1;
        next = [
          command.center[0] + command.radius * Math.cos(endAngle),
          command.center[1] + command.radius * Math.sin(endAngle),
        ];
        startTangent = [-Math.sin(startAngle) * direction, Math.cos(startAngle) * direction];
        endTangent = [-Math.sin(endAngle) * direction, Math.cos(endAngle) * direction];
        break;
      }
      case 'ellipseArc': {
        const theta = (command.rotation ?? 0) * DEG_TO_RAD;
        const cos = Math.cos(theta);
        const sin = Math.sin(theta);

        /** 在椭圆局部角度处采样旋转后的点和切线 */
        const sampleEllipsePoint = (degrees: number): EndpointSample => {
          const angle = degrees * DEG_TO_RAD;
          const x = command.radiusX * Math.cos(angle);
          const y = command.radiusY * Math.sin(angle);
          const tx = -command.radiusX * Math.sin(angle);
          const ty = command.radiusY * Math.cos(angle);

          return {
            point: [command.center[0] + x * cos - y * sin, command.center[1] + x * sin + y * cos],
            tangent: [tx * cos - ty * sin, tx * sin + ty * cos],
          };
        };

        const first = sampleEllipsePoint(command.startAngle);
        const last = sampleEllipsePoint(command.endAngle);
        const direction = command.counterClockwise === true ? -1 : 1;
        next = last.point;
        startTangent = [first.tangent[0] * direction, first.tangent[1] * direction];
        endTangent = [last.tangent[0] * direction, last.tangent[1] * direction];
        break;
      }
      case 'close':
        next = subpathStart;
        startTangent = [next[0] - cursor[0], next[1] - cursor[1]];
        endTangent = startTangent;
        break;
    }

    start ??= { point: cursor, tangent: [-startTangent[0], -startTangent[1]] };
    end = { point: next, tangent: endTangent };
    cursor = next;
  }

  return { start, end };
};
