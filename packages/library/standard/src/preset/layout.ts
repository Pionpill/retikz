import { createStandardBundle } from '../capability';
import { FlexLayoutModule } from '../composites/flex-layout';
import { GridLayoutModule } from '../composites/grid-layout';
import { OverlayLayoutModule } from '../composites/overlay-layout';

/** FlexLayout、GridLayout 与 OverlayLayout 组成的显式布局 capability bundle */
export const StandardLayoutPreset = createStandardBundle([FlexLayoutModule, GridLayoutModule, OverlayLayoutModule]);
