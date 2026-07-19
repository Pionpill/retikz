import { definePreviewControls } from '@/modules/docs/components/component-preview/author';

/** Scope 整体引用 playground 使用的稳定字段 id */
export const ScopeIdReferenceControlId = {
  BoundingShape: 'boundingShape',
  Anchor: 'anchor',
  AngleDegrees: 'angleDegrees',
} as const;

/** 仅在角度 anchor 下显示连续角度输入 */
export const ScopeIdReferenceVisibleWhen = {
  Angle: { controlId: ScopeIdReferenceControlId.Anchor, oneOf: ['angle'] },
} as const;

/** Scope 整体引用与输出边界的中文属性面板 */
export const scopeIdReferenceControls = definePreviewControls({
  presentation: 'panel',
  title: 'Scope target',
  sections: [
    {
      label: '目标边界',
      controls: [
        {
          kind: 'select',
          id: ScopeIdReferenceControlId.BoundingShape,
          label: 'shape',
          defaultValue: 'rectangle',
          options: [
            { value: 'rectangle', label: '矩形' },
            { value: 'circle', label: '圆形' },
          ],
        },
      ],
    },
    {
      label: '连接落点',
      controls: [
        {
          kind: 'select',
          id: ScopeIdReferenceControlId.Anchor,
          label: 'anchor',
          defaultValue: 'left',
          options: [
            { value: 'center', label: '中心' },
            { value: 'top', label: '上' },
            { value: 'top-right', label: '右上' },
            { value: 'right', label: '右' },
            { value: 'bottom-right', label: '右下' },
            { value: 'bottom', label: '下' },
            { value: 'bottom-left', label: '左下' },
            { value: 'left', label: '左' },
            { value: 'top-left', label: '左上' },
            { value: 'angle', label: '自定义角度' },
          ],
        },
        {
          kind: 'range',
          id: ScopeIdReferenceControlId.AngleDegrees,
          label: '角度',
          defaultValue: 180,
          min: 0,
          max: 360,
          step: 1,
          visibleWhen: ScopeIdReferenceVisibleWhen.Angle,
        },
      ],
    },
  ],
});
