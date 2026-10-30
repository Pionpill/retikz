import { channelField, defineNodeChannel, markChannelEncoding } from '@retikz/plot';

/** 自定义 intensity 通道：字段值映射到 opacity，固定透明度使用 properties.opacity */
export const intensityChannel = defineNodeChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.3, 1], clamp: true },
  legend: 'ramp',
  resolve: (ctx, mark) => {
    const binding = markChannelEncoding(mark, 'intensity');
    if (binding === undefined) return undefined;
    const field = channelField(binding);
    const values = ctx.rows.map(row => Number(row[field])).filter(Number.isFinite);
    if (values.length === 0) return undefined;

    const mapping = ctx.resolveScaleMapping(
      { type: 'linear', name: 'intensity', range: [0.3, 1], clamp: true },
      { values },
    );
    const map = (value: number): number => Number(mapping.map(value));

    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? map(value) : undefined;
      },
      descriptor: {
        channel: 'intensity',
        scaleType: 'linear',
        domain: mapping.domain,
        range: mapping.range,
        mapping,
        field,
        fieldType: ctx.model.find(definition => definition.name === field)?.type,
      },
    };
  },
  deliver: (node, value) => {
    node.style = { ...node.style, opacity: value };
  },
});
