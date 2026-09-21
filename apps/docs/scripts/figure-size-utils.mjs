const SIZE_KEYS = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
const DEFAULT_CONTROL_PANEL_SIZE = 25;
const EXPANDED_CONTROL_PANEL_SIZE = 50;
const CONTROL_HEIGHT_GAP_RATIO_LIMIT = 0.5;

const getControlMeasurement = (measurement, panelSize) =>
  measurement.controls.find(control => control.panelSize === panelSize) ?? null;

const getSizeAdjustmentLimit = size => (SIZE_KEYS.indexOf(size) <= SIZE_KEYS.indexOf('md') ? 2 : 1);

const canExpandControlPanel = measurement => {
  const expandedControl = getControlMeasurement(measurement, EXPANDED_CONTROL_PANEL_SIZE);

  return (
    measurement.figureWidth <= measurement.workspaceWidth / 2 &&
    expandedControl !== null &&
    expandedControl.columnCount > 1
  );
};

const getResult = (measurement, panelSize, heightGapRatio, rule) => ({
  size: measurement.size,
  controlPanelDefaultSize: panelSize === EXPANDED_CONTROL_PANEL_SIZE ? EXPANDED_CONTROL_PANEL_SIZE : null,
  heightGapRatio,
  remainingOverflow: getControlMeasurement(measurement, panelSize)?.remainingOverflow ?? null,
  rule,
});

/** 根据脚本采集的图形和 controls 实测结果给出预览布局建议 */
export const recommendPreviewLayout = input => {
  const { measuredSize, measurements } = input;
  if (measuredSize === null) {
    return {
      size: null,
      controlPanelDefaultSize: null,
      heightGapRatio: null,
      remainingOverflow: null,
      rule: 'no-demo-fit',
    };
  }

  const baseMeasurement = measurements.find(measurement => measurement.size === measuredSize);
  const baseControl = baseMeasurement && getControlMeasurement(baseMeasurement, DEFAULT_CONTROL_PANEL_SIZE);
  if (!baseMeasurement || !baseControl) {
    return {
      size: measuredSize,
      controlPanelDefaultSize: null,
      heightGapRatio: null,
      remainingOverflow: null,
      rule: 'no-controls',
    };
  }

  const baseSizeIndex = SIZE_KEYS.indexOf(measuredSize);
  const maximumSizeIndex = Math.min(baseSizeIndex + getSizeAdjustmentLimit(measuredSize), SIZE_KEYS.length - 1);
  const candidates = measurements
    .filter(measurement => {
      const sizeIndex = SIZE_KEYS.indexOf(measurement.size);
      return sizeIndex >= baseSizeIndex && sizeIndex <= maximumSizeIndex;
    })
    .sort((left, right) => SIZE_KEYS.indexOf(left.size) - SIZE_KEYS.indexOf(right.size));
  const heightGapRatio = baseControl.remainingOverflow / baseMeasurement.workspaceHeight;
  const defaultFit = candidates.find(
    measurement => getControlMeasurement(measurement, DEFAULT_CONTROL_PANEL_SIZE)?.remainingOverflow === 0,
  );
  const expandedFit = candidates.find(
    measurement =>
      canExpandControlPanel(measurement) &&
      getControlMeasurement(measurement, EXPANDED_CONTROL_PANEL_SIZE)?.remainingOverflow === 0,
  );

  if (heightGapRatio <= CONTROL_HEIGHT_GAP_RATIO_LIMIT && defaultFit) {
    return getResult(
      defaultFit,
      DEFAULT_CONTROL_PANEL_SIZE,
      heightGapRatio,
      defaultFit.size === measuredSize ? 'already-fits' : 'size-only',
    );
  }

  if (expandedFit) {
    return getResult(
      expandedFit,
      EXPANDED_CONTROL_PANEL_SIZE,
      heightGapRatio,
      expandedFit.size === measuredSize ? 'panel-width-only' : 'size-and-panel-width',
    );
  }

  const maximumMeasurement = candidates.at(-1) ?? baseMeasurement;
  const maximumPanelSize = canExpandControlPanel(maximumMeasurement)
    ? EXPANDED_CONTROL_PANEL_SIZE
    : DEFAULT_CONTROL_PANEL_SIZE;

  return getResult(maximumMeasurement, maximumPanelSize, heightGapRatio, 'maximum-control-space');
};
