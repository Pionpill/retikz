import type { IRAnchorRef, IRNodeTarget } from '@retikz/core';

export const target = (id: string, anchor: IRAnchorRef): IRNodeTarget => ({ id, anchor });

export const elementEndpoints = {
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

export const measurementEndpoints = (prefix: string) => {
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
