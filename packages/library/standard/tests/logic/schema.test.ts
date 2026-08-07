import { describe, expect, expectTypeOf, it } from 'vitest';

import * as StandardPackage from '../../src';
import {
  CalloutSchema,
  ConnectorSchema,
  createCallout,
  createConnector,
  createDecision,
  createJunction,
  createLogicBlockBase,
  createStage,
  createTerminal,
  DecisionSchema,
  JunctionSchema,
  LogicBlockBaseSchema,
  LogicDiagramPointSchema,
  LogicDiagramTargetSchema,
  StageSchema,
  TerminalSchema,
} from '../../src';

const child = { type: 'node', position: [0, 0], text: 'content' } as const;

const expectRoundTrip = (schema: { parse: (value: unknown) => unknown }, value: unknown): void => {
  expect(schema.parse(JSON.parse(JSON.stringify(value)))).toEqual(value);
};

describe('logic composite schemas', () => {
  it('canonicalizes all seven discriminators and their neutral defaults', () => {
    const logicBlock = createLogicBlockBase({
      id: 'block',
      sections: [{ key: 'body', child }],
    });
    const terminal = createTerminal({ id: 'start', role: 'start' });
    const stage = createStage({ id: 'step', category: 'custom-step', content: child });
    const decision = createDecision({ id: 'check', content: child });
    const junction = createJunction({ id: 'join', role: 'custom-join' });
    const connector = createConnector({ id: 'edge', from: [0, 0], to: [40, 0] });
    const callout = createCallout({
      id: 'note',
      target: { id: 'step' },
      content: child,
      placement: { side: 'right' },
    });

    expect(
      [logicBlock, terminal, stage, decision, junction, connector, callout].map(
        value => `${value.namespace}.${value.type}`,
      ),
    ).toEqual([
      'standard.logicBlockBase',
      'standard.terminal',
      'standard.stage',
      'standard.decision',
      'standard.junction',
      'standard.connector',
      'standard.callout',
    ]);

    expect(logicBlock).toMatchObject({
      namespace: 'standard',
      type: 'logicBlockBase',
      size: { x: { kind: 'content' }, y: { kind: 'content' } },
      padding: 8,
      rowGap: 0,
      overflow: 'visible',
      appearance: {
        cornerRadius: 8,
        zIndex: 0,
        style: { fill: 'transparent', stroke: 'currentColor', strokeWidth: 1 },
      },
    });
    expect(terminal).toMatchObject({
      appearance: {
        size: { x: { kind: 'content', min: 48 }, y: { kind: 'content', min: 24 } },
        padding: { x: 12, y: 6 },
        overflow: 'visible',
        shape: 'capsule',
        boundary: 'shape',
        style: { fill: 'transparent', stroke: 'currentColor', strokeWidth: 1 },
        zIndex: 0,
      },
    });
    expect(stage).toMatchObject({
      category: 'custom-step',
      appearance: {
        size: { x: { kind: 'content' }, y: { kind: 'content' } },
        padding: 8,
        overflow: 'visible',
        shape: { type: 'rectangle', params: { cornerRadius: 8 } },
        boundary: 'shape',
      },
    });
    expect(decision).toMatchObject({
      appearance: { padding: 12, shape: 'diamond', boundary: 'shape' },
    });
    expect(junction).toMatchObject({
      role: 'custom-join',
      appearance: {
        size: { x: { kind: 'content', min: 8 }, y: { kind: 'content', min: 8 } },
        padding: 0,
        shape: 'circle',
        boundary: 'shape',
      },
    });
    expect(connector).toMatchObject({
      routing: { kind: 'straight' },
      appearance: { stroke: 'currentColor', strokeWidth: 1, roundedCorners: 0, zIndex: 0 },
    });
    expect(callout).toMatchObject({ placement: { side: 'right', gap: 8, offset: 0 } });

    expectRoundTrip(LogicBlockBaseSchema, logicBlock);
    expectRoundTrip(TerminalSchema, terminal);
    expectRoundTrip(StageSchema, stage);
    expectRoundTrip(DecisionSchema, decision);
    expectRoundTrip(JunctionSchema, junction);
    expectRoundTrip(ConnectorSchema, connector);
    expectRoundTrip(CalloutSchema, callout);
  });

  it('defaults Connector marks to an end arrow and replaces them when explicitly authored', () => {
    const connector = createConnector({ id: 'edge', from: [0, 0], to: [40, 0] });
    const noMarks = createConnector({
      id: 'edge-no-marks',
      from: [0, 0],
      to: [40, 0],
      appearance: { marks: [] },
    });
    const customMarks = createConnector({
      id: 'edge-custom-marks',
      from: [0, 0],
      to: [40, 0],
      appearance: { marks: [{ pos: 0.25, mark: { kind: 'arrow', shape: 'diamond' } }] },
    });

    expect(connector.appearance.marks).toEqual([{ pos: 1, mark: { kind: 'arrow' } }]);
    expect(noMarks.appearance.marks).toEqual([]);
    expect(customMarks.appearance.marks).toEqual([{ pos: 0.25, mark: { kind: 'arrow', shape: 'diamond' } }]);
  });

  it('keeps Callout leaders arrowless for both omitted and empty leader appearance', () => {
    const input = {
      target: { id: 'stage' },
      content: child,
      placement: { side: 'top' as const },
    };
    const defaultLeader = createCallout({ id: 'note-default-leader', ...input });
    const emptyLeader = createCallout({ id: 'note-empty-leader', ...input, leader: {} });

    expect(defaultLeader.leader).not.toBe(false);
    expect(emptyLeader.leader).not.toBe(false);
    if (defaultLeader.leader !== false) expect(defaultLeader.leader.marks).toBeUndefined();
    if (emptyLeader.leader !== false) expect(emptyLeader.leader.marks).toBeUndefined();
  });

  it('preserves explicitly authored Callout leader marks while keeping the default arrowless', () => {
    const authoredMarks = [{ pos: 1, mark: { kind: 'arrow' as const } }];
    const authoredLeader = createCallout({
      id: 'note-authored-leader',
      target: { id: 'stage' },
      content: child,
      placement: { side: 'top' },
      leader: { marks: authoredMarks },
    });

    expect(authoredLeader.leader).not.toBe(false);
    if (authoredLeader.leader !== false) expect(authoredLeader.leader.marks).toEqual(authoredMarks);
  });

  it('uses a filled Junction dot without content and a neutral outlined dot with content', () => {
    expectTypeOf(createJunction).toBeCallableWith({ id: 'typed-junction' });
    expectTypeOf(createJunction).toBeCallableWith({ id: 'typed-junction-content', content: child });
    expectTypeOf(createJunction).toBeCallableWith({
      id: 'typed-junction-content-with-appearance',
      content: child,
      appearance: { padding: 0 },
    });

    const withoutContent = createJunction({ id: 'join' });
    const withContent = createJunction({ id: 'join-content', content: child });

    expect(withoutContent.appearance.style).toEqual({ fill: 'currentColor', opacity: 1 });
    expect(withContent.appearance.style).toEqual({
      fill: 'transparent',
      stroke: 'currentColor',
      strokeWidth: 1,
      opacity: 1,
    });
  });

  it('merges partial Stage style overrides into the appearance preset', () => {
    const stage = createStage({
      id: 'partial-stage',
      content: child,
      appearance: { style: { stroke: 'red' } },
    });

    expect(stage.appearance.style).toEqual({
      fill: 'transparent',
      stroke: 'red',
      strokeWidth: 1,
      opacity: 1,
    });
  });

  it('merges partial LogicBlockBase style and divider overrides into their presets', () => {
    const logicBlock = createLogicBlockBase({
      id: 'partial-block',
      sections: [{ key: 'body', child }],
      appearance: {
        style: { fill: '#fff' },
        divider: { stroke: 'red' },
      },
    });

    expect(logicBlock.appearance.style).toEqual({
      fill: '#fff',
      stroke: 'currentColor',
      strokeWidth: 1,
      opacity: 1,
    });
    expect(logicBlock.appearance.divider).toEqual({
      stroke: 'red',
      strokeWidth: 1,
      opacity: 1,
    });
  });

  it('merges partial no-content Junction style overrides into the filled-dot preset', () => {
    const junction = createJunction({
      id: 'partial-junction',
      appearance: { style: { stroke: 'red' } },
    });

    expect(junction.appearance.style).toEqual({
      fill: 'currentColor',
      stroke: 'red',
      opacity: 1,
    });
  });

  it('exposes canonical Connector and Junction role vocabularies while preserving open roles', () => {
    const exports = StandardPackage as unknown as Record<string, unknown>;

    expect(exports.ConnectorRole).toMatchObject({
      Flow: 'flow',
      Branch: 'branch',
      Dependency: 'dependency',
      Feedback: 'feedback',
    });
    expect(exports.JunctionRole).toMatchObject({
      Fork: 'fork',
      Merge: 'merge',
      Join: 'join',
      Continuation: 'continuation',
    });

    const connector = ConnectorSchema.parse({
      namespace: 'standard',
      type: 'connector',
      id: 'edge',
      role: 'vendor-specific-edge',
      from: [0, 0],
      to: [10, 10],
    });
    const junction = JunctionSchema.parse({
      namespace: 'standard',
      type: 'junction',
      id: 'join',
      role: 'vendor-specific-join',
    });

    expect(connector.role).toBe('vendor-specific-edge');
    expect(junction.role).toBe('vendor-specific-join');
  });

  it('preserves open role and category strings without turning them into a closed registry', () => {
    const stage = StageSchema.parse({
      namespace: 'standard',
      type: 'stage',
      id: 'step',
      category: 'vendor-specific-step',
      content: child,
    });
    const junction = JunctionSchema.parse({
      namespace: 'standard',
      type: 'junction',
      id: 'join',
      role: 'vendor-specific-join',
    });
    const connector = ConnectorSchema.parse({
      namespace: 'standard',
      type: 'connector',
      id: 'edge',
      role: 'vendor-specific-edge',
      from: [0, 0],
      to: [10, 10],
    });

    expect(stage.category).toBe('vendor-specific-step');
    expect(junction.role).toBe('vendor-specific-join');
    expect(connector.role).toBe('vendor-specific-edge');
  });

  it('rejects blank identities and blank open roles at their authored fields', () => {
    const blankTerminal = TerminalSchema.safeParse({
      namespace: 'standard',
      type: 'terminal',
      id: '   ',
      role: 'start',
    });
    const blankLogicBlock = LogicBlockBaseSchema.safeParse({
      namespace: 'standard',
      type: 'logicBlockBase',
      id: '   ',
      sections: [{ key: 'body', child }],
    });
    const blankStage = StageSchema.safeParse({
      namespace: 'standard',
      type: 'stage',
      id: '   ',
      content: child,
    });
    const blankDecision = DecisionSchema.safeParse({
      namespace: 'standard',
      type: 'decision',
      id: '   ',
      content: child,
    });
    const blankJunction = JunctionSchema.safeParse({
      namespace: 'standard',
      type: 'junction',
      id: '   ',
    });
    const blankConnector = ConnectorSchema.safeParse({
      namespace: 'standard',
      type: 'connector',
      id: '   ',
      from: [0, 0],
      to: [10, 10],
    });
    const blankCallout = CalloutSchema.safeParse({
      namespace: 'standard',
      type: 'callout',
      id: '   ',
      target: { id: 'stage' },
      content: child,
      placement: { side: 'top' },
    });
    const blankStageCategory = StageSchema.safeParse({
      namespace: 'standard',
      type: 'stage',
      id: 'step',
      category: '   ',
      content: child,
    });
    const blankJunctionRole = JunctionSchema.safeParse({
      namespace: 'standard',
      type: 'junction',
      id: 'join',
      role: '   ',
    });
    const blankConnectorRole = ConnectorSchema.safeParse({
      namespace: 'standard',
      type: 'connector',
      id: 'edge',
      role: '   ',
      from: [0, 0],
      to: [10, 10],
    });

    expect(blankTerminal.success).toBe(false);
    expect(blankLogicBlock.success).toBe(false);
    expect(blankStage.success).toBe(false);
    expect(blankDecision.success).toBe(false);
    expect(blankJunction.success).toBe(false);
    expect(blankConnector.success).toBe(false);
    expect(blankCallout.success).toBe(false);
    expect(blankStageCategory.success).toBe(false);
    expect(blankJunctionRole.success).toBe(false);
    expect(blankConnectorRole.success).toBe(false);
    if (!blankTerminal.success) expect(blankTerminal.error.issues[0]?.path).toEqual(['id']);
    if (!blankLogicBlock.success) expect(blankLogicBlock.error.issues[0]?.path).toEqual(['id']);
    if (!blankStage.success) expect(blankStage.error.issues[0]?.path).toEqual(['id']);
    if (!blankDecision.success) expect(blankDecision.error.issues[0]?.path).toEqual(['id']);
    if (!blankJunction.success) expect(blankJunction.error.issues[0]?.path).toEqual(['id']);
    if (!blankConnector.success) expect(blankConnector.error.issues[0]?.path).toEqual(['id']);
    if (!blankCallout.success) expect(blankCallout.error.issues[0]?.path).toEqual(['id']);
    if (!blankStageCategory.success) expect(blankStageCategory.error.issues[0]?.path).toEqual(['category']);
    if (!blankJunctionRole.success) expect(blankJunctionRole.error.issues[0]?.path).toEqual(['role']);
    if (!blankConnectorRole.success) expect(blankConnectorRole.error.issues[0]?.path).toEqual(['role']);
  });

  it('keeps Terminal role closed while the other role fields remain open', () => {
    const invalid = TerminalSchema.safeParse({
      namespace: 'standard',
      type: 'terminal',
      id: 'terminal',
      role: 'middle',
    });

    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues[0]?.path).toEqual(['role']);
  });

  it('accepts Cartesian points, ordinary targets, and section-preserving Block targets', () => {
    const point = LogicDiagramPointSchema.parse([12, -4]);
    const ordinaryTarget = LogicDiagramTargetSchema.parse({
      id: 'stage',
      anchor: { side: 'bottom', fraction: 0.25 },
      offset: [2, -3],
    });
    const sectionTarget = LogicDiagramTargetSchema.parse({
      kind: 'logicBlock',
      id: 'block',
      section: 'input',
      anchor: 'center',
      offset: [-1, 5],
    });

    expect(point).toEqual([12, -4]);
    expect(ordinaryTarget).toEqual({
      id: 'stage',
      anchor: { side: 'bottom', fraction: 0.25 },
      offset: [2, -3],
    });
    expect(sectionTarget).toEqual({
      kind: 'logicBlock',
      id: 'block',
      section: 'input',
      anchor: 'center',
      offset: [-1, 5],
    });
    expectRoundTrip(LogicDiagramPointSchema, point);
    expectRoundTrip(LogicDiagramTargetSchema, ordinaryTarget);
    expectRoundTrip(LogicDiagramTargetSchema, sectionTarget);
  });

  it('rejects malformed targets, blank section keys, and unknown target fields', () => {
    expect(LogicDiagramTargetSchema.safeParse({ id: '' }).success).toBe(false);
    expect(LogicDiagramTargetSchema.safeParse({ kind: 'logicBlock', id: 'block', section: '   ' }).success).toBe(false);
    expect(LogicDiagramTargetSchema.safeParse({ id: 'stage', sourceIndex: 0 }).success).toBe(false);
    expect(LogicDiagramTargetSchema.safeParse({ kind: 'node', id: 'stage' }).success).toBe(false);
    expect(LogicDiagramPointSchema.safeParse({ x: 1, y: 2 }).success).toBe(false);
  });

  it('rejects non-finite and negative spacing values while retaining explicit zero', () => {
    const zero = LogicBlockBaseSchema.safeParse({
      namespace: 'standard',
      type: 'logicBlockBase',
      id: 'block',
      sections: [{ key: 'body', child }],
      padding: 0,
      rowGap: 0,
    });
    const negativePadding = LogicBlockBaseSchema.safeParse({
      namespace: 'standard',
      type: 'logicBlockBase',
      id: 'block',
      sections: [{ key: 'body', child }],
      padding: -1,
    });
    const infiniteGap = LogicBlockBaseSchema.safeParse({
      namespace: 'standard',
      type: 'logicBlockBase',
      id: 'block',
      sections: [{ key: 'body', child }],
      rowGap: Number.POSITIVE_INFINITY,
    });
    const negativeCalloutGap = CalloutSchema.safeParse({
      namespace: 'standard',
      type: 'callout',
      id: 'note',
      target: { id: 'stage' },
      content: child,
      placement: { side: 'top', gap: -1 },
    });

    expect(zero.success).toBe(true);
    if (zero.success) expect(zero.data).toMatchObject({ padding: 0, rowGap: 0 });
    expect(negativePadding.success).toBe(false);
    expect(infiniteGap.success).toBe(false);
    expect(negativeCalloutGap.success).toBe(false);
  });

  it('rejects invalid appearance fields and preserves strict Core style boundaries', () => {
    const invalidStyle = StageSchema.safeParse({
      namespace: 'standard',
      type: 'stage',
      id: 'step',
      content: child,
      appearance: { style: { strokeWidth: -1 } },
    });
    const invalidShape = DecisionSchema.safeParse({
      namespace: 'standard',
      type: 'decision',
      id: 'check',
      content: child,
      appearance: { shape: { type: 'diamond', params: { radius: Number.NaN } } },
    });
    const unknownAppearance = JunctionSchema.safeParse({
      namespace: 'standard',
      type: 'junction',
      id: 'join',
      appearance: { fill: '#fff' },
    });

    expect(invalidStyle.success).toBe(false);
    expect(invalidShape.success).toBe(false);
    expect(unknownAppearance.success).toBe(false);
  });

  it('rejects invalid Connector route variants and finite control values', () => {
    const base = {
      namespace: 'standard' as const,
      type: 'connector' as const,
      id: 'edge',
      from: [0, 0] as const,
      to: [40, 20] as const,
    };
    const emptyPolyline = ConnectorSchema.safeParse({
      ...base,
      routing: { kind: 'polyline', points: [] },
    });
    const invalidRatio = ConnectorSchema.safeParse({
      ...base,
      routing: { kind: 'orthogonal', pattern: 'hvh', ratio: 1.01 },
    });
    const nonFiniteControl = ConnectorSchema.safeParse({
      ...base,
      routing: { kind: 'quadratic', control: [Number.POSITIVE_INFINITY, 0] },
    });
    const mixedBend = ConnectorSchema.safeParse({
      ...base,
      routing: {
        kind: 'bend',
        direction: 'left',
        tangents: { outAngle: 0, inAngle: 90 },
      },
    });
    const invalidAppearance = ConnectorSchema.safeParse({
      ...base,
      appearance: { fill: '#fff' },
    });

    expect(emptyPolyline.success).toBe(false);
    expect(invalidRatio.success).toBe(false);
    expect(nonFiniteControl.success).toBe(false);
    expect(mixedBend.success).toBe(false);
    expect(invalidAppearance.success).toBe(false);
  });

  it('rejects unknown fields on every canonical composite instead of silently stripping them', () => {
    const cases = [
      {
        schema: LogicBlockBaseSchema,
        value: createLogicBlockBase({ id: 'block', sections: [{ key: 'body', child }] }),
      },
      { schema: TerminalSchema, value: createTerminal({ id: 'start', role: 'start' }) },
      { schema: StageSchema, value: createStage({ id: 'step', content: child }) },
      { schema: DecisionSchema, value: createDecision({ id: 'check', content: child }) },
      { schema: JunctionSchema, value: createJunction({ id: 'join' }) },
      { schema: ConnectorSchema, value: createConnector({ id: 'edge', from: [0, 0], to: [1, 1] }) },
      {
        schema: CalloutSchema,
        value: createCallout({ id: 'note', target: { id: 'step' }, content: child, placement: { side: 'top' } }),
      },
    ];

    cases.forEach(({ schema, value }) => {
      expect(schema.safeParse({ ...value, unknown: true }).success).toBe(false);
    });
  });
});
