const SIZE_KEYS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
const MANY_CONTROL_FIELD_COUNT = 5;
const EXPANDED_CONTROL_PANEL_SIZE = 50;

/** 根据实际图形与 controls 测量结果给出预览布局建议 */
export const recommendPreviewLayout = input => {
  const {
    measuredSize,
    controlFieldCount,
    controlPanelOverflows,
    expandedPanelHasTwoColumns,
    expandedPanelOverflows,
    figureWidth,
    workspaceWidth,
  } = input;
  if (measuredSize === null) return { size: null, controlPanelDefaultSize: null };

  const measuredSizeIndex = SIZE_KEYS.indexOf(measuredSize);
  const shouldRaiseSize =
    controlFieldCount >= MANY_CONTROL_FIELD_COUNT &&
    measuredSizeIndex >= 0 &&
    measuredSizeIndex < SIZE_KEYS.indexOf('lg');
  const size = shouldRaiseSize ? SIZE_KEYS[measuredSizeIndex + 1] : measuredSize;
  const figureFitsExpandedPane = figureWidth <= workspaceWidth / 2;
  const canExpandPanel =
    shouldRaiseSize &&
    controlPanelOverflows &&
    expandedPanelHasTwoColumns &&
    !expandedPanelOverflows &&
    figureFitsExpandedPane;

  return {
    size,
    controlPanelDefaultSize: canExpandPanel ? EXPANDED_CONTROL_PANEL_SIZE : null,
  };
};
