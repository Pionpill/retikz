import type { ComponentType } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import {
  pathLabelRoutePlaygroundControls,
  previewControlContract,
} from '@/modules/docs/contents/kernel/components/draw/path/path-label-route-playground.controls';
import {
  pathLabelRoutePlaygroundControls as englishControls,
  previewControlContract as englishPreviewControlContract,
} from '@/modules/docs/contents/kernel/components/draw/path/path-label-route-playground.en.controls';
import EnglishPathLabelRoutePlayground from '@/modules/docs/contents/kernel/components/draw/path/path-label-route-playground.en.demo';
import PathLabelRoutePlayground from '@/modules/docs/contents/kernel/components/draw/path/path-label-route-playground.zh.demo';

type PlaygroundScenario = {
  Demo: ComponentType;
  contract: PreviewControlContract;
};

/** 在给定 controls 状态下渲染真实 Path label playground */
const renderPlayground = (scenario: PlaygroundScenario, valuesOverride: PreviewControlValues): string => {
  const canonicalValues = scenario.contract.canonicalValues as PreviewControlValues;

  return renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues,
        values: { ...canonicalValues, ...valuesOverride },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <scenario.Demo />
    </PreviewControlStateContext.Provider>,
  );
};

/** 取 SVG 固定取景，避免 controls 切换时相机漂移 */
const viewBoxOf = (markup: string): string | undefined => markup.match(/<svg[^>]*viewBox="([^"]+)"/)?.[1];

/** 统计真实 SVG path 元素数量，用于比较连续描边与断开的描边 */
const pathCountOf = (markup: string): number => [...markup.matchAll(/<path\b/g)].length;

describe('Path 标签路线 playground', () => {
  const chineseScenario: PlaygroundScenario = { Demo: PathLabelRoutePlayground, contract: previewControlContract };
  const englishScenario: PlaygroundScenario = {
    Demo: EnglishPathLabelRoutePlayground,
    contract: englishPreviewControlContract,
  };

  it('将路线、side 与位置作为双语一致的 controls 契约公开', () => {
    const fields = getPreviewControlFields(pathLabelRoutePlaygroundControls);
    const englishFields = getPreviewControlFields(englishControls);

    expect(
      englishFields.map(field => ({
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
        options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
      })),
    ).toEqual(
      fields.map(field => ({
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
        options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
      })),
    );
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
    expect(englishPreviewControlContract.relatedApis).toEqual(previewControlContract.relatedApis);
  });

  it('提供直线、折线和四类曲线，以及 0–1 的标签位置', () => {
    const fields = getPreviewControlFields(pathLabelRoutePlaygroundControls);
    const route = fields.find(field => field.id === 'route');
    const side = fields.find(field => field.id === 'side');
    const position = fields.find(field => field.id === 'position');

    expect(route).toMatchObject({
      kind: 'select',
      defaultValue: 'line',
      options: [
        { value: 'line' },
        { value: 'fold' },
        { value: 'curve' },
        { value: 'cubic' },
        { value: 'bend' },
        { value: 'smooth' },
      ],
    });
    expect(side).toMatchObject({
      kind: 'select',
      defaultValue: 'center',
      options: [{ value: 'center' }, { value: 'top' }, { value: 'bottom' }, { value: 'left' }, { value: 'right' }],
    });
    expect(position).toMatchObject({ kind: 'range', defaultValue: 0.5, min: 0, max: 1, step: 0.05 });
  });

  it.each(['line', 'fold', 'curve', 'cubic', 'bend', 'smooth'] as const)(
    '%s 路线保持固定取景，并真正改变连接几何',
    route => {
      const line = renderPlayground(chineseScenario, { route: 'line' });
      const markup = renderPlayground(chineseScenario, { route });

      expect(markup).toContain('<svg');
      expect(viewBoxOf(markup)).toBe(viewBoxOf(line));
      if (route !== 'line') expect(markup).not.toBe(line);
    },
  );

  it('居中标签自动断线，非居中标签保持连续，位置会沿同一路线移动', () => {
    const centered = renderPlayground(chineseScenario, { route: 'line', side: 'center', position: 0.5 });
    const above = renderPlayground(chineseScenario, { route: 'line', side: 'top', position: 0.5 });
    const nearStart = renderPlayground(chineseScenario, { route: 'line', side: 'center', position: 0.15 });

    expect(pathCountOf(centered)).toBeGreaterThan(pathCountOf(above));
    expect(nearStart).not.toBe(centered);
  });

  it('英文 demo 使用同一组可观察行为', () => {
    const centered = renderPlayground(englishScenario, { route: 'bend', side: 'center', position: 0.5 });
    const right = renderPlayground(englishScenario, { route: 'bend', side: 'right', position: 0.5 });

    expect(pathCountOf(centered)).toBeGreaterThan(pathCountOf(right));
  });
});
