import { describe, expect, it } from 'vitest';
import { literal, number, strictObject } from 'zod';

import { definePositionAdjustment, extractPositionAdjustmentKind } from '../../../src/contract';
import { resolvePositionAdjustmentRegistry } from '../../../src/providers';

const NudgeSchema = strictObject({ kind: literal('screen-nudge'), dx: number() });
type Nudge = { kind: 'screen-nudge'; dx: number };

const nudge = definePositionAdjustment<Nudge>({
  space: 'screen',
  schema: NudgeSchema,
  initialize: (operation, context) =>
    context.targets.map(target => ({
      key: target.key,
      position: target.position === null ? null : [target.position[0] + operation.dx, target.position[1]],
    })),
});

describe('Position Adjustment registry', () => {
  it('uses the same registry for built-in and custom definitions', () => {
    const registry = resolvePositionAdjustmentRegistry([nudge]);
    expect([...registry.keys()]).toEqual(['jitter', 'screen-nudge']);
    expect(extractPositionAdjustmentKind(NudgeSchema)).toBe('screen-nudge');
  });

  it('rejects duplicate custom definitions and built-in collisions', () => {
    expect(() => resolvePositionAdjustmentRegistry([nudge, nudge])).toThrow(/duplicate position adjustment/);
    expect(() =>
      resolvePositionAdjustmentRegistry([
        {
          ...nudge,
          schema: strictObject({ kind: literal('jitter'), dx: number() }),
        },
      ]),
    ).toThrow(/duplicate position adjustment/);
  });
});
