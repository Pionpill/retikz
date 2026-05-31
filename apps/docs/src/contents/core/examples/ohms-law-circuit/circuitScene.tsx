import type { FC } from 'react';

import { Draw } from '@retikz/react';

import {
  Ammeter,
  Battery,
  CircuitLayout,
  Label,
  MeasurementCell,
  Rheostat,
  Switch,
} from './circuitElements';
import {
  elementEndpoints,
  measurementEndpoints,
  target,
} from './circuitEndpoints';

export type CircuitStage = 1 | 2 | 3 | 4 | 5 | 6;

type CircuitDemoProps = {
  stage: CircuitStage;
  rheostatLabel?: string;
};

type FinalLabelsProps = {
  rheostatLabel: string;
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
