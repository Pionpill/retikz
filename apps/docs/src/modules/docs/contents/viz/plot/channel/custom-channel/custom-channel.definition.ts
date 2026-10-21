import { channelField, defineNodeChannel, markChannelEncoding } from '@retikz/plot';

const clampIntensity = (value: number): number => Math.min(1, Math.max(0.3, value));

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

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const map = (value: number): number => clampIntensity(0.3 + (hi === lo ? 0.5 : (value - lo) / (hi - lo)) * 0.7);

    return {
      resolver: row => {
        const value = Number(row[field]);
        return Number.isFinite(value) ? map(value) : undefined;
      },
      descriptor: {
        channel: 'intensity',
        scaleType: 'linear',
        domain: [lo, hi],
        range: [0.3, 1],
        field,
        fieldType: ctx.model.find(definition => definition.name === field)?.type,
      },
    };
  },
  deliver: (node, value) => {
    node.style = { ...node.style, opacity: value };
  },
});
