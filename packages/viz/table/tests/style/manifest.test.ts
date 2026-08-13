import { describe, expect, it } from 'vitest';

import { compileTable, TableLayoutManifestSchema, TableThemeTokenKeySchema } from '../../src';

describe('Table style and encoding manifest seed', () => {
  it('publishes resolved style winners and Cell appearance lineage in canonical order', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'styled',
        tableThemeTokens: { 'cell.content.color': '#123456' },
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
      tokens: { 'cell.content.color': '#123456' },
    });
    expect(result.manifest.style.sources.map(entry => entry.key)).toEqual(TableThemeTokenKeySchema.options);
    expect(result.manifest.style.sources.find(entry => entry.key === 'cell.content.color')?.source).toBe('local');
    expect(result.manifest.encodings).toEqual([
      { id: 'value-fill', channel: 'backgroundFill', scaleName: 'ordinal-color', cellIds: ['cell.r0.c0'] },
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
  });

  it('rejects non-canonical style source order and mismatched border token provenance', () => {
    const result = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'provenance',
        tableThemeTokens: {
          'table.border.top': { kind: 'line', stroke: '#f5f5f5', width: 1.2 },
          'table.border.bottom': { kind: 'line', stroke: '#f5f5f5', width: 1.2 },
        },
        structure: { kind: 'manual', rows: [['x']] },
      },
      {},
      { theme: { mode: 'dark' }, compile: { padding: 0 } },
    );
    const repeatedSources = structuredClone(result.manifest);
    Object.assign(repeatedSources.style, {
      sources: Array.from({ length: 19 }, () => repeatedSources.style.sources[0]),
    });
    expect(() => TableLayoutManifestSchema.parse(repeatedSources)).toThrow(/canonical|source/i);

    const wrongPriority = structuredClone(result.manifest);
    const priorityWinner = wrongPriority.borders[0].atoms[0].winner;
    if (priorityWinner.kind !== 'line' || priorityWinner.origin !== 'styleToken') {
      throw new Error('expected style token line winner');
    }
    Object.assign(priorityWinner, { priority: 0 });
    expect(() => TableLayoutManifestSchema.parse(wrongPriority)).toThrow(/priority/i);

    const wrongOuterToken = structuredClone(result.manifest);
    const tokenWinner = wrongOuterToken.borders[0].atoms[0].winner;
    if (tokenWinner.kind !== 'line' || tokenWinner.origin !== 'styleToken') {
      throw new Error('expected style token line winner');
    }
    Object.assign(tokenWinner.styleToken, { key: 'table.border.vertical' });
    expect(() => TableLayoutManifestSchema.parse(wrongOuterToken)).toThrow(/token|source/i);

    const gridResult = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'grid-provenance',
        tableThemeTokens: { 'table.border.horizontal': { kind: 'line', stroke: '#ffffff', width: 1 } },
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
    if (gridWinner?.kind !== 'line' || gridWinner.origin !== 'styleToken') {
      throw new Error('expected horizontal style token winner');
    }
    Object.assign(gridWinner.styleToken, { key: 'table.border.vertical' });
    expect(() => TableLayoutManifestSchema.parse(wrongGridToken)).toThrow(/token|source/i);

    const headerResult = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'header-provenance',
        tableThemeTokens: { 'columnHeader.border.bottom': { kind: 'line', stroke: '#ffffff', width: 1 } },
        data: { reference: 'rows' },
        structure: { kind: 'detail', columns: [{ id: 'value', field: 'value' }] },
      },
      { rows: [{ value: 1 }] },
      { theme: { mode: 'light' }, compile: { padding: 0 } },
    );
    const wrongHeaderCell = structuredClone(headerResult.manifest);
    const headerWinner = wrongHeaderCell.borders
      .flatMap(border => border.atoms)
      .map(atom => atom.winner)
      .find(
        winner =>
          winner.kind === 'line' &&
          winner.origin === 'styleToken' &&
          winner.styleToken.key === 'columnHeader.border.bottom',
      );
    const body = wrongHeaderCell.cells.find(cell => cell.location === 'body');
    if (headerWinner?.kind !== 'line' || headerWinner.source.kind !== 'cell' || body === undefined) {
      throw new Error('expected header style token winner and body Cell');
    }
    Object.assign(headerWinner.source, {
      cellId: body.cellId,
      row: body.rowIndex,
      column: body.columnIndex,
    });
    expect(() => TableLayoutManifestSchema.parse(wrongHeaderCell)).toThrow(/token|location|source/i);

    const missingProvenance = structuredClone(result.manifest);
    const missingTokenWinner = missingProvenance.borders[0].atoms[0].winner;
    if (missingTokenWinner.kind !== 'line' || missingTokenWinner.origin !== 'styleToken') {
      throw new Error('expected style token line winner');
    }
    Reflect.deleteProperty(missingTokenWinner, 'styleToken');
    expect(() => TableLayoutManifestSchema.parse(missingProvenance)).toThrow(/origin|provenance|styleToken/i);

    const fakeProvenance = compileTable(
      {
        namespace: 'table',
        type: 'table',
        id: 'fake-provenance',
        structure: { kind: 'manual', rows: [['x']] },
        layout: { borders: { outer: { kind: 'line', stroke: 'red', width: 2, priority: -100 } } },
      },
      {},
      { compile: { padding: 0 } },
    );
    const fakeManifest = structuredClone(fakeProvenance.manifest);
    const fakeWinner = fakeManifest.borders[0].atoms[0].winner;
    if (fakeWinner.kind !== 'line') throw new Error('expected explicit line winner');
    Object.assign(fakeWinner, { styleToken: { key: 'table.border.top', source: 'local' } });
    expect(() => TableLayoutManifestSchema.parse(fakeManifest)).toThrow(/origin|line|styleToken/i);

    const wrongTokenSource = structuredClone(result.manifest);
    const sourceWinner = wrongTokenSource.borders[0].atoms[0].winner;
    if (sourceWinner.kind !== 'line' || sourceWinner.origin !== 'styleToken') {
      throw new Error('expected style token line winner');
    }
    Object.assign(sourceWinner.styleToken, { source: 'inherit' });
    expect(() => TableLayoutManifestSchema.parse(wrongTokenSource)).toThrow(/source/i);

    const wrongInheritedPath = structuredClone(result.manifest);
    const categoricalSource = wrongInheritedPath.style.sources.find(entry => entry.key === 'data.categorical');
    if (categoricalSource === undefined) throw new Error('expected categorical source');
    Object.assign(categoricalSource, { path: '$spec/tableThemeTokens/data.categorical' });
    expect(() => TableLayoutManifestSchema.parse(wrongInheritedPath)).toThrow(/source|path/i);

    const wrongLocalPath = structuredClone(result.manifest);
    const contentSource = wrongLocalPath.style.sources.find(entry => entry.key === 'cell.content.color');
    if (contentSource === undefined) throw new Error('expected content source');
    Object.assign(contentSource, { path: '$spec/tableThemeTokens/cell.background.fill' });
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
    Object.assign(missingEncodingCell.encodings[0], { cellIds: [] });
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
    const firstCellId = duplicateEncodingCell.encodings[0].cellIds[0];
    Object.assign(duplicateEncodingCell.encodings[0], {
      cellIds: [firstCellId, firstCellId, ...duplicateEncodingCell.encodings[0].cellIds.slice(1)],
    });
    expect(() => TableLayoutManifestSchema.parse(duplicateEncodingCell)).toThrow(/canonical cell encoding lineage/i);

    const unknownEncodingCell = structuredClone(result.manifest);
    Object.assign(unknownEncodingCell.encodings[0], {
      cellIds: [...unknownEncodingCell.encodings[0].cellIds, 'forged'],
    });
    expect(() => TableLayoutManifestSchema.parse(unknownEncodingCell)).toThrow(/canonical cell encoding lineage/i);

    const reversedEncodingCells = structuredClone(result.manifest);
    Object.assign(reversedEncodingCells.encodings[0], {
      cellIds: [...reversedEncodingCells.encodings[0].cellIds].reverse(),
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
    expect(() => TableLayoutManifestSchema.parse(missingTableId)).toThrow(/tableId|table id/i);
  });
});
