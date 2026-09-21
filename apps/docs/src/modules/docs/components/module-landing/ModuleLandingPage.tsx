import { TriangleAlert } from 'lucide-react';
import type { CSSProperties, FC, ReactNode, RefObject } from 'react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { ComponentPreviewProps } from '../component-preview';
import { ComponentPreview, DemoLocationContext } from '../component-preview';
import { resolveModuleLandingPlacements } from './utils';
import type { ModuleLandingLayoutDemo } from './utils';

export type ModuleLandingGrid = {
  /** 切换至 12 列时的单元格边长。 */
  cellSize: number;
  /** 网格单元间距。 */
  gap: number;
  /** 12 列网格自适应拉伸的最大宽度。 */
  maxWidth: number;
  /** 各离散列数对应的最小行数。 */
  minRows: Record<ModuleLandingColumnCount, number>;
};

const MODULE_LANDING_COLUMN_COUNTS = [4, 6, 8, 12] as const;

type ModuleLandingColumnCount = (typeof MODULE_LANDING_COLUMN_COUNTS)[number];

/** 模块首页的默认网格轨道。 */
const MODULE_LANDING_GRID: ModuleLandingGrid = {
  cellSize: 100,
  gap: 12,
  maxWidth: 1900,
  minRows: { 4: 0, 6: 8, 8: 6, 12: 4 },
};

const MODULE_LANDING_CELL_SIZE_VARIABLE = '--module-landing-cell-size';

export type ModuleLandingDemo = ModuleLandingLayoutDemo & {
  /** ComponentPreview 解析 demo 所需的文档路径片段。 */
  location: Array<string>;
  /** ComponentPreview 配置。 */
  preview: ComponentPreviewProps;
};

export type ModuleLandingPageProps = {
  /** 页面顶部的小号定位文本。 */
  eyebrow?: string;
  /** 页面主标题。 */
  title: string;
  /** 页面主说明。 */
  description: string;
  /** 是否显示开发中提示。 */
  dev?: boolean;
  /** 模块入口区域的无障碍标签。 */
  navigationLabel?: string;
  /** 标题下方的模块入口内容，由页面按自身模块组合。 */
  navigation?: ReactNode;
  /** 页面中的真实能力演示。 */
  demos: ReadonlyArray<ModuleLandingDemo>;
  /** 演示区的网格轨道配置。 */
  grid?: ModuleLandingGrid;
  /** 页面底部说明。 */
  footer: ReactNode;
};

type ResolvedModuleLandingGrid = { columns: number; minRows: number };
type MeasuredModuleLandingGrid = ResolvedModuleLandingGrid & { cellSize: number };

/** 根据容器宽度选择离散列数：12 列在指定上限内继续填满宽度。 */
const resolveModuleLandingGrid = (width: number, grid: ModuleLandingGrid): MeasuredModuleLandingGrid => {
  const capacity = Math.floor((width + grid.gap) / (grid.cellSize + grid.gap));
  const columns = MODULE_LANDING_COLUMN_COUNTS.reduce<ModuleLandingColumnCount>(
    (resolvedColumns, candidateColumns) => (candidateColumns <= capacity ? candidateColumns : resolvedColumns),
    4,
  );
  const availableCellSize = Math.max(0, (width - (columns - 1) * grid.gap) / columns);
  const cellSize =
    columns === 12
      ? Math.max(0, (Math.min(width, grid.maxWidth) - (columns - 1) * grid.gap) / columns)
      : availableCellSize;
  return { columns, minRows: grid.minRows[columns], cellSize };
};

/** 监听容器宽度并计算当前网格轨道。 */
const useModuleLandingGrid = (
  grid: ModuleLandingGrid,
): { gridRef: RefObject<HTMLDivElement>; resolvedGrid: ResolvedModuleLandingGrid } => {
  const gridRef = useRef<HTMLDivElement>(null!);
  const [resolvedGrid, setResolvedGrid] = useState<ResolvedModuleLandingGrid>({ columns: 4, minRows: grid.minRows[4] });

  useLayoutEffect(() => {
    const container = gridRef.current;
    if (typeof ResizeObserver === 'undefined') return undefined;
    const updateGrid = (): void => {
      const nextGrid = resolveModuleLandingGrid(container.clientWidth, grid);
      container.style.setProperty(MODULE_LANDING_CELL_SIZE_VARIABLE, `${nextGrid.cellSize}px`);
      setResolvedGrid(currentGrid =>
        currentGrid.columns === nextGrid.columns && currentGrid.minRows === nextGrid.minRows
          ? currentGrid
          : { columns: nextGrid.columns, minRows: nextGrid.minRows },
      );
    };
    const observer = new ResizeObserver(updateGrid);
    observer.observe(container);
    updateGrid();
    return () => observer.disconnect();
  }, [grid]);

  return { gridRef, resolvedGrid };
};

/** 由介绍、模块入口、能力演示和底部说明组成的可复用落地页。 */
export const ModuleLandingPage: FC<ModuleLandingPageProps> = props => {
  const {
    eyebrow,
    title,
    description,
    dev = false,
    navigationLabel,
    navigation,
    demos,
    grid = MODULE_LANDING_GRID,
    footer,
  } = props;
  const { t } = useTranslation();
  const { gridRef, resolvedGrid } = useModuleLandingGrid(grid);
  const placements = useMemo(
    () => resolveModuleLandingPlacements(demos, resolvedGrid.columns),
    [demos, resolvedGrid.columns],
  );
  const placementRows = placements.reduce(
    (maxRows, { placement }) => Math.max(maxRows, placement.row + placement.rowSpan),
    0,
  );
  const gridRows = Math.max(resolvedGrid.minRows, placementRows);
  const cellSize = `var(${MODULE_LANDING_CELL_SIZE_VARIABLE}, ${grid.cellSize}px)`;

  return (
    <main data-slot="module-landing-page" className="flex min-h-full min-w-0 flex-1 flex-col">
      <div className="mx-auto flex min-w-0 w-full max-w-[1948px] flex-1 flex-col px-6 pt-20 pb-8">
        <div ref={gridRef} className="min-w-0 flex-1">
          <section data-slot="module-landing-hero" className="mx-auto max-w-5xl text-center">
            {eyebrow ? (
              <p data-slot="module-landing-eyebrow" className="text-sm font-medium text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            {dev ? (
              <Badge variant="secondary" className="mb-4 text-sm text-muted-foreground">
                <TriangleAlert />
                {t('docs.developmentNotice')}
              </Badge>
            ) : null}
            <h1 className={cn('text-5xl font-bold tracking-tight text-balance', eyebrow && 'mt-4')}>{title}</h1>
            <p
              className={cn(
                'mx-auto max-w-2xl text-base leading-7 text-pretty text-muted-foreground sm:text-lg',
                dev ? 'mt-4' : 'mt-6',
              )}
            >
              {description}
            </p>
          </section>

          {navigation ? (
            <nav
              data-slot="module-landing-navigation"
              aria-label={navigationLabel}
              className="mx-auto mt-8 flex max-w-5xl flex-wrap items-center justify-center gap-2"
            >
              {navigation}
            </nav>
          ) : null}

          <section data-slot="module-landing-demos" className="mt-24">
            <div className="min-w-0 w-full">
              <div
                className="mx-auto grid"
                style={{
                  gap: `${grid.gap}px`,
                  gridTemplateColumns: `repeat(${resolvedGrid.columns}, ${cellSize})`,
                  gridTemplateRows: `repeat(${gridRows}, ${cellSize})`,
                  height: 'fit-content',
                  width: 'fit-content',
                }}
              >
                {placements.map(({ demo, placement }) => {
                  const style: CSSProperties = {
                    gridColumn: `${placement.column + 1} / span ${placement.columnSpan}`,
                    gridRow: `${placement.row + 1} / span ${placement.rowSpan}`,
                  };

                  return (
                    <article
                      key={demo.id}
                      data-slot="module-landing-demo"
                      className="h-full [&>div]:!my-0 [&>div]:h-full [&>div>div]:h-full [&>div>div]:shadow-sm [&_[data-slot=preview-workspace]]:!h-full"
                      style={style}
                    >
                      <DemoLocationContext.Provider value={demo.location}>
                        <ComponentPreview
                          {...demo.preview}
                          previewClassName={cn('!p-0 !bg-card sm:!p-0', demo.preview.previewClassName)}
                          showBottomStartControls={false}
                        />
                      </DemoLocationContext.Provider>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        </div>

        <footer data-slot="module-landing-footer" className="mt-8 pt-4 text-center text-sm text-muted-foreground">
          {footer}
        </footer>
      </div>
    </main>
  );
};
