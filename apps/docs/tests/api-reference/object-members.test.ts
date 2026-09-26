import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compile } from '@mdx-js/mdx';
import remarkGfm from 'remark-gfm';
import { expect, it } from 'vitest';

import { createApiReferenceMdx } from '../../scripts/api-reference/tex';

it('自动展开一层对象，保留映射修饰符、继承说明与索引，复杂非对象保持原签名', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'retikz-object-reference-'));
  try {
    const entry = join(directory, 'index.ts');
    const tsconfigPath = join(directory, 'tsconfig.json');
    writeFileSync(
      tsconfigPath,
      JSON.stringify({ compilerOptions: { strict: true, target: 'ESNext' }, files: ['./index.ts'] }),
      'utf8',
    );
    writeFileSync(
      entry,
      `
interface Nested { inside: string }
interface Base {
  /** Stable identity */
  readonly id: string;
  /** Retry budget
   * @default 3
   */
  retries?: number;
  nested: Nested;
}
export type Selected = Pick<Base, 'id' | 'retries'>;
export type Omitted = Omit<Base, 'id'>;
export type Optional = Partial<Base>;
export type Mandatory = Required<Base>;
export type Frozen = Readonly<Base>;
export type InlineFrozen = Readonly<{ width?: number; route: Array<string> }>;
type FactoryInput = { value: string };
interface Factory { (value: string): string; (value: number): number; <T = FactoryInput>(value: T): T }
const implementation = (value: string | number) => value;
export const factory = implementation as Factory;
interface GenericCallable<T> { (input: T): string }
export const instantiatedFactory = implementation as GenericCallable<string>;
export type Mutable = { -readonly [K in keyof Base]: Base[K] };
export interface Inherited extends Base { extra: boolean }
export type Combined = Base & { extra: boolean };
export type Dictionary = Readonly<Record<string, Nested>>;
export type Keys = Record<'one' | 'two', Nested>;
export type Callback = (value: Base) => void;
export type Items = ReadonlyArray<Base>;
export type Pair = [Base, Base];
export type Either = Base | { alternative: string };
export type Generic<T> = Pick<T, keyof T>;
export type Conditional<T> = T extends string ? Base : Nested;
export type CallbackObject = Callback & { label: string };
export type Empty = Record<never, string>;
export type Instantiated = Box<boolean>;
interface Box<T> { value: T }
export type SchemaOwned = Base;
export interface Cell { readonly id?: string; layout?: { width: number }; content: string }
type CellWithLayout<T> = Omit<Cell, 'layout'> & { layout?: T };
type Marker<T> = Omit<CellWithLayout<T>, 'content'> &
  ({ text: string; children?: never } | { text?: never; children: Nested });
export type MarkerProps = Marker<Cell['layout']>;
/** Render a marker
 * @param input Marker configuration
 * @remarks Requires a parent container
 */
export declare function marker(input: MarkerProps): void;
export type PlainMarkerProps = Marker<Cell['layout']>;
export declare function plainMarker(input: PlainMarkerProps): void;
export type GenericMarker<T> = Marker<T>;
type IndexedMarker = { [key: string]: unknown } & ({ text: string } | { children: Nested });
export type IndexedProps = IndexedMarker;
`,
      'utf8',
    );
    const source = await createApiReferenceMdx(
      {
        packageName: 'object-reference-fixture',
        packageDirectory: directory,
        tsconfigPath,
        entries: [
          {
            source: entry,
            title: { zh: 'Objects', en: 'Objects' },
            symbolPairs: [
              ['marker', 'MarkerProps'],
              ['plainMarker', 'PlainMarkerProps'],
            ],
          },
        ],
        translate: text => text,
        schemaReferences: { SchemaOwned: '/schema-owned' },
      },
      'en',
    );
    const section = (name: string): string => source.split(`### ${name}\n`)[1]?.split('\n### ')[0] ?? '';
    expect(section('Selected')).toContain('| `readonly id` | `string` | — | Stable identity |');
    expect(section('Selected')).toContain('| `retries?` | `number` | `3` | Retry budget |');
    expect(section('Selected')).toContain("export type Selected = Pick<Base, 'id' | 'retries'>;");
    expect(section('Omitted')).not.toContain('| `readonly id`');
    expect(section('Optional')).toContain('| `readonly id?`');
    expect(section('Mandatory')).toContain('| `retries` | `number`');
    expect(section('Mandatory')).not.toContain('| `retries?`');
    expect(section('InlineFrozen')).toContain('| `readonly width?` | `number`');
    expect(section('InlineFrozen')).toContain('| `readonly route` | `Array<string>`');
    expect(section('factory')).toContain('(value: string): string');
    expect(section('factory')).toContain('(value: number): number');
    expect(section('factory')).not.toContain('implementation');
    expect(section('instantiatedFactory')).toContain(
      'export declare const instantiatedFactory: GenericCallable<string>;',
    );
    expect(section('factory')).toContain('<T = FactoryInput>(value: T): T');
    expect(section('Frozen')).toContain('| `readonly retries?`');
    expect(section('Mutable')).toContain('| `id`');
    expect(section('Mutable')).not.toContain('| `readonly id`');
    const marker = section('marker / MarkerProps');
    expect(source).not.toMatch(/^### (marker|MarkerProps)$/m);
    const definition = marker.match(/```ts\n([\s\S]*?)\n```/)?.[1];
    expect(definition).toContain('export declare function marker(input: MarkerProps): void;');
    expect(definition).toContain("export type MarkerProps = Marker<Cell['layout']>;");
    expect(marker).toContain('Render a marker');
    expect(marker).toContain('Marker configuration');
    expect(marker).toContain('#### Parameters');
    expect(section('plainMarker / PlainMarkerProps')).not.toContain('#### Parameters');
    expect(section('plainMarker / PlainMarkerProps')).toContain('plainMarker(input: PlainMarkerProps)');
    expect(marker).toContain('Requires a parent container');
    expect(marker).toContain("export type MarkerProps = Marker<Cell['layout']>;");
    const expandedMarker = marker.split('#### Expanded type')[1];
    expect(expandedMarker).toContain('readonly id?: string;');
    expect(expandedMarker).toContain("layout?: Cell['layout'];");
    expect(expandedMarker).toMatch(/text: string;\s+children\?: never;/);
    expect(expandedMarker).toMatch(/text\?: never;\s+children: Nested;/);
    expect(expandedMarker).not.toContain('Omit<');
    expect(section('GenericMarker')).not.toContain('#### Expanded type');
    expect(section('IndexedProps')).not.toContain('#### Expanded type');
    for (const name of ['Omitted', 'Inherited', 'Combined']) {
      expect(section(name)).toContain('| `nested` | `Nested`');
      expect(section(name)).not.toContain('| `inside`');
      expect(section(name)).toContain('<DocTabs defaultValue="members">');
      expect(section(name)).toContain('<DocTab value="members" label="Members">');
      expect(section(name)).toMatch(
        /\| Member \|[\s\S]*<DocTab value="definition" label="Type definition">[\s\S]*```ts/,
      );
      expect(section(name)).not.toContain('<details>');
    }
    expect(section('Inherited')).toContain('Stable identity');
    expect(section('Combined')).toContain('| `extra` | `boolean`');
    expect(section('Dictionary')).toContain('readonly [key: string]: Nested');
    expect(section('Dictionary')).toContain('#### Index signatures');
    expect(section('Keys')).toContain('| `one` | `Nested`');
    expect(section('Keys')).toContain('| `two` | `Nested`');
    for (const name of ['Callback', 'CallbackObject', 'Items', 'Pair', 'Either', 'Generic', 'Conditional']) {
      expect(section(name)).not.toContain('| Member |');
      expect(section(name)).not.toContain('<details>');
      expect(section(name)).toContain('```ts');
    }
    expect(section('Generic')).toContain('Pick<T, keyof T>');
    expect(section('Conditional')).toContain('T extends string ? Base : Nested');
    expect(section('Instantiated')).toContain('| `value` | `boolean`');
    expect(section('Empty')).not.toContain('| Member |');
    expect(section('SchemaOwned')).toContain('[Schema reference](/schema-owned)');
    expect(section('SchemaOwned')).not.toContain('| Member |');
    await expect(compile(source, { remarkPlugins: [remarkGfm] })).resolves.toBeDefined();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
