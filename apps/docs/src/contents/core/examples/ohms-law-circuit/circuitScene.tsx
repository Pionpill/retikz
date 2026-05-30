import {
  type IRAnchorRef,
  type IRNodeTarget,
  type PathCommand,
  type Position,
  type Rect,
  type ShapeDefinition,
  localToWorld,
  worldToLocal,
} from '@retikz/core';
import { Coordinate, Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC, ReactNode } from 'react';

const VIEW_BOX = { x: 0, y: 0, width: 1280, height: 760 } as const;
const INK = 'currentColor';
const SANS_FONT = { family: 'Arial, sans-serif' };
const ITALIC_FONT = { family: 'Arial, sans-serif', style: 'italic' as const };

export type CircuitStage = 1 | 2 | 3 | 4 | 5 | 6;

type CircuitDemoProps = {
  stage: CircuitStage;
  rheostatLabel?: string;
};

type CircuitLayoutProps = {
  children: ReactNode;
};

type LabelProps = {
  position: Position | { of: string; offset: Position };
  text: string;
  color?: string;
  size?: number;
  bold?: boolean;
  italic?: boolean;
};

type MeasurementCellProps = {
  prefix: string;
  transformX?: number;
  connected: boolean;
  labeled: boolean;
  resistorLabel: string;
  voltageLabel: string;
};

type FinalLabelsProps = {
  rheostatLabel: string;
};

const target = (id: string, anchor: IRAnchorRef): IRNodeTarget => ({ id, anchor });

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

const circuitShapes = {
  'circuit-battery': circuitBattery,
  'circuit-switch': circuitSwitch,
  'circuit-meter': circuitMeter,
  'circuit-resistor': circuitResistor,
  'circuit-rheostat': circuitRheostat,
};

const elementEndpoints = {
  battery: {
    positive: target('battery', 'north'),
    negative: target('battery', 'south'),
  },
  switch: {
    input: target('switch', 'west'),
    output: target('switch', 'east'),
  },
  ammeter: {
    input: target('ammeter', 'west'),
    output: target('ammeter', 'east'),
  },
  rheostat: {
    input: target('rheostat', 'west'),
    output: target('rheostat', 'east'),
  },
} as const;

const measurementEndpoints = (prefix: string) => {
  const resistorId = `${prefix}-resistor`;
  const voltmeterId = `${prefix}-voltmeter`;
  return {
    resistor: {
      input: target(resistorId, 'west'),
      output: target(resistorId, 'east'),
    },
    voltmeter: {
      input: target(voltmeterId, 'west'),
      output: target(voltmeterId, 'east'),
    },
  } as const;
};

const CircuitLayout: FC<CircuitLayoutProps> = props => {
  const { children } = props;

  return (
    <Layout width={720} height={430} viewBox={VIEW_BOX} shapes={circuitShapes}>
      <Scope
        pathDefault={{ stroke: INK, strokeWidth: 5, lineCap: 'round', lineJoin: 'round' }}
        nodeDefault={{ font: SANS_FONT, stroke: 'none', padding: 0 }}
        labelDefault={{ font: { ...SANS_FONT, size: 16 } }}
      >
        {children}
      </Scope>
    </Layout>
  );
};

const Label: FC<LabelProps> = props => {
  const { position, text, color = INK, size = 18, bold = false, italic = false } = props;

  return (
    <Node
      position={position}
      stroke="none"
      padding={0}
      textColor={color}
      font={{ ...(italic ? ITALIC_FONT : SANS_FONT), size, weight: bold ? 'bold' : 'normal' }}
    >
      {text}
    </Node>
  );
};

const Battery: FC = () => (
  <Node
    id="battery"
    position={[180, 376]}
    shape="circuit-battery"
    minimumWidth={116}
    minimumHeight={164}
    stroke={INK}
    strokeWidth={6}
    fill="none"
  />
);

const Switch: FC = () => (
  <Node
    id="switch"
    position={[320, 238]}
    shape="circuit-switch"
    minimumWidth={92}
    minimumHeight={52}
    fill="none"
    stroke={INK}
    strokeWidth={5}
  />
);

const Ammeter: FC = () => (
  <Node
    id="ammeter"
    position={[490, 238]}
    shape="circuit-meter"
    minimumSize={76}
    stroke={INK}
    strokeWidth={5}
    textColor={INK}
    font={{ ...SANS_FONT, size: 29, weight: 'bold' }}
  >
    A
  </Node>
);

const Rheostat: FC = () => (
  <Node
    id="rheostat"
    position={[650, 572]}
    shape="circuit-rheostat"
    minimumWidth={300}
    minimumHeight={80}
    fill={{ type: 'pattern', shape: 'lines', color: INK, rotation: 45, size: 12 }}
    stroke={INK}
    strokeWidth={5}
  />
);

const MeasurementCell: FC<MeasurementCellProps> = props => {
  const { prefix, transformX = 0, connected, labeled, resistorLabel, voltageLabel } = props;
  const resistorId = `${prefix}-resistor`;
  const voltmeterId = `${prefix}-voltmeter`;
  const midId = `${prefix}-resistor-mid`;
  const endpoints = measurementEndpoints(prefix);

  return (
    <Scope transforms={transformX === 0 ? undefined : [{ kind: 'translate', x: transformX, y: 0 }]}>
      <Node
        id={resistorId}
        position={[676, 238]}
        shape="circuit-resistor"
        minimumWidth={152}
        minimumHeight={48}
        stroke={INK}
        strokeWidth={5}
        fill="none"
      />
      <Node
        id={voltmeterId}
        position={[680, 338]}
        shape="circuit-meter"
        minimumSize={68}
        stroke={INK}
        strokeWidth={5}
        textColor={INK}
        font={{ ...SANS_FONT, size: 27, weight: 'bold' }}
      >
        V
      </Node>
      <Coordinate
        id={midId}
        position={{ between: [endpoints.resistor.input, endpoints.resistor.output], t: 0.5 }}
      />
      {connected && (
        <Scope pathDefault={{ stroke: INK, strokeWidth: 4, lineCap: 'round', lineJoin: 'round' }}>
          <Draw way={[endpoints.resistor.input, [600, 338], endpoints.voltmeter.input]} />
          <Draw way={[endpoints.resistor.output, [752, 338], endpoints.voltmeter.output]} />
        </Scope>
      )}
      {labeled && (
        <>
          <Label
            position={{ of: midId, offset: [0, -22] }}
            text={resistorLabel}
            size={21}
            italic
          />
          <Label
            position={{ of: voltmeterId, offset: [0, 55] }}
            text={voltageLabel}
            size={17}
            italic
          />
        </>
      )}
    </Scope>
  );
};

const MainLoopConnections: FC<{ stage: CircuitStage }> = props => {
  const { stage } = props;
  const finalResistorId = stage >= 4 ? 'cell2-resistor' : 'cell1-resistor';
  const cell1Endpoints = measurementEndpoints('cell1');

  return (
    <>
      <Draw way={[elementEndpoints.battery.positive, [180, 238], elementEndpoints.switch.input]} />
      <Draw way={[elementEndpoints.switch.output, elementEndpoints.ammeter.input]} />
      <Draw way={[elementEndpoints.ammeter.output, cell1Endpoints.resistor.input]} />
      {stage >= 4 && (
        <Draw way={[cell1Endpoints.resistor.output, target('cell2-resistor', 'west')]} />
      )}
      <Draw way={[target(finalResistorId, 'east'), [1060, 238], [1060, 572]]} />
      {stage >= 5 ? (
        <>
          <Draw way={[[1060, 572], elementEndpoints.rheostat.output]} />
          <Draw way={[elementEndpoints.rheostat.input, [180, 572], elementEndpoints.battery.negative]} />
        </>
      ) : (
        <Draw way={[[1060, 572], [180, 572], elementEndpoints.battery.negative]} />
      )}
    </>
  );
};

const FinalLabels: FC<FinalLabelsProps> = props => {
  const { rheostatLabel } = props;

  return (
    <>
      <Label position={[118, 383]} text="E" size={21} italic />
      <Label position={[320, 188]} text="S" size={20} italic />
      <Label position={[652, 635]} text={rheostatLabel} size={20} italic />
    </>
  );
};

export const CircuitDemo: FC<CircuitDemoProps> = props => {
  const { stage, rheostatLabel = 'sliding rheostat' } = props;

  return (
    <CircuitLayout>
      <Battery />
      <Switch />
      <Ammeter />
      <MeasurementCell
        prefix="cell1"
        connected={stage >= 3}
        labeled={stage >= 6}
        resistorLabel="R1"
        voltageLabel="U1"
      />
      {stage >= 4 && (
        <MeasurementCell
          prefix="cell2"
          connected
          labeled={stage >= 6}
          resistorLabel="R2"
          voltageLabel="U2"
          transformX={212}
        />
      )}
      {stage >= 5 && <Rheostat />}
      {stage >= 2 && <MainLoopConnections stage={stage} />}
      {stage >= 6 && <FinalLabels rheostatLabel={rheostatLabel} />}
    </CircuitLayout>
  );
};
