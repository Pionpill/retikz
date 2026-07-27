import { defineNodeChannel } from '@retikz/plot';

type ExtensionChannelBinding = { field?: string; value?: unknown };

const extensionChannelsOf = (mark: {
  encoding?: { channels?: Partial<Record<string, ExtensionChannelBinding>> };
}): Partial<Record<string, ExtensionChannelBinding>> => mark.encoding?.channels ?? {};

const clampIntensity = (value: number): number => Math.min(1, Math.max(0.3, value));

/** 自定义 intensity 通道：字段值自行映射到 opacity，常量值自行截断后直接交付 */
export const intensityChannel = defineNodeChannel<number>({
  channel: 'intensity',
  output: { outputKind: 'number', range: [0.3, 1], clamp: true },
  legend: 'ramp',
  resolve: ctx => mark => {
    const binding = extensionChannelsOf(mark).intensity;
    if (binding === undefined) return undefined;
    if (binding.value !== undefined) {
      if (typeof binding.value !== 'number' || !Number.isFinite(binding.value)) {
        throw new Error('lowerPlots: intensity constant must be a finite number');
      }
      const value = clampIntensity(binding.value);
      return { resolver: () => value };
    }
    if (binding.field === undefined) return undefined;

    const field = binding.field;
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
        fieldType: ctx.fieldTypes.get(field),
      },
    };
  },
  deliver: (node, value) => {
    node.opacity = value;
  },
});
