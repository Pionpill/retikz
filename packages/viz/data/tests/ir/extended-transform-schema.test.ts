import { describe, expect, it } from 'vitest';

import {
  BinTransformSchema,
  ExternalTransformSchema,
  resolveRegression,
  SortTransformSchema,
  TransformSchema,
} from '../../src';
import { BuiltinTransformSchema } from '../../src/transform';

describe('TransformSchema 排序/堆叠', () => {
  // Happy path
  it('排序 schema 有效', () => {
    const t = { kind: 'sort', params: { field: 'month' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('按有效顺序排序', () => {
    const t = { kind: 'sort', params: { field: 'month', order: 'descending' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠 schema 有效', () => {
    const t = { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠自定义输出字段有效', () => {
    const t = { kind: 'stack', params: { x: 'm', y: 'r', groupBy: 'p', startField: 'lo', endField: 'hi' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠偏移量有效', () => {
    const t = { kind: 'stack', params: { x: 'm', y: 'r', groupBy: 'p', offset: 'diverging' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  // 错误路径
  it('内置变换未知类型被拒绝', () => {
    expect(() => BuiltinTransformSchema.parse({ kind: 'filter', field: 'm' })).toThrow();
  });

  it('排序缺失字段被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: {} })).toThrow();
  });

  it('排序错误顺序被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'sort', params: { field: 'm', order: 'up' } })).toThrow();
  });

  it('堆叠丢失 y 被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'stack', params: { x: 'm', groupBy: 'p' } })).toThrow();
  });

  // stack 允许省略 x / groupBy，用于单链累积场景
  it('堆叠省略 x 且组有效', () => {
    // 单链累积：只给 y，按数据序累加（饼图用法）
    const t = { kind: 'stack', params: { y: 'value' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠省略仅组有效', () => {
    const t = { kind: 'stack', params: { x: 'month', y: 'value' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠仅省略 x 有效', () => {
    const t = { kind: 'stack', params: { y: 'value', groupBy: 'product' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠完整形式仍然有效', () => {
    // 回归：原有完整堆叠柱写法（x + groupBy）依旧通过
    const t = { kind: 'stack', params: { x: 'month', y: 'revenue', groupBy: 'product' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('自定义字段有效的堆叠单链', () => {
    const t = { kind: 'stack', params: { y: 'value', startField: 'lo', endField: 'hi' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('堆叠省略 y 仍被拒绝', () => {
    // y 仍必填（累积的值字段）
    expect(() => TransformSchema.parse({ kind: 'stack', params: {} })).toThrow();
  });
});

describe('TransformSchema 外部操作', () => {
  it('内置不良形状静态拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: {} })).toThrow();
  });

  it('外部类型打开配置有效', () => {
    const operation = { kind: 'regression', params: { x: 'year', y: 'value', degree: 1 } };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('外部类型不能与内置类型冲突', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { custom: true } })).toThrow(/built-in/i);
  });

  it('外部操作 json 往返等价', () => {
    const operation = {
      kind: 'regression',
      params: { x: 'year', y: 'value', options: { robust: false, weights: [1, 2, 3] } },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it.each([
    ['function', () => 1],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['Infinity', Infinity],
  ])('外部操作报告深层非 JSON 值的路径：%s', (_name, value) => {
    const result = ExternalTransformSchema.safeParse({
      kind: 'regression',
      params: {
        payload: { nested: [0, { bad: value }] },
      },
    });

    expect(result.success).toBe(false);

    if (!result.success) expect(result.error.issues.at(0)?.path).toEqual(['params', 'payload']);
  });
});

describe('BinTransformSchema', () => {
  it('bin 计数策略有效', () => {
    const t = {
      kind: 'bin',
      params: { field: 'measurement', count: 20, metrics: [{ kind: 'count', as: 'binCount' }] },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin 步骤策略有效', () => {
    const t = { kind: 'bin', params: { field: 'x', step: 5 } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin 阈值策略有效', () => {
    const t = { kind: 'bin', params: { field: 'x', thresholds: [10, 20, 30] } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin 完整形式有效', () => {
    const t = {
      kind: 'bin',
      params: {
        field: 'measurement',
        count: 10,
        extent: [0, 100] as [number, number],
        nice: false,
        startField: 'lo',
        endField: 'hi',
        metrics: [{ kind: 'mean', field: 'weight', as: 'avg' }],
      },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin 最小有效', () => {
    const t = { kind: 'bin', params: { field: 'measurement' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('bin 缺失字段被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { count: 10 } })).toThrow();
  });

  it('拒绝 bin 计数非整数', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { field: 'x', count: 3.5 } })).toThrow();
  });

  it('bin 拒绝非正步长', () => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { field: 'x', step: 0 } })).toThrow();
  });

  it('旧的缩小形状已被拒绝', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'bin', params: { field: 'x', reduce: 'sum', reduceField: 'weight' } }),
    ).toThrow();
  });

  it('bin json 往返等效', () => {
    const t = {
      kind: 'bin',
      params: {
        field: 'measurement',
        thresholds: [1, 2, 3],
        metrics: [{ kind: 'sum', field: 'w', as: 'totalWeight' }],
      },
    };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));

    expect(round).toEqual(t);
  });
});

describe('统计变换代数 schema', () => {
  it('总结多个有效指标', () => {
    const operation = {
      kind: 'summarize',
      params: {
        groupBy: ['region'],
        metrics: [
          { kind: 'mean', field: 'revenue', as: 'avgRevenue' },
          { kind: 'median', field: 'revenue', as: 'medianRevenue' },
          { kind: 'count', as: 'orders' },
        ],
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it('总结需要度量为', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: ['region'],
          metrics: [{ kind: 'mean', field: 'revenue' }],
        },
      }),
    ).toThrow();
  });

  it('选择最大要求', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'select',
        params: {
          groupBy: ['series'],
          selector: { kind: 'max' },
        },
      }),
    ).toThrow();
  });

  it('关联 json 往返等效项', () => {
    const operation = {
      kind: 'relate',
      params: {
        groupBy: ['series'],
        source: { selector: { kind: 'min', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
        target: { selector: { kind: 'max', by: 'value' }, fields: { x: 'month', y: 'value', id: 'id' } },
        measures: [{ op: 'difference', field: 'value', as: 'delta', labelAs: 'deltaLabel' }],
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('bin 使用共享指标并拒绝旧的归约形状', () => {
    const operation = {
      kind: 'bin',
      params: {
        field: 'measurement',
        step: 10,
        metrics: [
          { kind: 'count', as: 'binCount' },
          { kind: 'mean', field: 'weight', as: 'binMean' },
        ],
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
    expect(() =>
      TransformSchema.parse({ kind: 'bin', params: { field: 'measurement', reduce: 'sum', reduceField: 'weight' } }),
    ).toThrow();
  });
});

describe('SummarizeTransformSchema', () => {
  it('汇总总和有效', () => {
    const t = {
      kind: 'summarize',
      params: {
        groupBy: ['region'],
        metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }],
      },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('汇总计数有效', () => {
    const t = {
      kind: 'summarize',
      params: { groupBy: ['region', 'product'], metrics: [{ kind: 'count', as: 'count' }] },
    };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('总结全局组有效', () => {
    const t = { kind: 'summarize', params: { metrics: [{ kind: 'sum', field: 'revenue', as: 'totalRevenue' }] } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('总结空 groupby 有效', () => {
    const t = { kind: 'summarize', params: { groupBy: [], metrics: [{ kind: 'sum', field: 'r', as: 'total' }] } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('总结 groupby 非数组被拒绝', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: 'region',
          metrics: [{ kind: 'sum', field: 'r', as: 'total' }],
        },
      }),
    ).toThrow();
  });

  it('汇总拒绝的重复指标输出', () => {
    expect(() =>
      TransformSchema.parse({
        kind: 'summarize',
        params: {
          groupBy: ['r'],
          metrics: [
            { kind: 'sum', field: 'x', as: 'value' },
            { kind: 'mean', field: 'x', as: 'value' },
          ],
        },
      }),
    ).toThrow();
  });

  it('总结 json 往返等效', () => {
    const t = {
      kind: 'summarize',
      params: {
        groupBy: ['region'],
        metrics: [{ kind: 'mean', field: 'revenue', as: 'avgRevenue' }],
      },
    };
    const round = TransformSchema.parse(JSON.parse(JSON.stringify(t)));

    expect(round).toEqual(t);
  });
});

describe('NormalizeTransformSchema', () => {
  it('接受 normalize 完整配置', () => {
    const t = { kind: 'normalize', params: { field: 'amount', groupBy: ['quarter'], basis: 'percent', as: 'share' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('接受 normalize 最小配置', () => {
    const t = { kind: 'normalize', params: { field: 'amount' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('正常化缺失字段被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', params: { groupBy: ['q'] } })).toThrow();
  });

  it('按非数组标准化分组被拒绝', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'normalize', params: { field: 'amount', groupBy: 'quarter' } }),
    ).toThrow();
  });

  it('标准化不良基础被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'normalize', params: { field: 'amount', basis: 'ratio' } })).toThrow();
  });
});

describe('DeriveIntervalTransformSchema', () => {
  it('接受双字段 deriveInterval 配置', () => {
    const t = { kind: 'derive-interval', params: { startFrom: 'start', endFrom: 'end' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('从基线有效导出间隔', () => {
    const t = { kind: 'derive-interval', params: { from: 'value', baseline: 10, startField: 'lo', endField: 'hi' } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('导出区间非有限基线被拒绝', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'derive-interval', params: { from: 'v', baseline: Infinity } }),
    ).toThrow();
  });

  it('导出等效的 json 往返间隔', () => {
    const t = { kind: 'derive-interval', params: { startFrom: 's', endFrom: 'e', startField: 'a', endField: 'b' } };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('JitterTransformSchema', () => {
  it('抖动完整形式有效', () => {
    const t = { kind: 'jitter', params: { axis: 'x', xField: 'dose', amount: 0.3, seed: 42 } };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('接受 jitter 最小配置', () => {
    const t = { kind: 'jitter', params: {} };

    expect(TransformSchema.parse(t)).toEqual(t);
  });

  it('抖动种子非整数被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', params: { seed: 1.5 } })).toThrow();
  });

  it('抖动负数被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', params: { amount: -1 } })).toThrow();
  });

  it('抖动坏轴被拒绝', () => {
    expect(() => TransformSchema.parse({ kind: 'jitter', params: { axis: 'z' } })).toThrow();
  });

  it('抖动 json 往返等效', () => {
    const t = { kind: 'jitter', params: { axis: 'both', xField: 'dx', yField: 'dy', amount: 2, seed: 7 } };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(t)))).toEqual(t);
  });
});

describe('DensityTransformSchema', () => {
  it('接受 density 完整配置且保持 JSON 往返等价', () => {
    const operation = {
      kind: 'density',
      params: {
        field: 'value',
        groupBy: ['species'],
        bandwidth: { kind: 'silverman' },
        sampleCount: 96,
        extent: [0, 10],
        xAs: 'densityX',
        densityAs: 'density',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('接受 density 显式带宽', () => {
    const operation = {
      kind: 'density',
      params: {
        field: 'value',
        bandwidth: { kind: 'value', value: 2 },
        xAs: 'x',
        densityAs: 'd',
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it.each([
    ['xAs', { kind: 'density', params: { field: 'value', densityAs: 'density' } }],
    ['densityAs', { kind: 'density', params: { field: 'value', xAs: 'densityX' } }],
  ])('密度要求输出字段：%s', (_field, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['xAs matches densityAs', { kind: 'density', params: { field: 'value', xAs: 'density', densityAs: 'density' } }],
    [
      'xAs matches groupBy',
      {
        kind: 'density',
        params: {
          field: 'value',
          groupBy: ['species'],
          xAs: 'species',
          densityAs: 'density',
        },
      },
    ],
  ])('密度拒绝输出碰撞：%s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['extent order', { kind: 'density', params: { field: 'value', extent: [10, 0], xAs: 'x', densityAs: 'd' } }],
    [
      'bandwidth value',
      {
        kind: 'density',
        params: {
          field: 'value',
          bandwidth: { kind: 'value', value: 0 },
          xAs: 'x',
          densityAs: 'd',
        },
      },
    ],
  ])('density 拒绝无效的 %s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });
});

describe('SmoothTransformSchema', () => {
  it('平滑的完整形式有效和 json 往返等效', () => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        groupBy: ['series'],
        method: { kind: 'linear' },
        sampleCount: 96,
        extent: [0, 10],
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
  });

  it('接受 smooth 最小线性配置', () => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(BuiltinTransformSchema.parse(operation)).toEqual(operation);
  });

  it.each([
    ['linear', { kind: 'linear' }],
    ['quadratic', { kind: 'quadratic' }],
    ['polynomial default order', { kind: 'polynomial' }],
    ['polynomial order 2', { kind: 'polynomial', order: 2 }],
    ['polynomial order 3', { kind: 'polynomial', order: 3 }],
    ['polynomial order 6', { kind: 'polynomial', order: 6 }],
    ['logarithmic', { kind: 'logarithmic' }],
    ['exponential', { kind: 'exponential' }],
    ['power', { kind: 'power' }],
  ])('smooth 接受完整方法变体：%s', (_name, method) => {
    const operation = {
      kind: 'smooth',
      params: {
        x: 'time',
        y: 'value',
        method,
        xAs: 'trendX',
        yAs: 'trendY',
      },
    };

    expect(TransformSchema.parse(operation)).toEqual(operation);
  });

  it.each([
    ['xAs', { kind: 'smooth', params: { x: 'time', y: 'value', yAs: 'trendY' } }],
    ['yAs', { kind: 'smooth', params: { x: 'time', y: 'value', xAs: 'trendX' } }],
  ])('smooth 要求输出字段：%s', (_field, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['xAs matches yAs', { kind: 'smooth', params: { x: 'time', y: 'value', xAs: 'trend', yAs: 'trend' } }],
    [
      'xAs matches groupBy',
      {
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          groupBy: ['series'],
          xAs: 'series',
          yAs: 'trendY',
        },
      },
    ],
  ])('平滑拒绝输出碰撞：%s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    [
      'extent order',
      { kind: 'smooth', params: { x: 'time', y: 'value', extent: [10, 0], xAs: 'trendX', yAs: 'trendY' } },
    ],
    [
      'method kind',
      {
        kind: 'smooth',
        params: {
          x: 'time',
          y: 'value',
          method: { kind: '' },
          xAs: 'trendX',
          yAs: 'trendY',
        },
      },
    ],
  ])('平滑拒绝无效的 %s', (_name, operation) => {
    expect(() => TransformSchema.parse(operation)).toThrow();
  });

  it.each([
    ['polynomial order below minimum', { kind: 'polynomial', order: 1 }],
    ['polynomial order above maximum', { kind: 'polynomial', order: 7 }],
    ['polynomial non-integer order', { kind: 'polynomial', order: 2.5 }],
    ['short logarithmic name', { kind: 'log' }],
    ['short exponential name', { kind: 'exp' }],
    ['unknown method field', { kind: 'quadratic', order: 2 }],
    ['linear method options', { kind: 'linear', order: 2 }],
  ])('smooth 拒绝无效方法变体：%s', (_name, method) => {
    expect(() => resolveRegression(method)).toThrow();
  });
});

describe('转换分组 schema', () => {
  it.each(['sort', 'bin'])('往返 %s 分组而不实现默认值', kind => {
    for (const groupBy of [[], ['team', 'item']]) {
      const operation = { kind, params: { field: 'value', groupBy } };
      expect(TransformSchema.parse(JSON.parse(JSON.stringify(operation)))).toEqual(operation);
    }
  });
  it.each(['sort', 'bin'])('拒绝参数路径中无效的 %s 分组', kind => {
    for (const groupBy of ['team', [' ']]) {
      const schema = kind === 'sort' ? SortTransformSchema : BinTransformSchema;
      const result = schema.safeParse({ kind, params: { field: 'value', groupBy } });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.some(issue => issue.path.includes('groupBy'))).toBe(true);
    }
  });
  it.each(['value', 'binStart', 'binEnd', 'binCount'])('拒绝与组 %s 发生冲突的 bin 输出', field => {
    expect(() => TransformSchema.parse({ kind: 'bin', params: { field: 'value', groupBy: [field] } })).toThrow(
      /groupBy/,
    );
  });
  it('拒绝命名边界和多输出归约器碰撞', () => {
    expect(() =>
      TransformSchema.parse({ kind: 'bin', params: { field: 'value', groupBy: ['team'], startField: 'team' } }),
    ).toThrow(/groupBy/);
    expect(() =>
      TransformSchema.parse({
        kind: 'bin',
        params: {
          field: 'value',
          groupBy: ['team'],
          metrics: [{ kind: 'extent', field: 'value', as: { min: 'team', max: 'hi' } }],
        },
      }),
    ).toThrow(/groupBy/);
  });
});
