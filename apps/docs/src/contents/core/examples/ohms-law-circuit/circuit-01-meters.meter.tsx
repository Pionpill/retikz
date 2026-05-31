import { type IRNodeLabel, type Position, type ShapeDefinition, localToWorld, worldToLocal } from '@retikz/core';
import { Node } from '@retikz/react';
import type { FC } from 'react';

const INK = 'currentColor';
const FONT = { family: 'Arial, sans-serif' } as const;

/**
 * 电表形状：圆形表头 + 左右引线
 * @description 只暴露 west / east（input / output）两个连接端点——和 shape-registry 的"语义端点：二极管"一样，
 *   导线只会落到左右两个引线端点，不会接到上下；圆形表头大小沿用内置 circle 的外接算法（√(hw²+hh²)）
 */
// eslint-disable-next-line react-refresh/only-export-components -- 形状定义与电表组件同处一处，便于成组复用；本文件不是 HMR 热点
export const circuitMeter: ShapeDefinition = {
  circumscribe: (innerHalfWidth, innerHalfHeight) => {
    const radius = Math.sqrt(innerHalfWidth * innerHalfWidth + innerHalfHeight * innerHalfHeight);
    return { halfWidth: radius + 55, halfHeight: radius };
  },
  boundaryPoint: (rect, toward) => {
    const terminal: Position = worldToLocal(rect, toward)[0] < 0 ? [-rect.width / 2, 0] : [rect.width / 2, 0];
    return localToWorld(rect, terminal);
  },
  anchor: (rect, name) => {
    if (name === 'center') return [rect.x, rect.y];
    if (name === 'west' || name === 'input') return localToWorld(rect, [-rect.width / 2, 0]);
    if (name === 'east' || name === 'output') return localToWorld(rect, [rect.width / 2, 0]);
    // 圆形表头的上 / 下沿（高度 = 2×半径，引线只在水平方向）——供 label `above` / `below` 取 north / south
    if (name === 'north') return localToWorld(rect, [0, -rect.height / 2]);
    if (name === 'south') return localToWorld(rect, [0, rect.height / 2]);
    return undefined;
  },
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 2;
    const radius = rect.height / 2;
    const shared = { stroke, strokeOpacity: style.strokeOpacity, strokeWidth, opacity: style.opacity };

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - rect.width / 2), round(rect.y)] },
        { kind: 'line', to: [round(rect.x - radius), round(rect.y)] },
      ],
      ...shared,
      strokeLinecap: 'round',
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x + radius), round(rect.y)] },
        { kind: 'line', to: [round(rect.x + rect.width / 2), round(rect.y)] },
      ],
      ...shared,
      strokeLinecap: 'round',
    };
    yield {
      type: 'ellipse',
      cx: round(rect.x),
      cy: round(rect.y),
      rx: round(radius),
      ry: round(radius),
      fill: style.fill ?? 'none',
      fillOpacity: style.fillOpacity,
      ...shared,
    };
  },
};

/** 电表：圆形表头 + 单个字母（A 电流表 / V 电压表），用 circuit-meter 形状 */
export const Meter: FC<{
  id?: string;
  position: Position;
  text: string;
  size?: number;
  fontSize?: number;
  label?: IRNodeLabel | Array<IRNodeLabel>;
}> = ({ id, position, text, size = 48, fontSize = 32, label }) => (
  <Node
    id={id}
    position={position}
    label={label}
    shape="circuit-meter"
    minimumSize={size}
    stroke={INK}
    strokeWidth={3}
    fill="none"
    font={{ ...FONT, size: fontSize }}
  >
    {text}
  </Node>
);
