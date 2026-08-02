import { describe, expect, it } from 'vitest';

import type { LabRunSession } from '../src/playground/modules/kernel';

import { createInitialLabState, reduceLabState } from '../src/playground/app/lab-state';
import { BenchModuleId } from '../src/playground/app/module-registry';
import { labPreviewSizePresets } from '../src/playground/app/preview-size';
import { isValidLabPreviewSize } from '../src/playground/modules/kernel';

describe('Performance Lab state', () => {
  it('只保留与路由无关的运行配置', () => {
    expect(createInitialLabState()).toMatchObject({
      backend: 'svg',
      policyId: 'retained-auto',
      previewSizePresetId: '640x400',
      previewWidth: 640,
      previewHeight: 400,
      status: 'idle',
    });
    expect('mode' in createInitialLabState()).toBe(false);
  });

  it('使用路由模块初始化工作台', () => {
    expect(createInitialLabState(BenchModuleId.Plot).moduleId).toBe('plot');
  });

  it('通过预设和自定义尺寸配置预览输出', () => {
    expect(labPreviewSizePresets.map(({ width, height }) => `${width}x${height}`)).toEqual([
      '640x400',
      '800x400',
      '1280x720',
      '1920x1080',
      '2560x1440',
      '3840x2160',
    ]);
    const initial = createInitialLabState();
    const twoK = reduceLabState(initial, {
      type: 'preview-size-preset-selected',
      presetId: '2560x1440',
    });
    expect(twoK).toMatchObject({
      previewSizePresetId: '2560x1440',
      previewWidth: 2560,
      previewHeight: 1440,
    });

    const custom = reduceLabState(twoK, {
      type: 'preview-size-preset-selected',
      presetId: 'custom',
    });
    expect(custom).toMatchObject({
      previewSizePresetId: 'custom',
      previewWidth: 2560,
      previewHeight: 1440,
    });

    const resized = reduceLabState(custom, {
      type: 'preview-size-changed',
      width: 1024,
      height: 512,
    });
    expect(resized).toMatchObject({
      previewSizePresetId: 'custom',
      previewWidth: 1024,
      previewHeight: 512,
    });
    expect(
      reduceLabState(resized, {
        type: 'preview-size-changed',
        width: 0,
        height: 9000,
      }),
    ).toBe(resized);
  });

  it('允许 4K 输出并拒绝超出 4K 总像素预算的自定义尺寸', () => {
    expect(isValidLabPreviewSize(3840, 2160)).toBe(true);
    expect(isValidLabPreviewSize(8192, 8192)).toBe(false);
  });

  it('运行失败时保留上一次结果并暴露错误', () => {
    const initial = { ...createInitialLabState(), session: { id: 'previous' } as never };
    const running = reduceLabState(initial, { type: 'run-started' });
    const failed = reduceLabState(running, { type: 'run-failed', error: 'boom' });
    expect(failed.status).toBe('error');
    expect(failed.error).toBe('boom');
    expect(failed.session).toBe(initial.session);
  });

  it('报告保存失败不会覆盖成功运行结果', () => {
    const session: LabRunSession = {
      id: 'run-1',
      mode: 'preview',
      scenarioId: 'single-entity-update',
      backend: 'svg',
      startedAt: 1,
      results: [],
    };
    const succeeded = reduceLabState(createInitialLabState(), { type: 'run-succeeded', session });
    const warned = reduceLabState(succeeded, { type: 'report-save-failed', warning: 'disk full' });

    expect(warned.status).toBe('success');
    expect(warned.session).toBe(session);
    expect(warned.reportWarning).toBe('disk full');
    expect(reduceLabState(warned, { type: 'run-started' }).reportWarning).toBeUndefined();
  });
});
