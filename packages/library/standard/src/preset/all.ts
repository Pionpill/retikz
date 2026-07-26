import { createStandardBundle } from '../capability';
import { AxesModule } from '../composites/axes';
import { FrameModule } from '../composites/frame';
import { GridModule } from '../composites/grid';

/** 当前 Standard 版本全部已发布 capability 的显式 bundle */
export const StandardAllPreset = createStandardBundle([GridModule, AxesModule, FrameModule]);
