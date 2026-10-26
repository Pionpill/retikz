import type { IRScene } from '@retikz/core';
import { compileToScene } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { createGrid, createLegend, GridDefinition, LegendDefinition } from '../src/presentation';

const gridScene: IRScene = {
  type: 'scene',
  version: 1,
  children: [createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } })],
};

describe('Standard 直接定义加载', () => {
  it('通过 Core 编译选项编译选定的 Standard 复合组件', () => {
    const direct = compileToScene(gridScene, { composites: [GridDefinition] });

    expect(direct.scene.primitives).not.toHaveLength(0);
  });

  it('省略定义时保留 Core 警告', () => {
    const warningCodes: Array<string> = [];

    compileToScene(gridScene, {
      onWarn: warning => warningCodes.push(warning.code),
    });

    expect(warningCodes).toContain('COMPOSITE_NOT_REGISTERED');
  });

  it('留下重复的复合键以供 Core 注册表进行诊断', () => {
    expect(() => compileToScene(gridScene, { composites: [GridDefinition, GridDefinition] })).toThrow(
      /duplicate composite registration.*standard\.grid/i,
    );
  });

  it('不隐式收集嵌套 Standard 样本的定义', () => {
    const legend = createLegend({
      content: {
        kind: 'items',
        items: [
          {
            key: 'grid',
            sample: createGrid({ bounds: { start: [0, 0], end: [10, 10] }, line: { spacing: 10 } }),
          },
        ],
      },
    });

    expect(() =>
      compileToScene({ type: 'scene', version: 1, children: [legend] }, { composites: [LegendDefinition] }),
    ).toThrow(/standard\.grid|composite.*not registered/i);
  });
});
