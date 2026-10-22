import { describe, expect, it } from 'vitest';

import { channelField, channelScale, markChannelEncoding, markProperty } from '../../src/contract';
import { positionValue } from '../../src/contract';
import { resolveMarkRegistry } from '../../src/providers';
import { channelValue, createFieldCollector, labelOf } from '../../src/providers/channel';
import { isSingleMark, collectMarkFields } from '../../src/resolve/mark';

const markContext = { registry: resolveMarkRegistry() };
import { PointMarkSchema } from '../../src/schemas';

describe('field encoding consumption', () => {
  it('reads the same field path from shorthand and named-scale bindings', () => {
    const row = { metrics: { value: 7 } };
    expect(channelValue('metrics.value', row)).toBe(7);
    expect(channelValue({ field: 'metrics.value', scale: 'radius' }, row)).toBe(7);
    expect(channelField('metrics.value')).toBe('metrics.value');
    expect(channelScale('metrics.value')).toBeUndefined();
    expect(channelScale({ field: 'metrics.value', scale: 'radius' })).toBe('radius');
  });

  it('collects field dependencies without treating scale names as data fields', () => {
    const fields = new Set<string>();
    const collector = createFieldCollector(fields);
    collector.addChannel('value');
    collector.addChannel({ field: 'group', scale: 'palette' });
    collector.addChannel(undefined);
    collector.addChannel('value');
    expect([...fields]).toEqual(['value', 'group']);
  });

  it('uses literal property text without interpreting it as a field path', () => {
    expect(labelOf('name', { name: 'Alice' })).toBe('name');
    expect(labelOf('name', { name: 'Alice' }, undefined, undefined, 'name')).toBe('Alice');
  });

  it('does not fall back to fixed text when an effective encoding has no value', () => {
    expect(labelOf('fallback', {}, undefined, undefined, 'missing')).toBeUndefined();
    expect(labelOf('fallback', { value: null }, undefined, undefined, 'value')).toBeUndefined();
  });

  it('formats encoded values and preserves the explicit runtime label override', () => {
    expect(labelOf(undefined, { value: 1.234 }, 'continuous', undefined, 'value', '.2f')).toBe('1.23');
    expect(labelOf('fixed', { value: 1 }, 'continuous', () => 'runtime', 'value', '.2f')).toBe('runtime');
  });

  it('treats a non-position field as a data dependency for annotations', () => {
    const mark = PointMarkSchema.parse({
      type: 'point',
      properties: {},
      encodings: {
        color: { field: 'group', scale: 'palette' },
        opacity: { fill: 'alpha' },
        position: { x: { value: 1 }, y: { value: 2 } },
      },
      contributeToDomain: false,
    });
    expect(isSingleMark(mark, markContext)).toBe(false);
    const fields = new Set<string>();
    collectMarkFields(mark, createFieldCollector(fields), markContext);
    expect([...fields].sort()).toEqual(['alpha', 'group']);
  });

  it('treats omitted transforms and an empty data chain as the same instance source', () => {
    const source = {
      type: 'point',
      encodings: { position: { x: { value: 1 }, y: { value: 2 } } },
      properties: { color: 'red' },
      contributeToDomain: false,
    };
    expect(isSingleMark(PointMarkSchema.parse(source), markContext)).toBe(true);
    expect(isSingleMark(PointMarkSchema.parse({ ...source, transforms: [] }), markContext)).toBe(true);
  });

  it('does not treat objects in data cells as annotation position instructions', () => {
    expect(positionValue({ field: 'value' }, { value: 5 })).toBe(5);
    expect(positionValue({ edge: 'end' })).toBeUndefined();
    expect(positionValue({ field: 'value' }, { value: { edge: 'end' } })).toEqual({ edge: 'end' });
    expect(positionValue({ field: 'value' }, {})).toBeUndefined();
  });

  it('suppresses only the fixed property addressed by an effective field encoding', () => {
    const mark = PointMarkSchema.parse({
      type: 'point',
      encodings: { color: 'missing', opacity: { overall: 'alpha' }, position: { x: { value: 1 }, y: { value: 2 } } },
      properties: { color: 'red', opacity: { overall: 0.8, fill: 0.4 } },
      contributeToDomain: false,
    });
    expect(markProperty(mark, 'color')).toBeUndefined();
    expect(markProperty(mark, 'opacity')).toBeUndefined();
    expect(markProperty(mark, 'fillOpacity')).toBe(0.4);
    expect(markChannelEncoding(mark, 'opacity')).toBe('alpha');
    expect(channelValue(markChannelEncoding(mark, 'color'), {})).toBeUndefined();
  });
});
