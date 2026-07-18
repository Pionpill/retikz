import type { FC } from 'react';

import { Minus, PanelLeftClose, Plus, RotateCcw } from 'lucide-react';
import { Fragment, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

import type { PreviewControlState, PreviewPanelControlsDefinition } from '../types';

import { PreviewControlFieldInput } from '../controls';
import { usePreviewControlLayout } from './hooks';

type PreviewCollapsedSectionsState = {
  definition: PreviewPanelControlsDefinition;
  indexes: Set<number>;
};

/** 预览属性面板属性 */
export type PreviewControlPanelProps = {
  /** panel 形式的控件定义 */
  definition: PreviewPanelControlsDefinition;
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
export const PreviewControlPanel: FC<PreviewControlPanelProps> = props => {
  const { definition, controlState, density = 'default', onClose } = props;
  const compact = density === 'compact';
  const panelRef = useRef<HTMLElement>(null);
  const [collapsedSections, setCollapsedSections] = useState<PreviewCollapsedSectionsState>(() => ({
    definition,
    indexes: new Set(),
  }));

  if (collapsedSections.definition !== definition) {
    setCollapsedSections({ definition, indexes: new Set() });
  }

  const collapsedSectionIndexes =
    collapsedSections.definition === definition ? collapsedSections.indexes : new Set<number>();
  const { columns, columnsRef } = usePreviewControlLayout({
    definition,
    collapsedSectionIndexes,
    density,
    panelRef,
  });
  const toggleSection = (sourceIndex: number) => {
    setCollapsedSections(currentState => {
      const nextIndexes = new Set(currentState.definition === definition ? currentState.indexes : []);
      if (nextIndexes.has(sourceIndex)) nextIndexes.delete(sourceIndex);
      else nextIndexes.add(sourceIndex);
      return { definition, indexes: nextIndexes };
    });
  };

  return (
    <aside ref={panelRef} data-density={density} className="flex h-full min-h-0 flex-col bg-muted/30">
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <span className="min-w-0 truncate text-sm font-medium">{definition.title}</span>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Reset controls"
            title="Reset controls"
            onClick={controlState.reset}
          >
            <RotateCcw className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close controls panel"
            title="Close controls panel"
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
              {columnSections.map(section => {
                const collapsed = section.label ? collapsedSectionIndexes.has(section.sourceIndex) : false;
                const controlsId = `preview-control-section-${section.sourceIndex}-${columnIndex}`;

                return (
                  <section key={section.sourceIndex} className="mb-3 space-y-2 last:mb-0">
                    {section.label && section.showTitle ? (
                      <h3 data-slot="preview-control-section-title">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          data-slot="preview-control-section-toggle"
                          data-section-index={section.sourceIndex}
                          aria-controls={controlsId}
                          aria-expanded={!collapsed}
                          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${section.label}`}
                          className="h-6 w-full justify-between px-0! text-xs font-medium tracking-wide text-muted-foreground uppercase hover:bg-transparent hover:text-muted-foreground"
                          onClick={() => toggleSection(section.sourceIndex)}
                        >
                          <span className="truncate">{section.label}</span>
                          {collapsed ? <Plus className="size-3.5" /> : <Minus className="size-3.5" />}
                        </Button>
                      </h3>
                    ) : null}
                    {!collapsed ? (
                      <div id={controlsId} className="space-y-2">
                        {section.controls.map(field => (
                          <div
                            key={field.id}
                            data-slot="preview-control-field"
                            data-control-id={field.id}
                            className="flex min-h-7 w-full items-center gap-2"
                          >
                            <Label className="max-w-16 shrink-0 truncate text-xs whitespace-nowrap" title={field.label}>
                              {field.label}
                            </Label>
                            <div className="flex min-w-0 flex-1 justify-end">
                              <PreviewControlFieldInput
                                field={field}
                                value={controlState.values[field.id] ?? field.defaultValue}
                                compact={compact}
                                onValueChange={value => controlState.setValue(field.id, value)}
                              />
                            </div>
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
