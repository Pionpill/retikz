import { createStandardBundle } from '../capability';
import { FlexLayoutModule, GridLayoutModule, OverlayLayoutModule } from '../composites/layout';
import { AxesModule, FrameModule, GridModule, LegendModule } from '../composites/presentation';

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
