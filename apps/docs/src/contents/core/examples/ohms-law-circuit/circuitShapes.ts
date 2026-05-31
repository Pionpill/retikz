import {
  type PathCommand,
  type Position,
  type Rect,
  type ShapeDefinition,
  localToWorld,
  worldToLocal,
} from '@retikz/core';

export const SANS_FONT = { family: 'Arial, sans-serif' };

const anchorPoint = (rect: Rect, x: number, y: number): Position => localToWorld(rect, [x, y]);

const boxAnchor = (rect: Rect, name: string): Position | undefined => {
  const halfWidth = rect.width / 2;
  const halfHeight = rect.height / 2;
  switch (name) {
    case 'center':
      return anchorPoint(rect, 0, 0);
    case 'north':
      return anchorPoint(rect, 0, -halfHeight);
    case 'south':
      return anchorPoint(rect, 0, halfHeight);
    case 'east':
      return anchorPoint(rect, halfWidth, 0);
    case 'west':
      return anchorPoint(rect, -halfWidth, 0);
    case 'north-east':
      return anchorPoint(rect, halfWidth, -halfHeight);
    case 'north-west':
      return anchorPoint(rect, -halfWidth, -halfHeight);
    case 'south-east':
      return anchorPoint(rect, halfWidth, halfHeight);
    case 'south-west':
      return anchorPoint(rect, -halfWidth, halfHeight);
    default:
      return undefined;
  }
};

const horizontalTerminalAnchor = (rect: Rect, name: string): Position | undefined => {
  if (name === 'input') return boxAnchor(rect, 'west');
  if (name === 'output') return boxAnchor(rect, 'east');
  return boxAnchor(rect, name);
};

const verticalTerminalAnchor = (rect: Rect, name: string): Position | undefined => {
  if (name === 'positive') return boxAnchor(rect, 'north');
  if (name === 'negative') return boxAnchor(rect, 'south');
  return boxAnchor(rect, name);
};

const ellipseBoundaryPoint = (rect: Rect, toward: Position): Position => {
  const [localX, localY] = worldToLocal(rect, toward);
  const radiusX = rect.width / 2;
  const radiusY = rect.height / 2;
  const denominator = Math.hypot(localX / radiusX, localY / radiusY);
  if (denominator < 1e-9) return [rect.x, rect.y];
  return localToWorld(rect, [localX / denominator, localY / denominator]);
};

const ellipseAnchor = (rect: Rect, name: string): Position | undefined => {
  const point = horizontalTerminalAnchor(rect, name);
  return point ? ellipseBoundaryPoint(rect, point) : undefined;
};

const horizontalBoundaryPoint = (rect: Rect, toward: Position): Position => {
  const [localX] = worldToLocal(rect, toward);
  return anchorPoint(rect, localX < 0 ? -rect.width / 2 : rect.width / 2, 0);
};

const verticalBoundaryPoint = (rect: Rect, toward: Position): Position => {
  const [, localY] = worldToLocal(rect, toward);
  return anchorPoint(rect, 0, localY < 0 ? -rect.height / 2 : rect.height / 2);
};

const zigzagCommands = (
  from: Position,
  to: Position,
  turns: number,
  amplitude: number,
  round: (value: number) => number,
): Array<PathCommand> => {
  const deltaX = to[0] - from[0];
  const deltaY = to[1] - from[1];
  const length = Math.hypot(deltaX, deltaY);
  if (length < 1e-9) return [];
  const unitX = deltaX / length;
  const unitY = deltaY / length;
  const normalX = -unitY;
  const normalY = unitX;
  const stepLength = length / (turns + 1);
  const commands: Array<PathCommand> = [];

  for (let index = 1; index <= turns; index += 1) {
    const offset = index % 2 === 1 ? -amplitude : amplitude;
    commands.push({
      kind: 'line',
      to: [
        round(from[0] + unitX * stepLength * index + normalX * offset),
        round(from[1] + unitY * stepLength * index + normalY * offset),
      ],
    });
  }
  commands.push({ kind: 'line', to: [round(to[0]), round(to[1])] });
  return commands;
};

const circuitBattery: ShapeDefinition = {
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 58),
    halfHeight: Math.max(innerHalfHeight, 82),
  }),
  boundaryPoint: verticalBoundaryPoint,
  anchor: verticalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 5;
    const topY = rect.y - rect.height / 2;
    const bottomY = rect.y + rect.height / 2;
    const longHalf = rect.width * 0.42;
    const shortHalf = rect.width * 0.23;
    const sharedStyle = {
      stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
      strokeLinecap: 'round' as const,
    };

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - longHalf), round(topY)] },
        { kind: 'line', to: [round(rect.x + longHalf), round(topY)] },
      ],
      ...sharedStyle,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - shortHalf), round(bottomY)] },
        { kind: 'line', to: [round(rect.x + shortHalf), round(bottomY)] },
      ],
      ...sharedStyle,
    };
    yield {
      type: 'text',
      x: round(rect.x + longHalf + 22),
      y: round(topY + 8),
      lines: [{ text: '+' }],
      fontSize: 24,
      fontFamily: SANS_FONT.family,
      fontWeight: 'bold',
      align: 'middle',
      baseline: 'middle',
      lineHeight: 28,
      measuredWidth: 14,
      measuredHeight: 28,
      fill: stroke,
    };
    yield {
      type: 'text',
      x: round(rect.x + longHalf + 22),
      y: round(bottomY + 8),
      lines: [{ text: '-' }],
      fontSize: 26,
      fontFamily: SANS_FONT.family,
      fontWeight: 'bold',
      align: 'middle',
      baseline: 'middle',
      lineHeight: 30,
      measuredWidth: 14,
      measuredHeight: 30,
      fill: stroke,
    };
  },
};

const circuitSwitch: ShapeDefinition = {
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 46),
    halfHeight: Math.max(innerHalfHeight, 26),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: horizontalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 4;
    const left: Position = [round(rect.x - rect.width / 2), round(rect.y)];
    const right: Position = [round(rect.x + rect.width / 2), round(rect.y)];
    const leverEnd: Position = [round(rect.x + rect.width * 0.26), round(rect.y - rect.height * 0.46)];

    yield { type: 'ellipse', cx: left[0], cy: left[1], rx: 8, ry: 8, fill: 'none', stroke, strokeWidth };
    yield { type: 'ellipse', cx: right[0], cy: right[1], rx: 8, ry: 8, fill: 'none', stroke, strokeWidth };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(left[0] + 8), round(left[1] - 3)] },
        { kind: 'line', to: leverEnd },
      ],
      stroke,
      strokeWidth,
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
  },
};

const circuitMeter: ShapeDefinition = {
  circumscribe: (innerHalfWidth, innerHalfHeight) => {
    const radius = Math.max(innerHalfWidth, innerHalfHeight, 34);
    return { halfWidth: radius, halfHeight: radius };
  },
  boundaryPoint: ellipseBoundaryPoint,
  anchor: ellipseAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 3;
    const radiusX = rect.width / 2;
    const radiusY = rect.height / 2;

    yield {
      type: 'ellipse',
      cx: round(rect.x),
      cy: round(rect.y),
      rx: round(radiusX),
      ry: round(radiusY),
      fill: style.fill ?? 'none',
      fillOpacity: style.fillOpacity,
      stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - radiusX * 0.42), round(rect.y + radiusY * 0.34)] },
        { kind: 'line', to: [round(rect.x + radiusX * 0.42), round(rect.y + radiusY * 0.34)] },
      ],
      stroke,
      strokeOpacity: 0.35,
      strokeWidth: Math.max(1, strokeWidth * 0.45),
      strokeLinecap: 'round',
      opacity: style.opacity,
    };
  },
};

const circuitResistor: ShapeDefinition = {
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 76),
    halfHeight: Math.max(innerHalfHeight, 24),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: horizontalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 4;
    const left: Position = [round(rect.x - rect.width / 2), round(rect.y)];
    const start: Position = [round(rect.x - rect.width / 2 + 16), round(rect.y)];
    const end: Position = [round(rect.x + rect.width / 2 - 16), round(rect.y)];
    const right: Position = [round(rect.x + rect.width / 2), round(rect.y)];

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: left },
        { kind: 'line', to: start },
        ...zigzagCommands(start, end, 7, 17, round),
        { kind: 'line', to: right },
      ],
      stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: style.opacity,
    };
  },
};

const circuitRheostat: ShapeDefinition = {
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 150),
    halfHeight: Math.max(innerHalfHeight, 40),
  }),
  boundaryPoint: horizontalBoundaryPoint,
  anchor: horizontalTerminalAnchor,
  *emit(rect, style, round) {
    const stroke = style.stroke ?? 'currentColor';
    const left: Position = [round(rect.x - rect.width / 2), round(rect.y)];
    const start: Position = [round(rect.x - rect.width / 2 + 16), round(rect.y)];
    const end: Position = [round(rect.x + rect.width / 2 - 16), round(rect.y)];
    const right: Position = [round(rect.x + rect.width / 2), round(rect.y)];

    yield {
      type: 'rect',
      x: round(rect.x - rect.width / 2),
      y: round(rect.y - rect.height / 2),
      width: round(rect.width),
      height: round(rect.height),
      fill: style.fill ?? 'transparent',
      fillOpacity: 0.4,
      stroke,
      strokeOpacity: 0.25,
      strokeWidth: 2,
      cornerRadius: 8,
      opacity: style.opacity,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: left },
        { kind: 'line', to: start },
        ...zigzagCommands(start, end, 15, 17, round),
        { kind: 'line', to: right },
      ],
      stroke,
      strokeWidth: 5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      opacity: style.opacity,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(rect.x - 54), round(rect.y - 34)] },
        { kind: 'line', to: [round(rect.x + 54), round(rect.y + 34)] },
      ],
      stroke,
      strokeOpacity: 0.55,
      strokeWidth: 3,
      strokeLinecap: 'round',
    };
  },
};

export const circuitShapes = {
  'circuit-battery': circuitBattery,
  'circuit-switch': circuitSwitch,
  'circuit-meter': circuitMeter,
  'circuit-resistor': circuitResistor,
  'circuit-rheostat': circuitRheostat,
};
