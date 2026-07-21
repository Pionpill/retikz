import { useEffect, useMemo, useState } from 'react';

import type {
  PreviewControlsDefinition,
  PreviewControlState,
  PreviewControlValues,
  PreviewRangeControlField,
} from '../types';

import { buildPreviewControlDefaults } from '../controls';

const DEFAULT_RANGE_PLAYBACK_DURATION = 2000;

type RangePlayback = {
  field: PreviewRangeControlField;
  duration: number;
};

/** 把插值后的范围值对齐到控件步长，避免浮点展示噪声。 */
const resolveRangePlaybackValue = (field: PreviewRangeControlField, progress: number): number => {
  if (progress >= 1) return field.max;

  const step = field.step ?? 1;
  const interpolated = field.min + (field.max - field.min) * progress;
  const snapped = field.min + Math.round((interpolated - field.min) / step) * step;
  const precision = Math.max(
    ...[field.min, field.max, step].map(value => {
      const valueText = String(value);
      const decimalIndex = valueText.indexOf('.');
      return decimalIndex === -1 ? 0 : valueText.length - decimalIndex - 1;
    }),
  );

  return Number(Math.min(field.max, Math.max(field.min, snapped)).toFixed(precision));
};

const resolveRangePlaybackDuration = (duration: number | undefined): number =>
  duration !== undefined && Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_RANGE_PLAYBACK_DURATION;

/** 为单张预览卡创建可注入多个视图 controller 的业务控件状态 */
export const usePreviewControlState = (
  definition: PreviewControlsDefinition | undefined,
  canonicalValues?: Readonly<PreviewControlValues>,
  rangePlaybackDuration?: number,
): PreviewControlState => {
  const baseline = useMemo(
    () => ({ ...buildPreviewControlDefaults(definition), ...canonicalValues }),
    [canonicalValues, definition],
  );
  const [values, setValues] = useState<PreviewControlValues>(baseline);
  const [rangePlayback, setRangePlayback] = useState<RangePlayback>();

  useEffect(() => {
    setValues(baseline);
    setRangePlayback(undefined);
  }, [baseline]);

  useEffect(() => {
    if (rangePlayback === undefined) return undefined;

    let animationFrame = 0;
    let startedAt: number | undefined;
    const { field, duration } = rangePlayback;
    const tick = (timestamp: number) => {
      startedAt ??= timestamp;
      const progress = Math.min(1, (timestamp - startedAt) / duration);
      const nextValue = resolveRangePlaybackValue(field, progress);
      setValues(current => ({ ...current, [field.id]: nextValue }));

      if (progress >= 1) {
        setRangePlayback(current => (current === rangePlayback ? undefined : current));
        return;
      }
      animationFrame = window.requestAnimationFrame(tick);
    };

    animationFrame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [rangePlayback]);

  const stopRangePlayback = () => setRangePlayback(undefined);
  const startRangePlayback = (field: PreviewRangeControlField) => {
    if (field.min >= field.max) return;

    const duration = resolveRangePlaybackDuration(field.playDuration ?? rangePlaybackDuration);
    setValues(current => ({ ...current, [field.id]: field.min }));
    setRangePlayback({ field, duration });
  };
  const setValue = (id: string, value: PreviewControlValues[string]) => {
    setRangePlayback(current => (current?.field.id === id ? undefined : current));
    setValues(current => ({ ...current, [id]: value }));
  };
  const applyValues = (nextValues: Readonly<PreviewControlValues>) => {
    setRangePlayback(undefined);
    setValues({ ...baseline, ...nextValues });
  };
  const reset = () => {
    setRangePlayback(undefined);
    setValues(baseline);
  };

  return {
    canonicalValues: baseline,
    values,
    setValue,
    applyValues,
    reset,
    rangePlaybackId: rangePlayback?.field.id,
    startRangePlayback,
    stopRangePlayback,
  };
};
