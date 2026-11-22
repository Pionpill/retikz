/// <reference types="vite/client" />

import { writeFileSync, mkdirSync } from 'node:fs';

import type { JsonValue } from '@retikz/foundation';
import { it, expect } from 'vitest';
import { toJSONSchema, ZodType } from 'zod';

import { inspectSchemaEvalCoverage, writeSchemaCoverageReport, isJsonObject } from '../../../../scripts/evals';
import type { SchemaCoverageReport } from '../../../../scripts/evals';
import type { SchemaEvalCase, SchemaEvalScore } from '../../../../scripts/evals';
import {
  NodeSchema,
  BoundaryLabelSchema,
  ClipFillRuleSchema,
  CompositeNodeSchema,
  CoordinateSchema,
  DrawableInstanceSchema,
  PathSchema,
  SceneSchema,
  ScopeSchema,
  StrokePathSchema,
  TexContentSchema,
} from '../src/schemas';
import { suite as boundaryLabel } from './boundary-label/suite';
import { suite as clipFillRule } from './clip-fill-rule/suite';
import { suite as composite } from './composite/suite';
import { inspectContractSlices } from './contract-slices';
import { suite as coordinate } from './coordinate/suite';
import { createEvalSuite } from './create-suite';
import { suite as drawable } from './drawable/suite';
import { inspectNodeEvalCoverage, nodeEvalCases, gradeNodeAnswer } from './node/suite';
import { suite as pathSuite } from './path/suite';
import { suite as scene } from './scene/suite';
import { suite as scope } from './scope/suite';
import { strokeAuthorSchema, suite as strokePath } from './stroke-path/suite';
import { suite as tex } from './tex/suite';

/** 只在离线索引中记录真实 Zod 对象身份；不改变发送给模型的 JSON Schema */
const ids = new Map<object, number>();
const inspect = (name: string, schema: ZodType, report: SchemaCoverageReport) => {
  const annotated: JsonValue = JSON.parse(
    JSON.stringify(
      toJSONSchema(schema, {
        io: 'input',
        reused: 'ref',
        override: ({ zodSchema, jsonSchema }) => {
          if (!ids.has(zodSchema)) ids.set(zodSchema, ids.size + 1);
          jsonSchema.$comment = String(ids.get(zodSchema));
        },
      }),
    ),
  );
  const keys = (pointer: string) => {
    const parts = pointer.split('/').slice(1);
    let current: JsonValue = annotated;
    const result: Array<string> = [];
    for (let i = 0; i <= parts.length; i++) {
      if (isJsonObject(current)) {
        const target = current.$ref;
        const ref =
          typeof target === 'string' && isJsonObject(annotated) && isJsonObject(annotated.$defs)
            ? annotated.$defs[target.split('/').at(-1)!]
            : undefined;
        const id = current.$comment ?? (isJsonObject(ref) ? ref.$comment : undefined);
        if (
          typeof id === 'string' &&
          !parts.slice(i).includes('$defs') &&
          !(i === parts.length && ['anyOf', 'oneOf'].includes(parts[i - 2]))
        ) {
          result.push(id + ':' + parts.slice(i).join('/'));
        }
      }
      if (i === parts.length) break;
      const part = parts[i];
      current = Array.isArray(current) ? current[Number(part)] : isJsonObject(current) ? current[part] : null;
    }
    return result;
  };
  return { name, report, keys };
};
const collect = <T>(name: string, schema: ZodType, suite: ReturnType<typeof createEvalSuite<T>>) =>
  inspect(name, schema, inspectSchemaEvalCoverage(suite.contract, suite.cases, suite.grade));
it('每个模型可见的契约条目有直接或同源判分证据，或明确的宿主诊断', () => {
  const strokeProvider = createEvalSuite(StrokePathSchema, strokePath.cases);
  const suites = [
    inspect('node', NodeSchema, inspectNodeEvalCoverage()),
    collect('boundary-label', BoundaryLabelSchema, boundaryLabel),
    collect('clip-fill-rule', ClipFillRuleSchema, clipFillRule),
    collect('composite', CompositeNodeSchema, composite),
    collect('coordinate', CoordinateSchema, coordinate),
    collect('drawable', DrawableInstanceSchema, drawable),
    collect('path', PathSchema, pathSuite),
    collect('scene', SceneSchema, scene),
    collect('scope', ScopeSchema, scope),
    collect('stroke-path', strokeAuthorSchema, strokePath),
    collect('StrokePathSchema', StrokePathSchema, strokeProvider),
    collect('tex', TexContentSchema, tex),
  ];
  const hostSources = <T>(
    owner: string,
    cases: Array<SchemaEvalCase<T>>,
    grade: (item: SchemaEvalCase<T>, answer: string) => SchemaEvalScore,
  ) =>
    cases
      .filter(item => !item.diagnostic)
      .map(item => {
        const raw = JSON.stringify(item.expected);
        expect(grade(item, raw).success, item.id).toBe(true);
        const checked = new Map<string, boolean>();
        const rejectsChange = (path: string) => {
          if (checked.has(path)) return checked.get(path)!;
          const parts = path.match(/[^.[\]]+/g)?.slice(1) ?? [];
          const mutated: JsonValue = JSON.parse(raw);
          let parent = mutated;
          for (const part of parts.slice(0, -1))
            parent = Array.isArray(parent) ? parent[Number(part)] : isJsonObject(parent) ? parent[part] : null;
          const last = parts.at(-1);
          if (!last || (!isJsonObject(parent) && !Array.isArray(parent))) return false;
          const value = Array.isArray(parent) ? parent[Number(last)] : parent[last];
          if (value === undefined) return false;
          const changed =
            typeof value === 'number'
              ? value + 1
              : typeof value === 'boolean'
                ? !value
                : typeof value === 'string'
                  ? value + '!'
                  : value === null
                    ? false
                    : null;
          if (Array.isArray(parent)) parent[Number(last)] = changed;
          else parent[last] = changed;
          const result = grade(item, JSON.stringify(mutated));
          const rejected = !result.fieldSelectionCorrect || !result.valuesCorrect;
          checked.set(path, rejected);
          return rejected;
        };
        return { owner, id: item.id, value: JSON.parse(raw) as JsonValue, rejectsChange };
      });
  const sources = [
    ...hostSources('node', nodeEvalCases, gradeNodeAnswer),
    ...hostSources('path', pathSuite.cases, pathSuite.grade),
    ...hostSources('scope', scope.cases, scope.grade),
    ...hostSources('scene', scene.cases, scene.grade),
    ...hostSources('drawable', drawable.cases, drawable.grade),
    ...hostSources('coordinate', coordinate.cases, coordinate.grade),
    ...hostSources('boundary-label', boundaryLabel.cases, boundaryLabel.grade),
  ];
  const modules = import.meta.glob('../src/schemas/**/*.ts', { eager: true });
  const seen = new Set(suites.map(s => s.name));
  for (const mod of Object.values(modules)) {
    for (const [name, schema] of Object.entries(mod as Record<string, unknown>)) {
      if (!(schema instanceof ZodType) || !name.endsWith('Schema') || seen.has(name)) continue;
      seen.add(name);
      const contract = toJSONSchema(schema, { io: 'input', reused: 'ref' });
      const report = inspectContractSlices(name, schema, contract, sources);
      if (report.entries.length === 0) {
        // 无属性、描述或 union 的裸枚举，也必须有完整宿主题中的选择证据
        const atoms: Record<string, [string, string, string]> = {
          PathFillRuleSchema: ['P032', '$.style.fillRule', 'nonzero'],
          PathLineCapSchema: ['P032', '$.style.lineCap', 'butt'],
          PathLineJoinSchema: ['P032', '$.style.lineJoin', 'round'],
          FontStyleSchema: ['B005', '$.font.style', 'italic'],
        };
        const witness = atoms[name];
        expect(witness, name).toBeDefined();
        const [id, path, value] = witness;
        const source = sources.find(candidate => candidate.id === id)!;
        expect(schema.safeParse(value).success).toBe(true);
        expect(source.rejectsChange(path), name).toBe(true);
        expect(source.value).toHaveProperty(path.slice(2), value);
      }
      suites.push(inspect(name, schema, report));
    }
  }
  const evidence = new Map<string, SchemaCoverageReport['entries'][number]['witnesses']>();
  const signature = (kind: string, path: string, key: string) =>
    kind + ':' + (kind === 'property' ? path.split('.').at(-1) : '') + ':' + key;
  for (const { report, keys } of suites)
    for (const entry of report.entries) {
      if (entry.status !== 'direct') continue;
      const witnesses = entry.witnesses.filter(w => w.assertionPaths.length);
      for (const key of keys(entry.pointer)) evidence.set(signature(entry.kind, entry.path, key), witnesses);
    }
  const gaps: Array<string> = [];
  const inventory: Array<{
    name: string;
    entries: number;
    direct: number;
    shared: number;
    diagnostic: number;
    gap: number;
  }> = [];
  for (const { name, report, keys } of suites) {
    for (const entry of report.entries) {
      if (entry.status !== 'gap') continue;
      if ((name === 'stroke-path' || name === 'StrokePathSchema') && entry.path === '$.kindOptions') {
        const subject = name === 'stroke-path' ? strokePath : strokeProvider;
        const item = subject.cases.find(candidate => candidate.id === 'K001')!;
        const raw = JSON.stringify({ ...item.expected, kindOptions: {} });
        const omitted = subject
          .grade(item, JSON.stringify(item.expected))
          .checks.find(check => check.path === entry.path && check.passed);
        expect(omitted).toBeDefined();
        expect(subject.grade(item, raw).schemaValid).toBe(false);
        entry.status = 'direct';
        entry.witnesses = [{ caseId: item.id, inputPath: entry.path, assertionPaths: [entry.path] }];
        continue;
      }
      for (const key of keys(entry.pointer)) {
        const source = evidence.get(signature(entry.kind, entry.path, key));
        if (source) {
          entry.status = 'shared';
          entry.witnesses = source;
          break;
        }
      }
      if (entry.status === 'gap') gaps.push(name + ' ' + entry.path + ' ' + entry.kind + ' ' + entry.pointer);
    }
    inventory.push({
      name,
      entries: report.entries.length,
      direct: report.entries.filter(e => e.status === 'direct').length,
      shared: report.entries.filter(e => e.status === 'shared').length,
      diagnostic: report.entries.filter(e => e.status === 'diagnostic').length,
      gap: report.entries.filter(e => e.status === 'gap').length,
    });
    if (!name.endsWith('Schema') || report.entries.some(e => e.status === 'gap'))
      writeSchemaCoverageReport(report, {
        name: name + '-linked',
        directory: new URL('../../../../notes/reports/', import.meta.url),
        title: name + ' 同源断言覆盖',
        description: 'shared 使用真实 Zod 对象身份、相对契约位置、字段名及原用例的赋值断言。',
      });
  }
  const directory = new URL('../../../../notes/reports/', import.meta.url);
  mkdirSync(directory, { recursive: true });
  const run = Date.now();
  const matrix = suites.map(({ name, report }) => ({
    name,
    contractSha256: report.contractSha256,
    entries: report.entries.map(entry => ({
      kind: entry.kind,
      pointer: entry.pointer,
      path: entry.path,
      status: entry.status,
      description: entry.description,
      witness: entry.witnesses.find(w => w.assertionPaths.length),
    })),
  }));
  writeFileSync(new URL('core-eval-matrix-' + run + '.json', directory), JSON.stringify(matrix), 'utf8');
  writeFileSync(new URL('core-eval-inventory-' + run + '.json', directory), JSON.stringify(inventory, null, 2), 'utf8');
  expect(gaps).toEqual([]);
});
