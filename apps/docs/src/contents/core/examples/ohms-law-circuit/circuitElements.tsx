import type { Position } from '@retikz/core';
import { Coordinate, Draw, Layout, Node, Scope } from '@retikz/react';
import type { FC, ReactNode } from 'react';

import { measurementEndpoints } from './circuitEndpoints';
import { SANS_FONT, circuitShapes } from './circuitShapes';

const VIEW_BOX = { x: 0, y: 0, width: 1280, height: 760 } as const;
const INK = 'currentColor';
const ITALIC_FONT = { family: 'Arial, sans-serif', style: 'italic' as const };

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

export const CircuitLayout: FC<CircuitLayoutProps> = props => {
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

export const Label: FC<LabelProps> = props => {
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

export const Battery: FC = () => (
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

export const Switch: FC = () => (
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

export const Ammeter: FC = () => (
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

export const Rheostat: FC = () => (
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

export const MeasurementCell: FC<MeasurementCellProps> = props => {
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
