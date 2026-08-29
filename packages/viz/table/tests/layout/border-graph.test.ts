import { describe, expect, it } from 'vitest';

import type { ResolvedTableBorderLine, TableBorderContribution, TableBorderSource } from '../../src/contract/manifest';
import type {
  BuildTableBorderGraphInput,
  ResolvedTableBorderAtom,
  ResolvedTableBorderCandidate,
  TableBorderAtom,
  TableTrackLayout,
} from '../../src/pipeline/layout';

import {
  ResolvedTableBorderLineSchema,
  TableBorderContributionSchema,
  TableBorderManifestEntrySchema,
  TableBorderPathMetaSchema,
} from '../../src/contract/manifest';
import { buildTableBorderGraph, mergeTableBorderAtoms, resolveTableBorderAtoms } from '../../src/pipeline/layout';

const line = (override: Partial<ResolvedTableBorderLine> = {}): ResolvedTableBorderLine => ({
  color: '#111827',
  stroke: '#111827',
  width: 1,
  strokeOpacity: 1,
  dashOffset: 0,
  lineCap: 'butt',
  lineJoin: 'miter',
  ...override,
});

const lineCandidate = (
  override: Partial<ResolvedTableBorderLine> = {},
  priority = 0,
): ResolvedTableBorderCandidate => ({ kind: 'line', priority, line: line(override) });

const outerCandidates = (candidate: ResolvedTableBorderCandidate) => ({
  top: candidate,
  right: candidate,
  bottom: candidate,
  left: candidate,
});

const track = (id: string, index: number, offset: number, size: number): TableTrackLayout => ({
  id,
  index,
  offset,
  size,
});

const sourceOrderKeyOf = (source: TableBorderSource): string => {
  if (source.kind === 'cell') return `cell:${source.row}:${source.column}:${source.side}`;
  if (source.scope === 'outer') return `default:outer:${source.side}`;
  return `default:${source.scope}:${source.boundaryIndex}`;
};

const contribution = (
  atomKey: string,
  source: TableBorderSource,
  options: Readonly<{
    kind?: 'line' | 'none';
    priority?: number;
    specificity?: 0 | 1;
    ownerSideRank?: number;
    borderLine?: ResolvedTableBorderLine;
  }> = {},
): TableBorderContribution => {
  const sourceOrderKey = sourceOrderKeyOf(source);
  const base = {
    key: `${sourceOrderKey}@${atomKey}`,
    source,
    priority: options.priority ?? 0,
    specificity: options.specificity ?? (source.kind === 'cell' ? 1 : 0),
    ownerSideRank: options.ownerSideRank ?? 0,
    sourceOrderKey,
  };
  return options.kind === 'none'
    ? { kind: 'none', origin: 'explicit', ...base }
    : { kind: 'line', origin: 'explicit', ...base, line: options.borderLine ?? line() };
};

const rows = [track('r0', 0, 0, 10), track('r1', 1, 14, 20)];
const columns = [track('c0', 0, 0, 20), track('c1', 1, 26, 30)];

const fullGridInput = (): BuildTableBorderGraphInput => ({
  rows,
  columns,
  cells: [
    { cellId: 'a', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1 },
    { cellId: 'b', rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 1 },
    { cellId: 'c', rowIndex: 1, columnIndex: 0, rowSpan: 1, columnSpan: 1 },
    { cellId: 'd', rowIndex: 1, columnIndex: 1, rowSpan: 1, columnSpan: 1 },
  ],
  mode: 'collapse',
  defaults: { outer: outerCandidates(lineCandidate()), horizontal: lineCandidate(), vertical: lineCandidate() },
});

describe('Table Border Graph', () => {
  it('parses detached strict JSON output vocabulary for manifest and Path metadata', () => {
    expect(ResolvedTableBorderLineSchema.parse({ ...line(), color: '#336699', stroke: 0.8 })).toMatchObject({
      color: '#336699',
      stroke: 0.8,
    });
    const resolvedLine = ResolvedTableBorderLineSchema.parse(line());
    const atomKey = 'c:h:0:0';
    const winner = contribution(atomKey, { kind: 'default', scope: 'outer', side: 'top' });

    expect(TableBorderContributionSchema.parse(winner)).toEqual(winner);
    expect(
      TableBorderManifestEntrySchema.parse({
        edgeKey: `m:horizontal:${atomKey}:${atomKey}`,
        orientation: 'horizontal',
        start: { x: 0, y: 0 },
        end: { x: 20, y: 0 },
        style: resolvedLine,
        atoms: [{ key: atomKey, winner, contributors: [winner] }],
        pathId: 'table/border/top',
      }),
    ).toMatchObject({ orientation: 'horizontal', style: resolvedLine });
    expect(
      TableBorderPathMetaSchema.parse({
        kind: 'tableBorder',
        tableId: 'table',
        edgeKey: 'edge',
        atomicKeys: [atomKey],
      }),
    ).toEqual({ kind: 'tableBorder', tableId: 'table', edgeKey: 'edge', atomicKeys: [atomKey] });
    expect(() => ResolvedTableBorderLineSchema.parse({ ...line(), extra: true })).toThrow();
    const hidden = contribution(atomKey, { kind: 'default', scope: 'outer', side: 'top' }, { kind: 'none' });
    expect(() => TableBorderContributionSchema.parse({ ...hidden, line: line() })).toThrow();
    expect(() =>
      TableBorderContributionSchema.parse({
        kind: 'line',
        origin: 'explicit',
        key: 'x',
        source: { kind: 'default', scope: 'outer', side: 'top' },
        priority: 0,
        specificity: 0,
        ownerSideRank: 0,
        sourceOrderKey: 'default:outer:top',
      }),
    ).toThrow();
  });

  it('builds collapse atoms on outer edges and positive-gap midpoints', () => {
    const graph = buildTableBorderGraph(fullGridInput());

    expect(graph.atoms).toHaveLength(12);
    expect(graph.atoms.find(atom => atom.key === 'c:v:1:0')).toMatchObject({
      orientation: 'vertical',
      start: { x: 23, y: 0 },
      end: { x: 23, y: 12 },
    });
    expect(graph.atoms.find(atom => atom.key === 'c:h:1:1')).toMatchObject({
      orientation: 'horizontal',
      start: { x: 23, y: 12 },
      end: { x: 56, y: 12 },
    });
    expect(graph.atoms.find(atom => atom.key === 'c:h:0:0')).toMatchObject({
      start: { x: 0, y: 0 },
      end: { x: 23, y: 0 },
    });
  });

  it('suppresses boundaries inside spanning Cells while retaining their outer sides', () => {
    const graph = buildTableBorderGraph({
      rows: [rows[0]],
      columns,
      cells: [{ cellId: 'span', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 2 }],
      mode: 'collapse',
      defaults: { outer: outerCandidates(lineCandidate()), vertical: lineCandidate() },
    });

    expect(graph.atoms.map(atom => atom.key)).not.toContain('c:v:1:0');
    expect(graph.atoms.map(atom => atom.key)).toEqual(
      expect.arrayContaining(['c:h:0:0', 'c:h:0:1', 'c:h:1:0', 'c:h:1:1', 'c:v:0:0', 'c:v:2:0']),
    );
  });

  it('keeps default grid through Cell/void and void/void without synthetic Cells', () => {
    const graph = buildTableBorderGraph({
      rows: [rows[0]],
      columns: [...columns, track('c2', 2, 60, 10)],
      cells: [{ cellId: 'only', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1 }],
      mode: 'collapse',
      defaults: { vertical: lineCandidate() },
    });

    expect(graph.atoms.map(atom => atom.key)).toEqual(['c:v:1:0', 'c:v:2:0']);
    expect(graph.atoms.every(atom => atom.contributors.every(item => item.source.kind === 'default'))).toBe(true);
  });

  it('returns an empty graph when either Table dimension is zero', () => {
    expect(
      buildTableBorderGraph({
        rows: [],
        columns,
        cells: [],
        mode: 'collapse',
        defaults: { outer: outerCandidates(lineCandidate()) },
      }),
    ).toEqual({ atoms: [], edges: [] });
    expect(
      buildTableBorderGraph({
        rows,
        columns: [],
        cells: [],
        mode: 'collapse',
        defaults: { outer: outerCandidates(lineCandidate()) },
      }),
    ).toEqual({ atoms: [], edges: [] });
  });

  it('resolves the full priority, specificity, none, width, owner-side, and source-key tuple', () => {
    const atomKey = 'c:v:1:0';
    const defaultSource = { kind: 'default', scope: 'vertical', boundaryIndex: 1 } as const;
    const leftSource = { kind: 'cell', cellId: 'renamable-left', row: 0, column: 0, side: 'right' } as const;
    const rightSource = { kind: 'cell', cellId: 'renamable-right', row: 0, column: 1, side: 'left' } as const;
    const atom = (contributors: ReadonlyArray<TableBorderContribution>): TableBorderAtom => ({
      key: atomKey,
      orientation: 'vertical',
      start: { x: 10, y: 0 },
      end: { x: 10, y: 10 },
      contributors,
    });

    expect(
      resolveTableBorderAtoms([
        atom([
          contribution(atomKey, leftSource, { priority: 1, ownerSideRank: 1 }),
          contribution(atomKey, rightSource, { priority: 2 }),
        ]),
      ])[0].winner.source,
    ).toEqual(rightSource);
    expect(
      resolveTableBorderAtoms([
        atom([
          contribution(atomKey, defaultSource, { priority: 1 }),
          contribution(atomKey, leftSource, { priority: 1 }),
        ]),
      ])[0].winner.source,
    ).toEqual(leftSource);

    const horizontalKey = 'c:h:1:0';
    const upperSource = { kind: 'cell', cellId: 'upper', row: 0, column: 0, side: 'bottom' } as const;
    const lowerSource = { kind: 'cell', cellId: 'lower', row: 1, column: 0, side: 'top' } as const;
    expect(
      resolveTableBorderAtoms([
        {
          key: horizontalKey,
          orientation: 'horizontal',
          start: { x: 0, y: 10 },
          end: { x: 10, y: 10 },
          contributors: [
            contribution(horizontalKey, lowerSource, { ownerSideRank: 0 }),
            contribution(horizontalKey, upperSource, { ownerSideRank: 1 }),
          ],
        },
      ])[0].winner.source,
    ).toEqual(upperSource);
    expect(
      resolveTableBorderAtoms([
        atom([
          contribution(atomKey, leftSource, { kind: 'none' }),
          contribution(atomKey, rightSource, { borderLine: line({ width: 100 }) }),
        ]),
      ])[0].winner.kind,
    ).toBe('none');
    expect(
      resolveTableBorderAtoms([
        atom([
          contribution(atomKey, leftSource, { borderLine: line({ width: 2 }) }),
          contribution(atomKey, rightSource, { borderLine: line({ width: 3 }) }),
        ]),
      ])[0].winner,
    ).toMatchObject({ kind: 'line', line: { width: 3 } });
    expect(
      resolveTableBorderAtoms([
        atom([
          contribution(atomKey, rightSource, { ownerSideRank: 0 }),
          contribution(atomKey, leftSource, { ownerSideRank: 1 }),
        ]),
      ])[0].winner.source,
    ).toEqual(leftSource);

    const lexicalA = { kind: 'cell', cellId: 'z', row: 0, column: 0, side: 'left' } as const;
    const lexicalB = { kind: 'cell', cellId: 'a', row: 0, column: 0, side: 'top' } as const;
    expect(
      resolveTableBorderAtoms([atom([contribution(atomKey, lexicalB), contribution(atomKey, lexicalA)])])[0].winner
        .source,
    ).toEqual(lexicalA);
  });

  it('accepts the full finite integer priority range and selects the larger extreme', () => {
    const atomKey = 'c:v:1:0';
    const low = contribution(
      atomKey,
      { kind: 'cell', cellId: 'left', row: 0, column: 0, side: 'right' },
      { priority: -Number.MAX_VALUE, ownerSideRank: 1 },
    );
    const high = contribution(
      atomKey,
      { kind: 'cell', cellId: 'right', row: 0, column: 1, side: 'left' },
      { priority: Number.MAX_VALUE },
    );

    expect(TableBorderContributionSchema.parse(low).priority).toBe(-Number.MAX_VALUE);
    expect(
      resolveTableBorderAtoms([
        {
          key: atomKey,
          orientation: 'vertical',
          start: { x: 10, y: 0 },
          end: { x: 10, y: 10 },
          contributors: [low, high],
        },
      ])[0].winner.priority,
    ).toBe(Number.MAX_VALUE);
  });

  it('sorts contributors canonically and rejects duplicate or mismatched keys', () => {
    const atomKey = 'c:h:1:0';
    const top = contribution(atomKey, { kind: 'cell', cellId: 'bottom', row: 1, column: 0, side: 'top' });
    const bottom = contribution(atomKey, { kind: 'cell', cellId: 'top', row: 0, column: 0, side: 'bottom' });
    const atom: TableBorderAtom = {
      key: atomKey,
      orientation: 'horizontal',
      start: { x: 0, y: 10 },
      end: { x: 10, y: 10 },
      contributors: [top, bottom],
    };

    expect(resolveTableBorderAtoms([atom])[0].contributors.map(item => item.sourceOrderKey)).toEqual([
      'cell:0:0:bottom',
      'cell:1:0:top',
    ]);
    expect(() => resolveTableBorderAtoms([{ ...atom, contributors: [top, top] }])).toThrow(/duplicate/i);
    expect(() => resolveTableBorderAtoms([{ ...atom, contributors: [{ ...top, key: `wrong@${atomKey}` }] }])).toThrow(
      /key/i,
    );
    expect(() =>
      resolveTableBorderAtoms([
        atom,
        {
          ...atom,
          contributors: [contribution(atomKey, { kind: 'default', scope: 'horizontal', boundaryIndex: 1 })],
        },
      ]),
    ).toThrow(/duplicate.*atom/i);
  });

  it.each([
    [contribution('c:h:0:0', { kind: 'default', scope: 'outer', side: 'top' }, { kind: 'none' })],
    [contribution('c:h:0:0', { kind: 'default', scope: 'outer', side: 'top' }, { borderLine: line({ width: 0 }) })],
    [
      contribution(
        'c:h:0:0',
        { kind: 'default', scope: 'outer', side: 'top' },
        { borderLine: line({ strokeOpacity: 0 }) },
      ),
    ],
  ])('retains hidden winner provenance without emitting an edge for %#', winner => {
    const atom: TableBorderAtom = {
      key: 'c:h:0:0',
      orientation: 'horizontal',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      contributors: [winner],
    };
    const resolved = resolveTableBorderAtoms([atom]);

    expect(resolved[0]).toMatchObject({ visible: false, winner });
    expect(mergeTableBorderAtoms(resolved, 'collapse')).toEqual([]);
  });

  it('merges continuous solid CSS atoms while preserving per-atom provenance', () => {
    const firstKey = 'c:h:0:0';
    const secondKey = 'c:h:0:1';
    const first = contribution(firstKey, { kind: 'default', scope: 'outer', side: 'top' });
    const second = contribution(secondKey, { kind: 'default', scope: 'outer', side: 'top' });
    const resolved = resolveTableBorderAtoms([
      {
        key: secondKey,
        orientation: 'horizontal',
        start: { x: 10, y: 0 },
        end: { x: 20, y: 0 },
        contributors: [second],
      },
      { key: firstKey, orientation: 'horizontal', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, contributors: [first] },
    ]);
    const edges = mergeTableBorderAtoms(resolved, 'collapse');

    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      key: `m:horizontal:${firstKey}:${secondKey}`,
      start: { x: 0, y: 0 },
      end: { x: 20, y: 0 },
    });
    expect(edges[0].atoms.map(atom => atom.key)).toEqual([firstKey, secondKey]);
  });

  it('returns detached frozen edges without freezing caller-owned resolved atoms', () => {
    const atomKey = 'c:h:0:0';
    const winner = contribution(atomKey, { kind: 'default', scope: 'outer', side: 'top' });
    const atom: ResolvedTableBorderAtom = {
      key: atomKey,
      orientation: 'horizontal',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      contributors: [winner],
      winner,
      visible: true,
    };

    const edges = mergeTableBorderAtoms([atom], 'collapse');

    expect(Object.isFrozen(atom)).toBe(false);
    expect(Object.isFrozen(atom.winner)).toBe(false);
    expect(Object.isFrozen(atom.contributors)).toBe(false);
    expect(edges[0].atoms[0].winner).not.toBe(atom.winner);
    expect(edges[0].atoms[0].contributors).not.toBe(atom.contributors);
    expect(Object.isFrozen(edges[0].atoms[0].winner)).toBe(true);
  });

  it('does not merge different masters, dashed, resource-paint, or junction-separated atoms', () => {
    const firstKey = 'c:h:0:0';
    const secondKey = 'c:h:0:1';
    const horizontalAtoms = (borderLine: ResolvedTableBorderLine): ReadonlyArray<TableBorderAtom> => [
      {
        key: firstKey,
        orientation: 'horizontal',
        start: { x: 0, y: 0 },
        end: { x: 10, y: 0 },
        contributors: [contribution(firstKey, { kind: 'default', scope: 'outer', side: 'top' }, { borderLine })],
      },
      {
        key: secondKey,
        orientation: 'horizontal',
        start: { x: 10, y: 0 },
        end: { x: 20, y: 0 },
        contributors: [contribution(secondKey, { kind: 'default', scope: 'outer', side: 'top' }, { borderLine })],
      },
    ];
    const gradient = line({
      stroke: {
        kind: 'linearGradient',
        stops: [
          { offset: 0, color: '#000' },
          { offset: 1, color: '#fff' },
        ],
      },
    });
    const pattern = line({ stroke: { kind: 'pattern', shape: 'grid' } });
    const image = line({ stroke: { kind: 'image', href: 'data:image/png;base64,AAAA' } });

    expect(
      mergeTableBorderAtoms(resolveTableBorderAtoms(horizontalAtoms(line({ dashPattern: [2, 1] }))), 'collapse'),
    ).toHaveLength(2);
    expect(mergeTableBorderAtoms(resolveTableBorderAtoms(horizontalAtoms(gradient)), 'collapse')).toHaveLength(2);
    expect(mergeTableBorderAtoms(resolveTableBorderAtoms(horizontalAtoms(pattern)), 'collapse')).toHaveLength(2);
    expect(mergeTableBorderAtoms(resolveTableBorderAtoms(horizontalAtoms(image)), 'collapse')).toHaveLength(2);
    const differentMasters = horizontalAtoms(line()).map((atom, index) => ({
      ...atom,
      contributors: atom.contributors.map(item =>
        item.kind === 'line' ? { ...item, line: { ...item.line, color: index === 0 ? '#336699' : '#993333' } } : item,
      ),
    }));
    expect(mergeTableBorderAtoms(resolveTableBorderAtoms(differentMasters), 'collapse')).toHaveLength(2);

    const verticalKey = 'c:v:1:0';
    const withJunction = [
      ...horizontalAtoms(line()),
      {
        key: verticalKey,
        orientation: 'vertical' as const,
        start: { x: 10, y: 0 },
        end: { x: 10, y: 10 },
        contributors: [contribution(verticalKey, { kind: 'default', scope: 'vertical', boundaryIndex: 1 })],
      },
    ];
    const junctionEdges = mergeTableBorderAtoms(resolveTableBorderAtoms(withJunction), 'collapse');

    expect(junctionEdges.filter(edge => edge.orientation === 'horizontal')).toHaveLength(2);
    expect(junctionEdges.map(edge => edge.orientation)).toEqual(['horizontal', 'horizontal', 'vertical']);
  });

  it('keeps separate Cell sides independent and applies defaults only when a side is absent', () => {
    const input: BuildTableBorderGraphInput = {
      rows: [rows[0]],
      columns,
      cells: [
        {
          cellId: 'left',
          rowIndex: 0,
          columnIndex: 0,
          rowSpan: 1,
          columnSpan: 1,
          borders: { right: { kind: 'none', priority: 0 } },
        },
        { cellId: 'right', rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 1 },
      ],
      mode: 'separate',
      defaults: { vertical: lineCandidate() },
    };
    const graph = buildTableBorderGraph(input);

    expect(graph.atoms.map(atom => atom.key)).toEqual(['s:0:0:right', 's:0:1:left']);
    expect(graph.atoms.map(atom => atom.visible)).toEqual([false, true]);
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({ start: { x: 26, y: 0 }, end: { x: 26, y: 10 } });
  });

  it('never merges separate atoms even when gap zero makes their geometry overlap', () => {
    const graph = buildTableBorderGraph({
      rows: [rows[0]],
      columns: [track('c0', 0, 0, 10), track('c1', 1, 10, 10)],
      cells: [
        { cellId: 'left', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1 },
        { cellId: 'right', rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 1 },
      ],
      mode: 'separate',
      defaults: { vertical: lineCandidate() },
    });

    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[0].start).toEqual(graph.edges[1].start);
    expect(graph.edges.map(edge => edge.atoms[0].key)).toEqual(['s:0:0:right', 's:0:1:left']);
  });

  it('is deterministic, detached, and independent of Cell input order or id rename', () => {
    const base = fullGridInput();
    const input: BuildTableBorderGraphInput = {
      ...base,
      cells: base.cells.map(cell => {
        if (cell.rowIndex === 0 && cell.columnIndex === 0) {
          return { ...cell, borders: { right: lineCandidate() } };
        }
        if (cell.rowIndex === 0 && cell.columnIndex === 1) {
          return { ...cell, borders: { left: lineCandidate() } };
        }
        return cell;
      }),
    };
    const renamedAndReversed: BuildTableBorderGraphInput = {
      ...input,
      cells: [...input.cells]
        .reverse()
        .map(cell => ({ ...cell, cellId: `renamed-${cell.rowIndex}-${cell.columnIndex}` })),
    };
    const first = buildTableBorderGraph(input);
    const second = buildTableBorderGraph(renamedAndReversed);

    const withoutCellId = (graph: ReturnType<typeof buildTableBorderGraph>) => {
      const contributionWithoutCellId = (item: TableBorderContribution): TableBorderContribution => ({
        ...item,
        source: item.source.kind === 'cell' ? { ...item.source, cellId: '' } : item.source,
      });
      return {
        atoms: graph.atoms.map(atom => ({
          ...atom,
          winner: contributionWithoutCellId(atom.winner),
          contributors: atom.contributors.map(contributionWithoutCellId),
        })),
        edges: graph.edges.map(edge => ({
          ...edge,
          atoms: edge.atoms.map(atom => ({
            ...atom,
            winner: contributionWithoutCellId(atom.winner),
            contributors: atom.contributors.map(contributionWithoutCellId),
          })),
        })),
      };
    };

    expect(withoutCellId(second)).toEqual(withoutCellId(first));
    expect(first.atoms.find(atom => atom.key === 'c:v:1:0')?.winner.source).toMatchObject({
      kind: 'cell',
      row: 0,
      column: 0,
      side: 'right',
    });
    expect(input.cells[0].cellId).toBe('a');
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.atoms)).toBe(true);
    expect(Object.isFrozen(first.edges)).toBe(true);
  });

  it.each([
    [{ rows: [track('bad', 1, 0, 10)] }, /canonical|index/i],
    [
      {
        cells: [
          { cellId: 'a', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1 },
          { cellId: 'b', rowIndex: 0, columnIndex: 0, rowSpan: 1, columnSpan: 1 },
        ],
      },
      /overlap/i,
    ],
    [{ cells: [{ cellId: 'bad', rowIndex: 0, columnIndex: 1, rowSpan: 1, columnSpan: 2 }] }, /range/i],
    [
      {
        defaults: {
          outer: outerCandidates({ kind: 'line', priority: 0, line: line({ width: Number.NaN }) }),
        },
      },
      /finite|number/i,
    ],
    [
      {
        defaults: {
          outer: {
            top: {
              kind: 'line' as const,
              priority: 0,
              line: line(),
              styleToken: {
                key: 'table.border.top' as const,
                source: 'local' as const,
                path: '$default/light/table.border.top',
              },
            },
          },
        },
      },
      /priority|-100/i,
    ],
  ])('rejects invalid graph topology or geometry for %#', (override, message) => {
    expect(() => buildTableBorderGraph({ ...fullGridInput(), ...override })).toThrow(message);
  });
});
