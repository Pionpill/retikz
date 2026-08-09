import type { ValueOf } from '@retikz/foundation';

/** Performance Lab 预览尺寸预设 ID */
export const LabPreviewSizePresetId = {
  Size640x400: '640x400',
  Size800x400: '800x400',
  Hd: '1280x720',
  FullHd: '1920x1080',
  TwoK: '2560x1440',
  FourK: '3840x2160',
  Custom: 'custom',
} as const;

/** Performance Lab 预览尺寸预设 ID 取值 */
export type LabPreviewSizePresetIdValue = ValueOf<typeof LabPreviewSizePresetId>;

/** Performance Lab 固定预览尺寸预设 ID 取值 */
export type FixedLabPreviewSizePresetIdValue = Exclude<
  LabPreviewSizePresetIdValue,
  typeof LabPreviewSizePresetId.Custom
>;

/** Performance Lab 固定预览尺寸预设 */
export type LabPreviewSizePreset = Readonly<{
  /** 稳定预设 ID */
  id: FixedLabPreviewSizePresetIdValue;
  /** 输出宽度 */
  width: number;
  /** 输出高度 */
  height: number;
}>;

/** Performance Lab 支持的固定预览尺寸 */
export const labPreviewSizePresets: ReadonlyArray<LabPreviewSizePreset> = Object.freeze([
  Object.freeze({ id: LabPreviewSizePresetId.Size640x400, width: 640, height: 400 }),
  Object.freeze({ id: LabPreviewSizePresetId.Size800x400, width: 800, height: 400 }),
  Object.freeze({ id: LabPreviewSizePresetId.Hd, width: 1280, height: 720 }),
  Object.freeze({ id: LabPreviewSizePresetId.FullHd, width: 1920, height: 1080 }),
  Object.freeze({ id: LabPreviewSizePresetId.TwoK, width: 2560, height: 1440 }),
  Object.freeze({ id: LabPreviewSizePresetId.FourK, width: 3840, height: 2160 }),
]);

/** 按稳定 ID 读取固定预览尺寸 */
export const getLabPreviewSizePreset = (id: FixedLabPreviewSizePresetIdValue): LabPreviewSizePreset => {
  const preset = labPreviewSizePresets.find(candidate => candidate.id === id);
  if (preset === undefined) throw new Error(`unknown Performance Lab preview size preset: ${id}`);
  return preset;
};

/** Performance Lab 默认预览尺寸 */
export const defaultLabPreviewSizePreset = getLabPreviewSizePreset(LabPreviewSizePresetId.Size640x400);
