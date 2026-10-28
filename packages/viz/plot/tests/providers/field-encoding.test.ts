import { describe, expect, it } from 'vitest';

import { channelField, channelScale, markChannelEncoding, markProperty } from '../../src/contract';
import { positionValue } from '../../src/contract';
import { MARK_REGISTRY } from '../../src/providers';
import { channelValue, createFieldCollector, labelOf } from '../../src/providers/channel';
import { isSingleMark, collectMarkFields } from '../../src/resolve/mark';

const markContext = { registry: MARK_REGISTRY };
import { PointMarkSchema } from '../../src/schemas';

describe('字段编码的消费', () => {
  it('从简写和命名比例绑定读取相同的字段路径', () => {
    const row = { metrics: { value: 7 } };
    expect(channelValue('metrics.value', row)).toBe(7);
    expect(channelValue({ field: 'metrics.value', scale: 'radius' }, row)).toBe(7);
    expect(channelField('metrics.value')).toBe('metrics.value');
    expect(channelScale('metrics.value')).toBeUndefined();
    expect(channelScale({ field: 'metrics.value', scale: 'radius' })).toBe('radius');
  });

  it('收集字段依赖关系，而不将比例名称视为数据字段', () => {
    const fields = new Set<string>();
    const collector = createFieldCollector(fields);
    collector.addChannel('value');
    collector.addChannel({ field: 'group', scale: 'palette' });
    collector.addChannel(undefined);
    collector.addChannel('value');
    expect([...fields]).toEqual(['value', 'group']);
  });

  it('使用字面量属性文本，而不将其解释为字段路径', () => {
    expect(labelOf('name', { name: 'Alice' })).toBe('name');
    expect(labelOf('name', { name: 'Alice' }, undefined, undefined, 'name')).toBe('Alice');
  });

  it('当有效编码没有值时，不会回退到固定文本', () => {
    expect(labelOf('fallback', {}, undefined, undefined, 'missing')).toBeUndefined();
    expect(labelOf('fallback', { value: null }, undefined, undefined, 'value')).toBeUndefined();
  });

  it('格式化编码值并保留显式运行时标签覆盖', () => {
    expect(labelOf(undefined, { value: 1.234 }, 'continuous', undefined, 'value', '.2f')).toBe('1.23');
    expect(labelOf('fixed', { value: 1 }, 'continuous', () => 'runtime', 'value', '.2f')).toBe('runtime');
  });

  it('将非位置字段视为注释的数据依赖项', () => {
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

  it('将省略的转换和空数据链视为相同的实例源', () => {
    const source = {
      type: 'point',
      encodings: { position: { x: { value: 1 }, y: { value: 2 } } },
      properties: { color: 'red' },
      contributeToDomain: false,
    };
    expect(isSingleMark(PointMarkSchema.parse(source), markContext)).toBe(true);
    expect(isSingleMark(PointMarkSchema.parse({ ...source, transforms: [] }), markContext)).toBe(true);
  });

  it('不将数据单元格中的对象视为注释位置指令', () => {
    expect(positionValue({ field: 'value' }, { value: 5 })).toBe(5);
    expect(positionValue({ edge: 'end' })).toBeUndefined();
    expect(positionValue({ field: 'value' }, { value: { edge: 'end' } })).toEqual({ edge: 'end' });
    expect(positionValue({ field: 'value' }, {})).toBeUndefined();
  });

  it('仅抑制有效字段编码所寻址的固定属性', () => {
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
