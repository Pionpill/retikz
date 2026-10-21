import { describe, expect, it } from 'vitest';

import {
  annotationChannelsOf,
  channelField,
  channelScale,
  isIndependentAnnotation,
  markChannelEncoding,
  markProperty,
} from '../../src/contract';
import { channelValue, createFieldCollector, labelOf } from '../../src/providers/channel';
import { annotationValue } from '../../src/providers/mark/shared';
import { PointAnnotationSchema } from '../../src/schemas';

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
    const mark = PointAnnotationSchema.parse({
      type: 'point',
      kind: 'annotation',
      properties: { position: { x: 1, y: 2 } },
      encodings: { color: { field: 'group', scale: 'palette' }, opacity: { fill: 'alpha' } },
    });
    expect(isIndependentAnnotation(mark)).toBe(false);
    expect(annotationChannelsOf(mark).map(channelField)).toEqual(['alpha', 'group']);
  });

  it('preserves the distinction between omitted transforms and an empty data chain', () => {
    const source = {
      type: 'point',
      kind: 'annotation',
      properties: { position: { x: 1, y: 2 }, color: 'red' },
    };
    expect(isIndependentAnnotation(PointAnnotationSchema.parse(source))).toBe(true);
    expect(isIndependentAnnotation(PointAnnotationSchema.parse({ ...source, transforms: [] }))).toBe(false);
  });

  it('does not treat objects in data cells as annotation position instructions', () => {
    expect(annotationValue(3, 'value', { value: 5 })).toBe(5);
    expect(annotationValue({ edge: 'end' })).toBeUndefined();
    expect(() => annotationValue(3, 'value', { value: { edge: 'end' } })).toThrow(/cannot map/);
    expect(() => annotationValue(3, 'value', {})).toThrow(/cannot map/);
  });

  it('suppresses only the fixed property addressed by an effective field encoding', () => {
    const mark = PointAnnotationSchema.parse({
      type: 'point',
      kind: 'annotation',
      encodings: { color: 'missing', opacity: { overall: 'alpha' } },
      properties: { position: { x: 1, y: 2 }, color: 'red', opacity: { overall: 0.8, fill: 0.4 } },
    });
    expect(markProperty(mark, 'color')).toBeUndefined();
    expect(markProperty(mark, 'opacity')).toBeUndefined();
    expect(markProperty(mark, 'fillOpacity')).toBe(0.4);
    expect(markChannelEncoding(mark, 'opacity')).toBe('alpha');
    expect(channelValue(markChannelEncoding(mark, 'color'), {})).toBeUndefined();
  });
});
