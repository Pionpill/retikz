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

describe('位置调整注册表', () => {
  it('对内置定义和自定义定义使用相同的注册表', () => {
    const registry = resolvePositionAdjustmentRegistry([nudge]);

    expect([...registry.keys()]).toEqual(['jitter', 'screen-nudge']);
    expect(extractPositionAdjustmentKind(NudgeSchema)).toBe('screen-nudge');
  });

  it('拒绝重复的自定义定义和内置冲突', () => {
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
