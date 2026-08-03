import { createStandardBundle } from '../capability';
import { FlexLayoutModule, GridLayoutModule, OverlayLayoutModule } from '../composites/layout';

/** FlexLayout、GridLayout 与 OverlayLayout 组成的显式布局 capability bundle */
export const StandardLayoutPreset = createStandardBundle([FlexLayoutModule, GridLayoutModule, OverlayLayoutModule]);
