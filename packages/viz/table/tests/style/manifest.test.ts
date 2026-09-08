import { describe, expect, it } from 'vitest';

import { compileTable, TableLayoutManifestSchema } from '../../src';

describe('Table style and encoding manifest seed', () => {
  it('publishes resolved style winners and Cell appearance lineage in canonical order', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'styled',
        tableDefaults: {
          appearanceDefaults: { body: { content: { style: { color: '#123456' } } } },
        },
        structure: { kind: 'manual', rows: [[1]] },
        encodings: [
          {
            id: 'value-fill',
            selector: { locations: ['body'] },
            channel: 'backgroundFill',
            scale: { name: 'ordinal-color', options: { domain: [1], range: ['orange'] } },
            legend: { title: 'Value' },
          },
        ],
      },
      {},
      { compile: { padding: 0 } },
    );

    expect(result.manifest.style).toMatchObject({
      themeMode: 'light',
      defaults: {
        appearanceDefaults: { body: { content: { style: { color: '#123456' } } } },
      },
      layers: [
        { kind: 'neutral', path: '$default/light' },
        {
          kind: 'source',
          path: '$spec/tableDefaults',
          defaults: { appearanceDefaults: { body: { content: { style: { color: '#123456' } } } } },
        },
      ],
    });
    expect(result.manifest.encodings).toEqual([
      { id: 'value-fill', channel: 'backgroundFill', scaleName: 'ordinal-color', cellIndices: [0] },
    ]);
    expect(result.manifest.legendDescriptors).toEqual([
      {
        encodingId: 'value-fill',
        channel: 'backgroundFill',
        scaleName: 'ordinal-color',
        title: 'Value',
        form: 'swatch',
        domain: [1],
        range: ['orange'],
      },
    ]);
    expect(result.manifest.cells[0]).toMatchObject({
      formatterName: 'identity',
      presentationName: 'text',
      encodingIds: ['value-fill'],
      matchedRuleIndices: [],
      appearance: { background: { fill: 'orange', fillOpacity: 1 } },
    });
    expect(result.manifest.cells[0].appearanceTrace).toEqual(
      [...result.manifest.cells[0].appearanceTrace].sort((left, right) => left.path.localeCompare(right.path)),
    );

    const forgedCellDefaults = structuredClone(result.manifest);
    const trace = forgedCellDefaults.cells[0].appearanceTrace.find(entry => entry.source.kind === 'defaults');
    if (trace === undefined || trace.source.kind !== 'defaults') throw new Error('expected Cell defaults trace');
    Object.assign(trace.source, { path: '$spec/tableThemeTokens/cell.content.color' });
    expect(() => TableLayoutManifestSchema.parse(forgedCellDefaults)).toThrow(/Cell defaults source|appearance leaf/i);
  });

  it('rejects non-canonical defaults layers and mismatched border defaults provenance', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'provenance',
        tableDefaults: {
          layout: {
            borders: {
              outer: {
                top: { kind: 'line', stroke: '#f5f5f5', width: 1.2 },
                bottom: { kind: 'line', stroke: '#f5f5f5', width: 1.2 },
              },
            },
          },
        },
        structure: { kind: 'manual', rows: [['x']] },
      },
      {},
      { theme: { mode: 'dark' }, compile: { padding: 0 } },
    );
    const repeatedSources = structuredClone(result.manifest);
    Object.assign(repeatedSources.style, {
      layers: Array.from({ length: 19 }, () => repeatedSources.style.layers[0]),
    });
    expect(() => TableLayoutManifestSchema.parse(repeatedSources)).toThrow(/path|source/i);

    const wrongPriority = structuredClone(result.manifest);
    const priorityWinner = wrongPriority.borders[0].atoms[0].winner;
    if (priorityWinner.kind !== 'line' || priorityWinner.origin !== 'defaults') {
      throw new Error('expected Source defaults line winner');
    }
    Object.assign(priorityWinner, { priority: 0 });
    expect(() => TableLayoutManifestSchema.parse(wrongPriority)).toThrow(/priority/i);

    const wrongOuterDefaults = structuredClone(result.manifest);
    const outerDefaultsWinner = wrongOuterDefaults.borders[0].atoms[0].winner;
    if (outerDefaultsWinner.kind !== 'line' || outerDefaultsWinner.origin !== 'defaults') {
      throw new Error('expected Source defaults line winner');
    }
    Object.assign(outerDefaultsWinner.defaults, { path: '$spec/forged-table-defaults' });
    expect(() => TableLayoutManifestSchema.parse(wrongOuterDefaults)).toThrow(/source|path/i);

    const wrongExistingOuterDefaults = structuredClone(result.manifest);
    const existingOuterDefaultsWinner = wrongExistingOuterDefaults.borders[0].atoms[0].winner;
    if (existingOuterDefaultsWinner.kind !== 'line' || existingOuterDefaultsWinner.origin !== 'defaults') {
      throw new Error('expected Source defaults line winner');
    }
    Object.assign(existingOuterDefaultsWinner.defaults, { path: '$default/dark' });
    expect(() => TableLayoutManifestSchema.parse(wrongExistingOuterDefaults)).toThrow(
      /Border defaults source|border leaf/i,
    );

    const gridResult = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'grid-provenance',
        tableDefaults: { layout: { borders: { horizontal: { kind: 'line', stroke: '#ffffff', width: 1 } } } },
        structure: { kind: 'manual', rows: [[1], [2]] },
      },
      {},
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );
    const wrongGridToken = structuredClone(gridResult.manifest);
    const gridWinner = wrongGridToken.borders
      .flatMap(border => border.atoms)
      .map(atom => atom.winner)
      .find(winner => winner.source.kind === 'default' && winner.source.scope === 'horizontal');
    if (gridWinner?.kind !== 'line' || gridWinner.origin !== 'defaults') {
      throw new Error('expected horizontal Source defaults line winner');
    }
    if (gridWinner.defaults.path !== '$spec/tableDefaults') {
      throw new Error('expected horizontal Source defaults path');
    }
    Object.assign(gridWinner.defaults, { path: '$spec/forged-table-defaults' });
    expect(() => TableLayoutManifestSchema.parse(wrongGridToken)).toThrow(/token|source/i);

    const headerResult = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'header-provenance',
        tableDefaults: {
          appearanceDefaults: {
            columnHeader: { borders: { bottom: { kind: 'line', stroke: '#ffffff', width: 1 } } },
          },
        },
        data: { reference: 'rows' },
        structure: { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      },
      { rows: [{ value: 1 }] },
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );
    const wrongHeaderDefaults = structuredClone(headerResult.manifest);
    const headerDefaultsLayer = wrongHeaderDefaults.style.layers.find(layer => layer.path === '$spec/tableDefaults');
    if (headerDefaultsLayer === undefined) throw new Error('expected header Source defaults layer');
    Object.assign(headerDefaultsLayer, { path: '$style/forged/light' });
    expect(() => TableLayoutManifestSchema.parse(wrongHeaderDefaults)).toThrow(/source|path/i);

    const missingProvenance = structuredClone(result.manifest);
    const missingTokenWinner = missingProvenance.borders[0].atoms[0].winner;
    if (missingTokenWinner.kind !== 'line' || missingTokenWinner.origin !== 'defaults') {
      throw new Error('expected Source defaults line winner');
    }
    Reflect.deleteProperty(missingTokenWinner, 'defaults');
    expect(() => TableLayoutManifestSchema.parse(missingProvenance)).toThrow(/origin|provenance|defaults/i);

    const fakeProvenance = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'fake-provenance',
        structure: { kind: 'manual', rows: [['x']] },
        layout: { borders: { outer: { top: { kind: 'line', stroke: 'red', width: 2, priority: -100 } } } },
      },
      {},
      { compile: { padding: 0 } },
    );
    const fakeManifest = structuredClone(fakeProvenance.manifest);
    const fakeWinner = fakeManifest.borders[0].atoms[0].winner;
    if (fakeWinner.kind !== 'line') throw new Error('expected explicit line winner');
    Object.assign(fakeWinner, { defaults: { path: '$spec/tableDefaults' } });
    expect(() => TableLayoutManifestSchema.parse(fakeManifest)).toThrow(/origin|line|defaults/i);

    const wrongTokenSource = structuredClone(result.manifest);
    const sourceWinner = wrongTokenSource.borders[0].atoms[0].winner;
    if (sourceWinner.kind !== 'line' || sourceWinner.origin !== 'defaults') {
      throw new Error('expected Source defaults line winner');
    }
    Object.assign(sourceWinner.defaults, { path: '$style/forged/light' });
    expect(() => TableLayoutManifestSchema.parse(wrongTokenSource)).toThrow(/source|path/i);

    const wrongInheritedPath = structuredClone(result.manifest);
    Object.assign(wrongInheritedPath.style.layers[0], { path: '$spec/tableDefaults' });
    expect(() => TableLayoutManifestSchema.parse(wrongInheritedPath)).toThrow(/neutral|cascade|path/i);

    const wrongLocalPath = structuredClone(result.manifest);
    const contentSource = wrongLocalPath.style.layers.find(entry => entry.path === '$spec/tableDefaults');
    if (contentSource === undefined) throw new Error('expected local Source defaults layer');
    Object.assign(contentSource, { path: '$spec/other-table-defaults' });
    expect(() => TableLayoutManifestSchema.parse(wrongLocalPath)).toThrow(/source|path/i);
  });

  it('rejects forged encoding, Cell, and Legend descriptor seed relationships', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'encoded-relations',
        structure: { kind: 'manual', rows: [[1], [2]] },
        encodings: [
          {
            id: 'value-fill',
            selector: { locations: ['body'] },
            channel: 'backgroundFill',
            scale: { name: 'ordinal-color', options: { domain: [1, 2], range: ['orange', 'blue'] } },
            legend: {},
          },
          {
            id: 'value-text',
            selector: { locations: ['body'] },
            channel: 'contentColor',
            scale: { name: 'ordinal-color', options: { domain: [1, 2], range: ['black', 'white'] } },
            legend: {},
          },
        ],
      },
      {},
      { compile: { padding: 0 } },
    );

    const missingEncodingCell = structuredClone(result.manifest);
    Object.assign(missingEncodingCell.encodings[0], { cellIndices: [] });
    expect(() => TableLayoutManifestSchema.parse(missingEncodingCell)).toThrow(/encoding.*cell|cell.*encoding/i);

    const unknownCellEncoding = structuredClone(result.manifest);
    Object.assign(unknownCellEncoding.cells[0], { encodingIds: ['forged'] });
    expect(() => TableLayoutManifestSchema.parse(unknownCellEncoding)).toThrow(/cell encoding id.*manifest encoding/i);

    const duplicateCellEncoding = structuredClone(result.manifest);
    Object.assign(duplicateCellEncoding.cells[0], { encodingIds: ['value-fill', 'value-fill'] });
    expect(() => TableLayoutManifestSchema.parse(duplicateCellEncoding)).toThrow(
      /cell encoding ids.*unique.*manifest encoding order/i,
    );

    const reversedCellEncodings = structuredClone(result.manifest);
    Object.assign(reversedCellEncodings.cells[0], { encodingIds: ['value-text', 'value-fill'] });
    expect(() => TableLayoutManifestSchema.parse(reversedCellEncodings)).toThrow(
      /cell encoding ids.*manifest encoding order/i,
    );

    const missingCellEncoding = structuredClone(result.manifest);
    Object.assign(missingCellEncoding.cells[0], { encodingIds: ['value-text'] });
    expect(() => TableLayoutManifestSchema.parse(missingCellEncoding)).toThrow(/canonical cell encoding lineage/i);

    const duplicateEncodingCell = structuredClone(result.manifest);
    const firstCellIndex = duplicateEncodingCell.encodings[0].cellIndices[0];
    Object.assign(duplicateEncodingCell.encodings[0], {
      cellIndices: [firstCellIndex, firstCellIndex, ...duplicateEncodingCell.encodings[0].cellIndices.slice(1)],
    });
    expect(() => TableLayoutManifestSchema.parse(duplicateEncodingCell)).toThrow(/canonical cell encoding lineage/i);

    const unknownEncodingCell = structuredClone(result.manifest);
    Object.assign(unknownEncodingCell.encodings[0], {
      cellIndices: [...unknownEncodingCell.encodings[0].cellIndices, unknownEncodingCell.cells.length],
    });
    expect(() => TableLayoutManifestSchema.parse(unknownEncodingCell)).toThrow(/canonical cell encoding lineage/i);

    const reversedEncodingCells = structuredClone(result.manifest);
    Object.assign(reversedEncodingCells.encodings[0], {
      cellIndices: [...reversedEncodingCells.encodings[0].cellIndices].reverse(),
    });
    expect(() => TableLayoutManifestSchema.parse(reversedEncodingCells)).toThrow(/canonical cell encoding lineage/i);

    const duplicateEncodingId = structuredClone(result.manifest);
    Object.assign(duplicateEncodingId.encodings[1], { id: 'value-fill' });
    expect(() => TableLayoutManifestSchema.parse(duplicateEncodingId)).toThrow(/encoding ids must be unique/i);

    const unknownDescriptorEncoding = structuredClone(result.manifest);
    Object.assign(unknownDescriptorEncoding.legendDescriptors[0], { encodingId: 'forged' });
    expect(() => TableLayoutManifestSchema.parse(unknownDescriptorEncoding)).toThrow(
      /descriptor.*encoding|encoding.*descriptor/i,
    );

    const wrongDescriptorChannel = structuredClone(result.manifest);
    Object.assign(wrongDescriptorChannel.legendDescriptors[0], { channel: 'contentColor' });
    expect(() => TableLayoutManifestSchema.parse(wrongDescriptorChannel)).toThrow(
      /descriptor channel.*manifest encoding/i,
    );

    const wrongDescriptorScale = structuredClone(result.manifest);
    Object.assign(wrongDescriptorScale.legendDescriptors[0], { scaleName: 'forged' });
    expect(() => TableLayoutManifestSchema.parse(wrongDescriptorScale)).toThrow(
      /descriptor scale name.*manifest encoding/i,
    );

    const duplicateDescriptor = structuredClone(result.manifest);
    Object.assign(duplicateDescriptor, {
      legendDescriptors: [
        ...duplicateDescriptor.legendDescriptors,
        structuredClone(duplicateDescriptor.legendDescriptors[0]),
      ],
    });
    expect(() => TableLayoutManifestSchema.parse(duplicateDescriptor)).toThrow(/at most one legend descriptor/i);

    const missingTableId = structuredClone(result.manifest);
    Reflect.deleteProperty(missingTableId, 'tableId');
    expect(TableLayoutManifestSchema.parse(missingTableId)).not.toHaveProperty('tableId');
  });
});
