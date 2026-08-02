import { createStandardBundle } from '../capability';
import { AxesModule } from '../composites/axes';
import { FlexLayoutModule } from '../composites/flex-layout';
import { FrameModule } from '../composites/frame';
import { GridModule } from '../composites/grid';
import { GridLayoutModule } from '../composites/grid-layout';
import { LegendModule } from '../composites/legend';
import { OverlayLayoutModule } from '../composites/overlay-layout';

/** 当前 Standard 版本全部已发布 capability 的显式 bundle */
export const StandardAllPreset = createStandardBundle([
  GridModule,
  AxesModule,
  FrameModule,
  FlexLayoutModule,
  GridLayoutModule,
  OverlayLayoutModule,
  LegendModule,
]);
