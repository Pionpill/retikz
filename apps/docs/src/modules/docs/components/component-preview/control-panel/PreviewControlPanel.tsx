import type { FC } from 'react';

import { Minus, PanelLeftClose, Plus, RotateCcw } from 'lucide-react';
import { Fragment, memo, useId, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib';

import type {
  PreviewControlContract,
  PreviewControlPreset,
  PreviewControlState,
  PreviewControlValue,
  PreviewControlValues,
  PreviewPanelControlsDefinition,
  PreviewSelectControlField,
} from '../types';

import {
  buildPreviewControlVisibilityKey,
  PreviewControlFieldInput,
  resolveVisiblePreviewControlSections,
} from '../controls';
import { usePreviewControlLayout } from './hooks';
import { PreviewTableControl } from './PreviewTableControl';
import { getDefaultCollapsedSectionIndexes } from './utils';

type PreviewCollapsedSectionsState = {
  definition: PreviewPanelControlsDefinition;
  indexes: Set<number>;
};

const CUSTOM_PRESET_ID = '__preview-custom-preset__';

/** 比较 scalar 与 point control 值 */
const previewControlValueEquals = (left: PreviewControlValue | undefined, right: PreviewControlValue | undefined) => {
  if (!Array.isArray(left) || !Array.isArray(right)) return left === right;
  return left.every((value, index) => value === right[index]);
};

/** 判断实时 controls 是否完整匹配 preset 的 resolved values */
const matchesPreviewControlPreset = (
  values: Readonly<PreviewControlValues>,
  canonicalValues: Readonly<PreviewControlValues>,
  preset: PreviewControlPreset,
): boolean => {
  if (preset.applyMode === 'merge-current') {
    return Object.entries(preset.values).every(([key, value]) => previewControlValueEquals(values[key], value));
  }
  const expected = { ...canonicalValues, ...preset.values };
  const keys = new Set([...Object.keys(values), ...Object.keys(expected)]);
  return Array.from(keys).every(key => previewControlValueEquals(values[key], expected[key]));
};

/** 预览属性面板属性 */
export type PreviewControlPanelProps = {
  /** panel 形式的控件定义 */
  definition: PreviewPanelControlsDefinition;
  /** 可选的完整 controls contract */
  controlContract?: PreviewControlContract;
  /** Card/Dialog 共享的字段值状态 */
  controlState: PreviewControlState;
  /** 字段控件密度
   * @default default
   */
  density?: 'compact' | 'default';
  /** 关闭属性面板 */
  onClose: () => void;
};

/** 渲染可滚动的声明式预览属性面板 */
const PreviewControlPanelComponent: FC<PreviewControlPanelProps> = props => {
  const { definition, controlContract, controlState, density = 'default', onClose } = props;
  const { t } = useTranslation();
  const controlPanelId = useId();
  const panelTitleId = `${controlPanelId}-preview-control-panel-title`;
  const compact = density === 'compact';
  const presets = controlContract?.presets ?? [];
  const presetSelector = controlContract?.presetSelector;
  const activePresetId =
    presets.find(preset => matchesPreviewControlPreset(controlState.values, controlState.canonicalValues, preset))
      ?.id ?? CUSTOM_PRESET_ID;
  const presetField: PreviewSelectControlField | undefined =
    presetSelector && presets.length > 0
      ? {
          kind: 'select',
          id: CUSTOM_PRESET_ID,
          label: presetSelector.label,
          defaultValue: activePresetId,
          options: [
            ...(activePresetId === CUSTOM_PRESET_ID
              ? [{ value: CUSTOM_PRESET_ID, label: presetSelector.customLabel }]
              : []),
            ...presets.map(preset => ({ value: preset.id, label: preset.label })),
          ],
        }
      : undefined;
  const panelRef = useRef<HTMLElement>(null);
  const visibilityKey = buildPreviewControlVisibilityKey(definition.sections, controlState.values);
  const visibilityValues = useMemo<PreviewControlValues>(() => JSON.parse(visibilityKey), [visibilityKey]);
  const visibleDefinition = useMemo<PreviewPanelControlsDefinition>(
    () => ({
      ...definition,
      sections: resolveVisiblePreviewControlSections(definition.sections, visibilityValues),
    }),
    [definition, visibilityValues],
  );
  const [collapsedSections, setCollapsedSections] = useState<PreviewCollapsedSectionsState>(() => ({
    definition: visibleDefinition,
    indexes: getDefaultCollapsedSectionIndexes(visibleDefinition.sections),
  }));

  if (collapsedSections.definition !== visibleDefinition) {
    setCollapsedSections({
      definition: visibleDefinition,
      indexes: getDefaultCollapsedSectionIndexes(visibleDefinition.sections),
    });
  }

  const collapsedSectionIndexes =
    collapsedSections.definition === visibleDefinition ? collapsedSections.indexes : new Set<number>();
  const { columns, columnsRef } = usePreviewControlLayout({
    definition: visibleDefinition,
    collapsedSectionIndexes,
    density,
    panelRef,
  });
  const toggleSection = (sourceIndex: number) => {
    setCollapsedSections(currentState => {
      const nextIndexes = new Set(currentState.definition === visibleDefinition ? currentState.indexes : []);
      if (nextIndexes.has(sourceIndex)) nextIndexes.delete(sourceIndex);
      else nextIndexes.add(sourceIndex);
      return { definition: visibleDefinition, indexes: nextIndexes };
    });
  };

  return (
    <aside
      ref={panelRef}
      data-density={density}
      aria-labelledby={panelTitleId}
      className="flex h-full min-h-0 flex-col bg-muted/30"
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <span id={panelTitleId} className="min-w-0 truncate text-sm font-medium">
          {definition.title}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.resetControls')}
            title={t('preview.resetControls')}
            onClick={controlState.reset}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t('preview.closeControlsPanel')}
            title={t('preview.closeControlsPanel')}
            onClick={onClose}
          >
            <PanelLeftClose className="size-3.5" />
          </Button>
        </div>
      </header>
      <Separator />
      <div
        ref={columnsRef}
        data-slot="preview-control-columns"
        data-column-count={columns.length}
        className="grid min-h-0 flex-1 gap-2 overflow-y-auto p-2 px-3"
        style={{
          gridTemplateColumns: columns.length === 2 ? 'minmax(0, 1fr) auto minmax(0, 1fr)' : 'minmax(0, 1fr)',
        }}
      >
        {columns.map((columnSections, columnIndex) => (
          <Fragment key={columnIndex}>
            {columnIndex > 0 ? (
              <Separator data-slot="preview-control-column-separator" orientation="vertical" className="self-stretch" />
            ) : null}
            <div data-slot="preview-control-column" className="min-w-0">
              {columnIndex === 0 && presetSelector && presetField ? (
                <div data-slot="preview-preset-selector" className="mb-3 flex min-h-7 w-full items-center gap-2">
                  <Label className="min-w-0 shrink truncate text-xs whitespace-nowrap" title={presetSelector.label}>
                    {presetSelector.label}
                  </Label>
                  <div className="flex min-w-16 flex-1 justify-end">
                    <PreviewControlFieldInput
                      field={presetField}
                      value={activePresetId}
                      compact={compact}
                      onValueChange={value => {
                        if (typeof value !== 'string') return;
                        const preset = presets.find(candidate => candidate.id === value);
                        if (preset) {
                          controlState.applyValues(
                            preset.applyMode === 'merge-current'
                              ? { ...controlState.values, ...preset.values }
                              : preset.values,
                          );
                        }
                      }}
                    />
                  </div>
                </div>
              ) : null}
              {columnSections.map(section => {
                const collapsed = section.label ? collapsedSectionIndexes.has(section.sourceIndex) : false;
                const controlsId = `${controlPanelId}-preview-control-section-${section.sourceIndex}-${columnIndex}`;

                return (
                  <section key={section.sourceIndex} className="mb-3 space-y-2 last:mb-0">
                    {section.label && section.showTitle ? (
                      <div data-slot="preview-control-section-title">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-slot="preview-control-section-toggle"
                          data-section-index={section.sourceIndex}
                          aria-controls={collapsed ? undefined : controlsId}
                          aria-expanded={!collapsed}
                          aria-label={section.label}
                          className="h-6 w-full justify-between px-0! text-xs font-medium tracking-wide text-muted-foreground uppercase hover:bg-transparent hover:text-muted-foreground"
                          onClick={() => toggleSection(section.sourceIndex)}
                        >
                          <span className="truncate">{section.label}</span>
                          {collapsed ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
                        </Button>
                      </div>
                    ) : null}
                    {!collapsed ? (
                      <div id={controlsId} className="space-y-2">
                        {section.controls.map(field => (
                          <div
                            key={field.id}
                            data-slot="preview-control-field"
                            data-control-id={field.id}
                            className={field.kind === 'table' ? 'min-w-0' : 'flex min-h-7 w-full items-center gap-2'}
                          >
                            {field.kind === 'table' ? (
                              <PreviewTableControl field={field} values={controlState.values} density={density} />
                            ) : (
                              <>
                                <Label
                                  className={cn(
                                    'min-w-0 truncate text-xs whitespace-nowrap',
                                    field.kind === 'switch' ? 'flex-1' : 'shrink',
                                  )}
                                  title={field.label}
                                >
                                  {field.label}
                                </Label>
                                <div
                                  className={cn(
                                    'flex min-w-0 justify-end',
                                    field.kind === 'switch'
                                      ? 'shrink-0'
                                      : field.kind === 'range' || field.kind === 'color' || field.kind === 'point'
                                        ? 'min-w-24 flex-1'
                                        : 'min-w-16 flex-1',
                                  )}
                                >
                                  <PreviewControlFieldInput
                                    field={field}
                                    value={controlState.values[field.id] ?? field.defaultValue}
                                    compact={compact}
                                    onValueChange={value => controlState.setValue(field.id, value)}
                                    playingRangeId={controlState.rangePlaybackId}
                                    onRangePlaybackStart={controlState.startRangePlayback}
                                    onRangePlaybackStop={controlState.stopRangePlayback}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </section>
                );
              })}
            </div>
          </Fragment>
        ))}
      </div>
    </aside>
  );
};

/** controls state 未变化时跳过纯预览 controller 更新。 */
export const PreviewControlPanel = memo(PreviewControlPanelComponent);
