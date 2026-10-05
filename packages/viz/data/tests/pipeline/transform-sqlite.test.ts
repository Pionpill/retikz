import { DatabaseSync } from 'node:sqlite';

import { expect, it } from 'vitest';

import type { DataTransformImplementationProvider, DataTransformModel, ExternalRow } from '../../src';
import {
  applyTransforms,
  createDataTransformExecutor,
  executeDataTransforms,
  resolveDataTransforms,
  resolveTransformRegistry,
} from '../../src';

it('hands SQLite aggregation results through builtin sorting into a second SQLite aggregation', async () => {
  const database = new DatabaseSync(':memory:');
  const rows = [
    { group: 'B', value: 3 },
    { group: 'A', value: 2 },
    { group: 'B', value: 4 },
  ];
  const model: DataTransformModel = [
    { name: 'group', type: 'categorical' },
    { name: 'value', type: 'continuous' },
  ];
  const operations = [
    {
      kind: 'summarize' as const,
      groupBy: ['group'],
      metrics: [{ kind: 'sum' as const, field: 'value', as: 'total' }],
    },
    { kind: 'sort' as const, field: 'group' },
    { kind: 'summarize' as const, metrics: [{ kind: 'sum' as const, field: 'total', as: 'grandTotal' }] },
  ];
  const executed: Array<string> = [];
  const semantic = resolveTransformRegistry().get('summarize');
  const provider: DataTransformImplementationProvider<never> = {
    resolve: (stage, context) => {
      const operation = stage.operation;
      if (
        stage.definition !== semantic ||
        operation.kind !== 'summarize' ||
        !('metrics' in operation) ||
        !Array.isArray(operation.metrics) ||
        operation.metrics.length !== 1 ||
        context.requirements.preserveProvenance ||
        context.requirements.lineage !== undefined
      )
        return {
          kind: 'unsupported',
          diagnostics: [{ code: 'SQL_SUBSET', message: 'SQLite fixture only implements one sum without provenance' }],
        };

      const metric = operation.metrics[0];
      if (
        metric.kind !== 'sum' ||
        !('field' in metric) ||
        typeof metric.field !== 'string' ||
        !('as' in metric) ||
        typeof metric.as !== 'string'
      )
        return { kind: 'unsupported', diagnostics: [{ code: 'SUM_ONLY', message: 'only sum supported' }] };

      const fields = stage.outputModel.map(field => field.name);
      const metricField = metric.field;
      const metricAlias = metric.as;
      const quote = (name: string): string => `"${name.replaceAll('"', '""')}"`;
      const groupBy = 'groupBy' in operation && Array.isArray(operation.groupBy) ? operation.groupBy : [];

      return {
        kind: 'supported',
        implementation: {
          definition: stage.definition,
          execute: input => {
            if (input.kind !== 'result') throw new Error('fixture requires materialized result');

            executed.push('sqlite');
            database.exec('DROP TABLE IF EXISTS input');
            database.exec(
              `CREATE TABLE input (${input.result.model.map(field => `${quote(field.name)} ${field.type === 'continuous' ? 'REAL' : 'TEXT'}`).join(', ')}, ordinal INTEGER)`,
            );
            const insert = database.prepare(
              `INSERT INTO input VALUES (${input.result.model.map(() => '?').join(', ')}, ?)`,
            );
            input.result.rows.forEach((row, index) =>
              insert.run(...input.result.model.map(field => String(row[field.name])), index),
            );
            const selection = [
              ...groupBy.map(quote),
              `COALESCE(SUM(${quote(metricField)}), 0) AS ${quote(metricAlias)}`,
            ];
            const sql = `SELECT ${selection.join(', ')} FROM input ${groupBy.length ? `GROUP BY ${groupBy.map(quote).join(', ')} ORDER BY MIN(ordinal)` : ''}`;
            const result: Array<ExternalRow> = database
              .prepare(sql)
              .all()
              .map(row => Object.fromEntries(fields.map(field => [field, row[field]])));

            return Promise.resolve({ rows: result, model: stage.outputModel });
          },
        },
      };
    },
  };

  try {
    const executor = createDataTransformExecutor({
      dataExecution: { mode: 'hybrid', external: 'sqlite' },
      externalProviders: [{ name: 'sqlite', provider }],
    });
    const resolution = resolveDataTransforms(
      operations.map(operation => ({ operation })),
      model,
    );
    const result = await executeDataTransforms({ kind: 'result', result: { rows, model } }, resolution, executor);

    expect(result.rows).toEqual(applyTransforms(rows, operations));
    expect(result.rows).toEqual([{ grandTotal: 9 }]);
    expect(executed).toEqual(['sqlite', 'sqlite']);
    expect(result.model).toEqual([{ name: 'grandTotal', type: 'continuous' }]);
  } finally {
    database.close();
  }
});
