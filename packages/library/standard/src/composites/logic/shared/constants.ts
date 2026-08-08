/** Standard logic composite discriminators that still own layout or routing */
export const LogicCompositeType = {
  LogicFrame: 'logicFrame',
  Connector: 'connector',
  Callout: 'callout',
} as const;

/** Connector role vocabulary */
export const ConnectorRole = {
  Flow: 'flow',
  Branch: 'branch',
  Dependency: 'dependency',
  Feedback: 'feedback',
} as const;

/** Connector route variants */
export const ConnectorRouteKind = {
  Straight: 'straight',
  Polyline: 'polyline',
  Orthogonal: 'orthogonal',
  Quadratic: 'quadratic',
  Cubic: 'cubic',
  Bend: 'bend',
} as const;

/** Orthogonal route direction patterns */
export const ConnectorOrthogonalPattern = {
  HorizontalVertical: 'hv',
  VerticalHorizontal: 'vh',
  HorizontalVerticalHorizontal: 'hvh',
  VerticalHorizontalVertical: 'vhv',
} as const;

/** Bend route side direction */
export const ConnectorBendDirection = {
  Left: 'left',
  Right: 'right',
} as const;

/** Callout placement sides */
export const CalloutSide = {
  Top: 'top',
  Right: 'right',
  Bottom: 'bottom',
  Left: 'left',
} as const;
