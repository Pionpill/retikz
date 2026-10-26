import type { ApiReferenceLanguage } from './tex';

/** 已核对的能力分组，仅组织既有公开成员与 Schema */
export type ReferenceGroup = {
  title: Record<ApiReferenceLanguage, string>;
  members: ReadonlyArray<string>;
  schemas?: ReadonlyArray<string>;
};

/** 显式分组清单，生成时拒绝成员遗漏、未知或重复 */
export const referenceGroups: Readonly<Partial<Record<string, ReadonlyArray<ReferenceGroup>>>> = {
  'viz/plot/mark/interval': [
    {
      title: { zh: '组件属性', en: 'Component properties' },
      members: ['IntervalMarkProps', 'IRPlotIntervalMark'],
      schemas: ['IntervalMarkSchema'],
    },
  ],
  'viz/plot/mark/path': [
    {
      title: { zh: '组件属性', en: 'Component properties' },
      members: ['PathMarkProps', 'IRPlotPathMark'],
      schemas: ['PathMarkSchema'],
    },
  ],
  'viz/plot/mark/point': [
    {
      title: { zh: '组件属性', en: 'Component properties' },
      members: ['PointMarkProps', 'IRPlotPointMark'],
      schemas: ['PointMarkSchema'],
    },
  ],
  'viz/plot/channel': [
    {
      title: { zh: '通道定义', en: 'Channel definitions' },
      members: [
        'ChannelDefinitionKind',
        'defineChannel',
        'defineNodeChannel',
        'defineLabelChannel',
        'definePathChannel',
        'defineScopeChannel',
        'PositionChannelDefinition',
        'MarkChannelDefinition',
        'NodeChannelDefinition',
        'PathChannelDefinition',
        'ScopeChannelDefinition',
        'ChannelDefinition',
        'AnyChannelDefinition',
        'ChannelOutputSpace',
      ],
    },
    {
      title: { zh: '解析上下文与结果', en: 'Resolution context and results' },
      members: [
        'ChannelDefinitionResolveContext',
        'NodeChannelDefinitionResolveContext',
        'PathChannelDefinitionResolveContext',
        'ScopeChannelDefinitionResolveContext',
        'ChannelPaletteContext',
        'ChannelValue',
        'ChannelValueResolver',
        'ChannelBindingResolver',
        'ResolveLabel',
        'ChannelResolution',
        'MarkChannelResolution',
        'ScopeChannelResolution',
        'ScaleDescriptor',
        'MarkChannels',
        'LabelChannelDefinition',
        'LabelChannelDelivery',
        'LabelChannelTarget',
        'LabelHost',
      ],
    },
    {
      title: { zh: '属性交付', en: 'Property delivery' },
      members: [
        'NodeChannelDeliveryContext',
        'PathChannelDeliveryContext',
        'ScopeChannelDeliveryContext',
        'NodeChannelDelivery',
        'PathChannelDelivery',
        'ScopeChannelDelivery',
      ],
    },
    {
      title: { zh: '共享默认值', en: 'Shared defaults' },
      members: ['SIZE_MAX_RADIUS'],
    },
    {
      title: { zh: '定义构造', en: 'Definition factories' },
      members: ['ColorChannelDefinitionOptions', 'PlotPaint', 'makeColorChannelDefinition'],
    },
    {
      title: { zh: '字段与取值', en: 'Fields and values' },
      members: [
        'channelField',
        'channelScale',
        'markChannelEncoding',
        'FieldCollector',
        'channelValue',
        'labelOf',
        'MarkValueResolverOptions',
        'MarkValueResolution',
        'makeMarkValueResolver',
      ],
    },
  ],
  'viz/data/provenance': [
    {
      title: { zh: '行来源', en: 'Row provenance' },
      members: ['SOURCE_INDEX', 'SOURCE_INDICES', 'tagSourceIndex', 'readSourceIndex', 'readSourceIndices'],
    },
    {
      title: { zh: '记录配置', en: 'Recording options' },
      members: ['DataLineageOptions', 'DataSourceIdentityMode', 'DataSourceIdentityOptions', 'DataValueSampleOptions'],
    },
    {
      title: { zh: '事件与结果', en: 'Events and results' },
      members: [
        'DataSourceIdentity',
        'DataLineageEvent',
        'DataLineageSourceEvent',
        'DataLineageTransformStepEvent',
        'DataLineageFieldFlowEvent',
        'DataLineageReducerEvent',
        'DataLineageSelectorEvent',
        'DataLineageSampleEvent',
        'DataLineageSink',
        'DataLineageRun',
      ],
    },
  ],
  'kernel/components/layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Layout / LayoutProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'LayoutExtensions',
        'LayoutRetainedRuntimeOptions',
        'LayoutRuntimeOptions',
        'LayoutStaticRuntimeOptions',
        'LayoutRuntimeMode',
        'scene',
        'layer',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputLayer', 'InputScene', 'InputSceneChildren', 'InputSceneLayers'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRScene', 'IRViewBox'],
      schemas: ['SceneSchema', 'ViewBoxSchema'],
    },
  ],
  'kernel/components/node': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Node / NodeProps', 'Text / TextProps', 'Coordinate / CoordinateProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'node / InputNode',
        'coordinate / InputCoordinate',
        'InputNodeLabel',
        'InputNodeLabelBoundaryPosition',
        'InputNodeLabelPosition',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['BoundaryFitContext', 'NodeTextColor'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'BoundaryDefinition',
        'BoundaryDefinitionInput',
        'ShapeDefinition',
        'ShapeDefinitionInput',
        'ShapeCircumscribedGeometry',
        'BUILTIN_BOUNDARIES',
        'BUILTIN_SHAPES',
        'defineBoundary',
        'defineShape',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRCoordinate', 'IRNode', 'IRNodeLabel', 'IRNodeLayout', 'IRNodeStyle'],
      schemas: [
        'NodeSchema',
        'NodeStyleSchema',
        'NodeLayoutSchema',
        'NodeLabelSchema',
        'NodeLabelBoundaryPositionSchema',
        'NodeLabelPinSchema',
        'CoordinateSchema',
        'BoundarySchema',
        'BoundaryLabelSchema',
      ],
    },
  ],
  'kernel/components/path': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Path / PathProps', 'Draw / DrawProps', 'Step / StepProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'ArcStepProps',
        'AxisLineStepProps',
        'BendStepProps',
        'CirclePathStepProps',
        'CubicStepProps',
        'CurveStepProps',
        'CycleStepProps',
        'EllipsePathStepProps',
        'FoldStepProps',
        'LineStepProps',
        'MoveStepProps',
        'RectangleStepProps',
        'SmoothStepProps',
        'CanonicalPathLabelPlacement',
        'PathLabelGeometryOptions',
        'PathBoundaryLabelInput',
        'PathCompileContext',
        'PathCompileResult',
        'WayDSL',
        'WayItem',
        'DrawWay',
        'resolvePathLabelPlacement',
        'samplePathRoute',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['path / InputPath', 'InputStep'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'ArrowDefinition',
        'MarkDefinition',
        'MarkEmitContext',
        'PathDefinition',
        'definePath',
        'defineArrow',
        'defineMark',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'PathSchema',
        'StepSchema',
        'MoveStepSchema',
        'LineStepSchema',
        'AxisLineStepSchema',
        'FoldStepSchema',
        'CycleStepSchema',
        'CurveStepSchema',
        'CubicStepSchema',
        'BendStepSchema',
        'ArcStepSchema',
        'CirclePathStepSchema',
        'EllipsePathStepSchema',
        'RectangleStepSchema',
        'SmoothStepSchema',
        'PathLabelSchema',
        'PathArrowSchema',
        'PathArrowEndSchema',
        'MarkStyleSchema',
        'PathMarkPlacementSchema',
        'ArrowDetailSchema',
        'ArrowStyleSchema',
      ],
    },
  ],
  'kernel/components/scope': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Scope / ScopeProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['ScopeStyleProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['scope / InputScope'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: [
        'IRScope',
        'IRScopeAnchorPosition',
        'IRScopeDefaults',
        'IRScopePosition',
        'IRScopePositionTarget',
        'IRScopeProps',
      ],
      schemas: [
        'ScopeSchema',
        'ScopePositionSchema',
        'ScopeAnchorPositionSchema',
        'ScopePositionTargetSchema',
        'ScopeSelfPointSchema',
        'ScopeDefaultsSchema',
        'ClipSchema',
        'RectClipSchema',
      ],
    },
  ],
  'kernel/packages/foundation': [
    {
      title: {
        zh: '错误契约',
        en: 'Error contracts',
      },
      members: [
        'RetikzError',
        'RetikzFoundationError',
        'RetikzErrorOptions',
        'RetikzFoundationErrorCode',
        'isRetikzError',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '类型工具',
        en: 'Type utilities',
      },
      members: [
        'AssertEqual',
        'NonEmptyReadonlyArray',
        'OpenString',
        'ValueOf',
        'WithOptionalProperties',
        'WithRequiredProperties',
        'createOpenStringSchema',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '数据容器',
        en: 'Data containers',
      },
      members: ['JsonObject', 'JsonValue', 'assertPlainDataContainers', 'cloneAndFreezeJson', 'jsonStructuralEquals'],
      schemas: [],
    },
    {
      title: {
        zh: '校验与集合工具',
        en: 'Validation and collection utilities',
      },
      members: [
        'MergePropertiesOptions',
        'assertNonEmptyString',
        'assertPositiveNumber',
        'createReadonlyMap',
        'mergeProperties',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '颜色解析',
        en: 'Color parsing',
      },
      members: ['ParsedCssColor', 'StaticCssNamedColorHexByName', 'compositeOpaqueColor', 'parseStaticCssColor'],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'JsonValueSchema',
        'JsonObjectSchema',
        'NonBlankStringSchema',
        'PositiveNumberSchema',
        'NonNegativeNumberSchema',
        'PositiveIntegerSchema',
        'NonNegativeIntegerSchema',
        'NormalizedFractionSchema',
      ],
    },
  ],
  'kernel/packages/inspect': [
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'RetikzInspectError',
        'InspectionAppearanceContext',
        'InspectionCompileResult',
        'InspectionDiagnostic',
        'InspectionDiagnosticOrigin',
        'InspectionPlane',
        'InspectionPlaneEntry',
        'InspectionSelection',
        'InspectionSelectionRule',
        'InspectionSelectionTarget',
        'InspectorContext',
        'InspectorCoordinateSpace',
        'InspectorFragment',
        'InspectorKey',
        'InspectorOutput',
        'RetikzInspectErrorOptions',
        'CLIP_INSPECTOR_KEY',
        'ClipInspectOptionsSchema',
        'COORDINATE_INSPECTOR_KEY',
        'CoordinateInspectOptionsSchema',
        'NODE_INSPECTOR_KEY',
        'NodeInspectOptionsSchema',
        'PATH_INSPECTOR_KEY',
        'PathInspectOptionsSchema',
        'RetikzInspectErrorCode',
        'SCOPE_INSPECTOR_KEY',
        'ScopeInspectOptionsSchema',
        'compileInspectionToScene',
        'mergeInspectorRegistries',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'AnyInspectorDefinitionInput',
        'InspectorDefinitionInput',
        'InspectorRegistry',
        'createDefaultInspectorRegistry',
        'createInspectorRegistry',
        'defineInspector',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'InspectCoordinate / InspectCoordinateProps',
        'InspectLayout / InspectLayoutProps',
        'InspectNode / InspectNodeProps',
        'InspectPath / InspectPathProps',
        'InspectScope / InspectScopeProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'CreateInspectionVanillaDriverOptions',
        'InspectionVanillaAuthoringInput',
        'InspectionVanillaRequest',
        'createInspectionVanillaAuthoring',
        'createInspectionVanillaDriver',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'PathInspectOptionsSchema',
        'NodeInspectOptionsSchema',
        'ClipInspectOptionsSchema',
        'ScopeInspectOptionsSchema',
        'CoordinateInspectOptionsSchema',
      ],
    },
  ],
  'kernel/packages/math': [
    {
      title: { zh: '角度与扫描', en: 'Angles and sweeps' },
      members: [
        'AngleRange',
        'DEG_TO_RAD',
        'RAD_TO_DEG',
        'alignAngleSweep',
        'normalizeAngleRange',
        'normalizeDegrees',
        'normalizeSignedDegrees',
      ],
      schemas: [],
    },
    {
      title: { zh: '轮廓与圆角', en: 'Contours and fillets' },
      members: [
        'ArcSegment',
        'ContourCommand',
        'ContourSegment',
        'FilletSolution',
        'LineSegment',
        'buildContourCommands',
        'intersectContourRay',
        'solveContourFillets',
        'rectOutline',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '坐标变换',
        en: 'Coordinate transforms',
      },
      members: [
        'AffineMatrix',
        'applyAffine',
        'getAffineSimilarityScale',
        'isFiniteNonSingularAffine',
        'localToWorld',
        'multiplyAffine',
        'worldToLocal',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '形状与弧段',
        en: 'Shapes and arcs',
      },
      members: [
        'ArcBoundingCandidatesInput',
        'ArcSweepAngleInput',
        'Circle',
        'Ellipse',
        'EllipseArcAnglePointInput',
        'EllipseArcBoundingCandidatesInput',
        'EllipseCircumscribeMode',
        'circle',
        'ellipse',
        'polygon',
        'triangle',
        'collectArcBoundingCandidates',
        'collectEllipseArcBoundingCandidates',
        'convexHull',
        'isAngleWithinArcSweep',
        'pointAtArcAngle',
        'pointAtEllipseArcAngle',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '边界与尺寸',
        en: 'Bounds and dimensions',
      },
      members: [
        'AxisAlignedBounds',
        'BoundsHalfAxes',
        'BoundsInsets',
        'BoundsRect',
        'CenteredBox',
        'CenteredShape',
        'boundsOf',
        'boundsToRect',
        'centerOfBounds',
        'cornersOfBounds',
        'expandBounds',
        'halfAxesOfBounds',
        'isFiniteBoundsRect',
        'isPositiveBoundsRect',
        'mergeBounds',
        'rectToBounds',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '几何相交',
        en: 'Geometric intersections',
      },
      members: [
        'CircleCircleInput',
        'LineCircleInput',
        'LineLineInput',
        'RayArcIntersectionInput',
        'intersect',
        'intersectRayWithArc',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '曲线与采样',
        en: 'Curves and sampling',
      },
      members: [
        'CircularArcCurveSegment',
        'CubicBezierCurveSegment',
        'CubicSegment',
        'CurveApproximationOptions',
        'CurveParameterAtDistanceOptions',
        'CurveSegment',
        'CurveSegmentSample',
        'EllipseArcCurveSegment',
        'LineCurveSegment',
        'QuadraticBezierCurveSegment',
        'curve',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '向量与数值',
        en: 'Vectors and numbers',
      },
      members: [
        'Position',
        'Vector2',
        'AFFINE_IDENTITY',
        'DEFAULT_EPSILON',
        'point',
        'vector2',
        'isFiniteNumber',
        'isFinitePoint',
        'isInfiniteNumber',
        'lerp',
      ],
      schemas: [],
    },
  ],
  'kernel/packages/runtime': [
    {
      title: {
        zh: '数据源与变更',
        en: 'Sources and changes',
      },
      members: [
        'defineRuntimeSource',
        'RuntimeSourceDefinitionInput',
        'RuntimeSourceValueDefinitionInput',
        'RuntimeSourceDefinition',
        'RuntimeSourceToken',
        'createRuntimeSourceRegistry',
        'RuntimeSourceRegistry',
        'createRuntimeSourceInput',
        'RuntimeSourceInput',
        'createRuntimeSourceUpdate',
        'RuntimeSourceUpdate',
        'createRuntimeChangeSet',
        'RuntimeChangeSet',
        'RuntimeSourcePhase',
        'RuntimeSourceExecutionResult',
        'RuntimeSourceLifecycleDiagnostic',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '身份与索引',
        en: 'Identity and lookup',
      },
      members: [
        'createRuntimeIdentity',
        'RuntimeIdentity',
        'runtimeIdentityEquals',
        'createRuntimeIdentityLookup',
        'RuntimeIdentityLookup',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '计算定义与执行',
        en: 'Computation definitions and execution',
      },
      members: [
        'RuntimeComputationId',
        'defineRuntimeComputation',
        'RuntimeComputationDefinitionInput',
        'RuntimeComputationResultDefinitionInput',
        'RuntimeComputationDefinition',
        'RuntimeComputationToken',
        'createRuntimeComputationRegistry / RuntimeComputationRegistryInput',
        'RuntimeComputationRegistry',
        'RuntimeCandidateLookup',
        'RuntimeCandidateView',
        'RuntimeComputationContext',
        'RuntimeComputationPhase',
        'RuntimeComputationExecution',
        'RuntimeComputationKind',
        'RuntimeComputationWarningInput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '运行与快照',
        en: 'Runs and snapshots',
      },
      members: [
        'RuntimeRunOutcome',
        'RuntimeUpdateOutcome',
        'RuntimeCommitEvent',
        'createRuntime / RuntimeOptions',
        'Runtime',
        'RuntimeUpdateStrategy',
        'createRuntimeRevision',
        'RuntimeRevision',
        'RuntimeSnapshot',
        'RuntimeUpdate',
        'RuntimeResult',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行追踪',
        en: 'Execution tracing',
      },
      members: [
        'RuntimeComputationTraceReporter',
        'createRuntimeTraceReporter',
        'CreateRuntimeTraceReporterInput',
        'RuntimeTracePhaseDefinition',
        'RuntimeTraceReporter',
        'PerformanceTraceRecord',
        'PerformanceTraceSink',
        'PerformanceTraceOutcome',
        'PerformanceTraceDiagnostic',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '事务提交',
        en: 'Transaction commits',
      },
      members: [
        'defineRuntimeCommitParticipant',
        'RuntimeCommitParticipantDefinitionInput',
        'RuntimeCommitParticipant',
        'RuntimeCommitParticipantToken',
        'RuntimeParticipantCandidateLookup',
        'RuntimeParticipantCandidateView',
        'RuntimeParticipantContext',
        'RuntimePreparedCommit',
        'RuntimeParticipantTraceReporter',
        'RuntimeParticipantWarningInput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '错误与诊断',
        en: 'Errors and diagnostics',
      },
      members: [
        'RetikzRuntimeError',
        'RuntimeDiagnostic',
        'RetikzRuntimeErrorCode',
        'BuiltinRuntimeDiagnosticCode',
        'RuntimeDiagnosticPhase',
      ],
      schemas: [],
    },
  ],
  'kernel/packages/tex': [
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'LowerTexOptions',
        'MathJaxEngineOptions',
        'MathJaxLowerTexOptions',
        'MathJaxSvgEngine',
        'TexLoweringDiagnostic',
        'MathJaxExtension',
        'MathJaxProfile',
        'createLowerTex',
        'createMathJaxEngine',
        'createMathJaxLowerTex',
        'MathJaxLowerTexState',
        'useLowerTex',
      ],
      schemas: [],
    },
  ],
  'kernel/visual/animation': [
    {
      title: {
        zh: '预设与编排',
        en: 'Presets and orchestration',
      },
      members: [
        'AnimationPresetOptions',
        'CameraToOptions',
        'ColorShiftOptions',
        'LoopOptions',
        'ScaleInOptions',
        'SlideInOptions',
        'cameraTo',
        'colorShift',
        'drawOn',
        'fadeIn',
        'loop',
        'scaleIn',
        'slideIn',
        'stagger',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '动画声明',
        en: 'Animation declarations',
      },
      members: [
        'IRAnimationTrack',
        'IRKeyframe',
        'AnimationDirection',
        'AnimationFill',
        'AnimationTrigger',
        'AnimationEasing',
        'AnimationProperty',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '播放与扩展',
        en: 'Playback and extensions',
      },
      members: ['AnimationControls'],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'AnimationTrackSchema',
        'KeyframeSchema',
        'EasingSchema',
        'TriggerSchema',
        'EventTriggerSchema',
        'OriginSchema',
      ],
    },
  ],
  'kernel/visual/style': [
    {
      title: {
        zh: '图案',
        en: 'Patterns',
      },
      members: [
        'IRPatternLineStyle',
        'IRPatternLineStyleCycle',
        'IRPatternPaint',
        'PatternDefinition',
        'PatternEmitContext',
        'PatternEmitOutput',
        'PatternEmitResult',
        'BuiltinPatternShape',
        'definePattern',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '投影',
        en: 'Shadows',
      },
      members: ['IRDropShadow', 'ShadowPreset'],
      schemas: [],
    },
    {
      title: {
        zh: '混合',
        en: 'Blending',
      },
      members: ['BlendMode'],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'PatternPaintSchema',
        'PatternShapeNameSchema',
        'PatternLineStyleSchema',
        'PatternLineStyleOverrideSchema',
        'PatternLineStyleCycleSchema',
        'DropShadowSchema',
      ],
    },
  ],
  'library/extension/ribbon': [
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['RibbonCapContext', 'RibbonCapGeometry', 'RibbonWidthProfileContext'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'RibbonCapDefinition',
        'RibbonWidthProfileDefinitionInput',
        'RibbonPathDefinition',
        'createRibbonPathDefinition',
        'createRibbonProviderContribution',
        'defineRibbonCap',
        'defineRibbonWidthProfile',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: [
        'RibbonPathSchema',
        'RibbonPathOptionsSchema',
        'RibbonLabelSchema',
        'CenterlineRibbonPathOptionsSchema',
        'BoundaryRibbonPathOptionsSchema',
        'RibbonWidthSchema',
        'FixedRibbonWidthSchema',
        'TaperRibbonWidthSchema',
        'RibbonEndpointSchema',
        'StopsRibbonWidthSchema',
        'ProfileRibbonWidthSchema',
        'RibbonArcCapSchema',
        'RibbonFixedSamplingSchema',
        'RibbonAdaptiveSamplingSchema',
        'RibbonDirectionSchema',
      ],
    },
  ],
  'library/layout/flex-layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['FlexLayout / FlexLayoutProps', 'FlexLayoutItem / FlexLayoutItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'flexLayout / InputFlexLayout',
        'InputFlexLayoutItem',
        'FlexLayoutInputEmbedAdapter',
        'LayoutInputEmbedAdapters',
        'createFlexLayout / FlexLayoutInput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'FlexLayoutArtifact',
        'FlexLayoutItemInput',
        'FlexMainDistribution',
        'LayoutAxisSizeInput',
        'LayoutSizeInput',
        'FlexLayoutDirection',
        'FlexLayoutWrap',
        'LayoutAlignment',
        'LayoutAxisSizeKind',
        'LayoutDistribution',
        'LayoutItemKind',
        'LayoutOverflow',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRFlexLayout', 'IRFlexLayoutItem'],
      schemas: [
        'FlexLayoutSchema',
        'LayoutItemSchema',
        'LayoutInspectBoundsOptionsSchema',
        'LayoutInspectSpacingOptionsSchema',
        'BaseLayoutInspectOptionsSchema',
        'FlexLayoutInspectOptionsSchema',
      ],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['FlexLayoutDefinition', 'FlexLayoutProvider'],
      schemas: [],
    },
  ],
  'library/layout/grid-layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['GridLayout / GridLayoutProps', 'GridLayoutItem / GridLayoutItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'gridLayout / InputGridLayout',
        'InputGridLayoutItem',
        'GridLayoutInputEmbedAdapter',
        'createGridLayout / GridLayoutInput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'GridLayoutArtifact',
        'GridLayoutItemInput',
        'GridPlacementInput',
        'GridTrackBreadthInput',
        'GridTrackInput',
        'LayoutTrackArtifact',
        'GRID_LAYOUT_MAX_TRACKS_PER_AXIS',
        'GridAutoFlow',
        'GridOverlap',
        'LayoutTrackSourceKind',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGridLayout', 'IRGridLayoutItem'],
      schemas: ['GridLayoutSchema', 'GridLayoutInspectOptionsSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['GridLayoutDefinition', 'GridLayoutProvider'],
      schemas: [],
    },
  ],
  'library/layout/overlay-layout': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['OverlayLayout / OverlayLayoutProps', 'OverlayLayoutItem / OverlayLayoutItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'overlayLayout / InputOverlayLayout',
        'InputOverlayLayoutItem',
        'OverlayLayoutInputEmbedAdapter',
        'createOverlayLayout / OverlayLayoutInput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IROverlayLayout', 'IROverlayLayoutItem'],
      schemas: ['OverlayLayoutSchema', 'OverlayLayoutInspectOptionsSchema'],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'OverlayLayoutArtifact',
        'OverlayLayoutItemInput',
        'OverlayPlacementInput',
        'LayoutSizeParticipation',
        'OverlayPlacementKind',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['OverlayLayoutDefinition', 'OverlayLayoutProvider'],
      schemas: [],
    },
  ],
  'schematic/diagram/branch': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['BranchDiagram / BranchDiagramProps', 'BranchNode / BranchNodeProps', 'Branch / BranchProps'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'BranchDiagramLayoutHostProps',
        'BranchDiagramEmbedKind',
        'BranchDiagramArtifact',
        'BranchLayoutInput',
        'BranchLayoutNodeInput',
        'BranchLayoutNodeOutput',
        'BranchLayoutOutput',
        'BranchLayoutSegmentOutput',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'branchDiagram / BranchDiagramInputEmbedProps',
        'normalizeBranchDiagram / InputBranchDiagram',
        'InputBranch',
        'InputBranchNode',
        'BranchDiagramInputEmbedAdapter',
        'createBranchDiagramVanillaAdapters',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'branchDiagramDefinitionOptionsOf',
        'BranchDiagramDefinitionOptions',
        'BranchLayoutDefinition',
        'BranchDiagramProviderKey',
        'LanesBranchLayoutDefinition',
        'createBranchDiagramProvider',
        'createBranchDiagramProviderContribution',
        'defineBranchLayout',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRBranch', 'IRBranchDiagram', 'IRBranchLayoutIntent', 'IRBranchNode'],
      schemas: [
        'BranchDiagramSchema',
        'BranchNodeSchema',
        'BranchSchema',
        'BranchLayoutIntentSchema',
        'BranchNodeLayoutSchema',
      ],
    },
  ],
  'schematic/diagram/flow': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'FlowDiagram / FlowDiagramProps',
        'FlowEntity / FlowEntityProps',
        'FlowEntities / FlowEntitiesProps',
        'FlowGroup / FlowGroupProps',
        'FlowLayout / FlowLayoutProps',
        'FlowRelation / FlowRelationProps',
        'FlowRelations / FlowRelationsProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'flowDiagram / FlowDiagramInputEmbedProps',
        'normalizeFlowDiagram / InputFlowDiagram',
        'FlowDiagramInputEmbedAdapter',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'FlowBendRoute',
        'FlowBezierRoute',
        'FlowBezierRouting',
        'FlowDiagramArtifact',
        'FlowEndpointTarget',
        'FlowLayoutEndpoint',
        'FlowLayoutExecutionContext',
        'FlowLayoutLabelPlacement',
        'FlowLayoutRelationInput',
        'FlowLayoutRelationOutput',
        'FlowLayoutRoute',
        'FlowLayoutRouting',
        'FlowRoutePointsQuery',
        'FlowRoutingCapability',
        'FlowSmoothRoute',
        'FlowSmoothRouting',
        'getFlowLayoutCatalog',
        'routeFlowRelations',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'FlowDiagramDefinitionOptions',
        'FlowLayoutDefinition',
        'createFlowDiagramProviderContribution',
        'defineFlowLayout',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRFlowDiagram', 'IRFlowEndpoint'],
      schemas: [
        'FlowDiagramSchema',
        'FlowEntitySchema',
        'FlowGroupSchema',
        'FlowLayoutSchema',
        'FlowEndpointSchema',
        'FlowEndpointTargetSchema',
        'FlowRelationSchema',
        'FlowRoutingSchema',
        'FlowDefaultsSchema',
      ],
    },
  ],
  'schematic/graph/block': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'Block / BlockProps',
        'BlockHeader / BlockHeaderProps',
        'BlockSection / BlockSectionProps',
        'BlockRow / BlockRowProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'block / BlockInputEmbedProps',
        'blockHeader / BlockHeaderInputEmbedProps',
        'blockSection / BlockSectionInputEmbedProps',
        'blockRow / BlockRowInputEmbedProps',
        'normalizeBlock / InputBlock',
        'normalizeBlockHeader / InputBlockHeader',
        'normalizeBlockSection / InputBlockSection',
        'normalizeBlockRow / InputBlockRow',
        'BlockHeaderInputEmbedAdapter',
        'BlockInputEmbedAdapter',
        'BlockRowInputEmbedAdapter',
        'BlockSectionInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createBlock / BlockCreateOptions',
        'createBlockHeader / BlockHeaderCreateOptions',
        'createBlockSection / BlockSectionCreateOptions',
        'createBlockRow / BlockRowCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['CodeBlockComposeContext', 'CodeBlockTokens'],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'CodeBlockDefinition',
        'GraphDefinitionOptions',
        'createCodeBlockContribution',
        'createGraphDefinitions',
        'createGraphProviders',
        'defineCodeBlock',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: [
        'IRBlock',
        'IRBlockHeader',
        'IRBlockRow',
        'IRBlockSection',
        'IRBlockText',
        'IRCodeBlock',
        'IRCodeBlockProps',
        'IRCodeLogic',
        'IRCodeMethod',
        'IRCodeParameter',
        'IRCodeProperty',
        'IRCodeSignature',
      ],
      schemas: [
        'BlockSchema',
        'BlockHeaderSchema',
        'BlockSectionSchema',
        'BlockRowSchema',
        'BlockTextSchema',
        'CodeBlockPropsSchema',
        'CodeParameterSchema',
        'CodeSignatureSchema',
        'CodePropertySchema',
        'CodeMethodSchema',
        'CodeLogicSchema',
      ],
    },
  ],
  'schematic/graph/entity': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Entity / EntityProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'entity / EntityInputEmbedProps',
        'normalizeEntity / InputEntity',
        'EntityInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createEntity / EntityCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'EntityKindDefinition',
        'EntityPredicateDefinition',
        'EntityPredicateDefinitionInput',
        'EntityRoleDefinition',
        'GraphDefinitionOptions',
        'createGraphDefinitions',
        'createGraphProviders',
        'defineEntityKind',
        'defineEntityPredicate',
        'defineEntityRole',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGraphEntity'],
      schemas: ['EntitySchema', 'EntityRoleSchema'],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['BuiltinEntityRole', 'GraphStatus'],
      schemas: [],
    },
  ],
  'schematic/graph/relation': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Relation / RelationProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'relation / RelationInputEmbedProps',
        'normalizeRelation / InputRelation',
        'InputRelationEndpoint',
        'InputRelationRoute',
        'InputRelationWay',
        'RelationInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createRelation / RelationCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: [
        'GraphDefinitionOptions',
        'RelationKindDefinition',
        'RelationPredicateDefinition',
        'RelationPredicateDefinitionInput',
        'RelationRoleDefinition',
        'createGraphDefinitions',
        'createGraphProviders',
        'defineRelationKind',
        'defineRelationPredicate',
        'defineRelationRole',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: [
        'IRGraphRelation',
        'IRGraphRelationMarkerAppearance',
        'IRGraphRelationMarkerRecipe',
        'IRGraphRelationRoleTokenRecipe',
        'IRGraphRelationRouteStep',
        'IRGraphRelationStructureTokenOverrides',
      ],
      schemas: [
        'RelationSchema',
        'RelationRoleSchema',
        'RelationKindSchema',
        'RelationDirectionSchema',
        'GraphRelationMarkerAppearanceSchema',
        'GraphRelationRouteStepSchema',
      ],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['BuiltinRelationRole', 'GraphStatus', 'RelationDirection'],
      schemas: [],
    },
  ],
  'viz/data/model': [
    {
      title: {
        zh: '数据与字段声明',
        en: 'Data and field declarations',
      },
      members: [
        'ExternalDatasets',
        'ExternalRow',
        'FieldResolution',
        'IRDataFieldDefinition',
        'IRDataModel',
        'IRDataReference',
        'ParsedFieldValue',
        'ResolveField',
        'DataFieldType',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '字段格式',
        en: 'Field formats',
      },
      members: [
        'FieldFormat',
        'FieldFormatDefinition',
        'BUILTIN_FORMATS',
        'BuiltinDataFieldFormat',
        'defineFieldFormat',
        'resolveFormatRegistry',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '字段排序',
        en: 'Field ordering',
      },
      members: [
        'FieldOrderContext',
        'FieldOrderDefinition',
        'BUILTIN_FIELD_ORDERS',
        'BuiltinFieldOrderMode',
        'defineFieldOrder',
        'resolveCategoryDomain',
        'resolveFieldOrderRegistry',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '配置与校验',
        en: 'Configuration and validation',
      },
      members: [],
      schemas: ['DataReferenceSchema', 'DataModelSchema', 'FieldDefinitionSchema'],
    },
  ],
  'viz/data/transform': [
    {
      title: {
        zh: '变换声明',
        en: 'Transform declarations',
      },
      members: ['IRDataTransform', 'IRDataTransformDeclaration'],
      schemas: ['TransformSchema', 'DataTransformDeclarationSchema', 'ExternalTransformSchema'],
    },
    {
      title: {
        zh: '变换定义与实现',
        en: 'Transform definitions and implementations',
      },
      members: [
        'TransformDefinition',
        'TransformDefinitionInput',
        'AnyTransformDefinition',
        'TransformSemanticContext',
        'TransformImplementation',
        'AnyTransformImplementation',
        'AnySynchronousTransformImplementation',
        'TransformContext',
        'DEFAULT_TRANSFORM_CONTEXT',
        'defineTransform',
        'defineTransformImplementation',
        'extractTransformKind',
        'resolveTransformRegistry',
        'resolveTransformImplementationRegistry',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '行选择',
        en: 'Row selection',
      },
      members: [
        'IRDataSelectorOperation',
        'RowSelection',
        'RowSelectorDefinition',
        'AnyRowSelectorDefinition',
        'RowSelectorImplementation',
        'AnyRowSelectorImplementation',
        'AnySynchronousRowSelectorImplementation',
        'defineRowSelector',
        'defineRowSelectorImplementation',
        'resolveRowSelectorRegistry',
        'resolveRowSelectorImplementationRegistry',
      ],
      schemas: ['SelectorOperationSchema'],
    },
    {
      title: {
        zh: '统计归约',
        en: 'Statistical reduction',
      },
      members: [
        'IRDataReducerOperation',
        'IRDataReducerMetrics',
        'StatisticsReducerDefinition',
        'AnyStatisticsReducerDefinition',
        'StatisticsReducerImplementation',
        'AnyStatisticsReducerImplementation',
        'AnySynchronousStatisticsReducerImplementation',
        'defineStatisticsReducer',
        'defineStatisticsReducerImplementation',
        'extractStatisticOperation',
        'resolveStatisticsReducerRegistry',
        'resolveStatisticsReducerImplementationRegistry',
      ],
      schemas: ['ReducerOperationSchema', 'ReducerMetricsSchema'],
    },
    {
      title: {
        zh: '回归拟合',
        en: 'Regression fitting',
      },
      members: [
        'IRRegressionMethod',
        'RegressionPair',
        'RegressionModel',
        'RegressionResolution',
        'RegressionDefinition',
        'AnyRegressionDefinition',
        'RegressionImplementation',
        'AnyRegressionImplementation',
        'AnySynchronousRegressionImplementation',
        'defineRegression',
        'defineRegressionImplementation',
        'extractRegressionKind',
        'resolveRegression',
        'resolveRegressionRegistry',
        'resolveRegressionImplementationRegistry',
      ],
      schemas: ['RegressionMethodSchema'],
    },
    {
      title: {
        zh: '字段模型与阶段解析',
        en: 'Field models and stage resolution',
      },
      members: [
        'DataTransformModel',
        'DataTransformInputDescriptor',
        'DataTransformOutputDescriptor',
        'DataTransformOutputModel',
        'DataTransformFieldEffect',
        'DataTransformBindingClass',
        'DataTransformPhase',
        'DataTransformDependency',
        'DataTransformStage',
        'DataTransformResolution',
        'DataTransformResolveOptions',
        'collectTransformFields',
        'describeDataTransformInput',
        'resolveDataTransforms',
        'resolveDataTransformOutputModel',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '执行与调度',
        en: 'Execution and scheduling',
      },
      members: [
        'IRDataExecution',
        'DataInputBinding',
        'DataInputBindings',
        'DataTransformStageInput',
        'DataTransformExecutionRequirements',
        'DataTransformStageSupport',
        'DataTransformStageImplementation',
        'DataTransformImplementationProvider',
        'DataTransformProviderRegistration',
        'DataTransformRequestOptions',
        'DataTransformExecutionOptions',
        'DataTransformPreparation',
        'DataTransformSchedule',
        'DataTransformExecution',
        'DataTransformExecutor',
        'DataTransformResult',
        'DataTransformDiagnostic',
        'resolveDataExecution',
        'createDataTransformExecutor',
        'executeDataTransforms',
        'ingestDataTransformResult',
      ],
      schemas: ['DataExecutionSchema'],
    },
    {
      title: {
        zh: '同步调用',
        en: 'Synchronous calls',
      },
      members: [
        'applyTransforms',
        'ApplyTransformsOptions',
        'ApplyTransformsResult',
        'applyTransformsToDataView',
        'ApplyTransformsToDataViewResult',
      ],
      schemas: [],
    },
  ],
  'library/standard/collection/array': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Array / ArrayProps', 'ArrayItem / ArrayItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['array / InputArray', 'ArrayInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRArray', 'IRArrayCell', 'IRArrayIndexOptions', 'IRArrayIndexStyle'],
      schemas: ['ArraySchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['ArrayDefinition', 'ArrayProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createArray', 'getArrayCellId'],
      schemas: [],
    },
  ],
  'library/standard/collection/chain': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'Chain / ChainProps',
        'ChainCell / ChainCellProps',
        'ChainParallel / ChainParallelProps',
        'ChainBranch / ChainBranchProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['chain / InputChain', 'ChainInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRChain'],
      schemas: ['ChainSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['ChainDefinition', 'ChainProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createChain'],
      schemas: [],
    },
  ],
  'library/standard/collection/map': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Map / MapProps', 'MapEntry / MapEntryProps', 'MapKey / MapKeyProps', 'MapValue / MapValueProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['map / InputMap', 'MapInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRMap'],
      schemas: ['MapSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['MapDefinition', 'MapProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createMap'],
      schemas: [],
    },
  ],
  'library/standard/collection/matrix': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Matrix / MatrixProps', 'MatrixRow / MatrixRowProps', 'MatrixCell / MatrixCellProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['matrix / InputMatrix', 'MatrixInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRMatrix', 'IRMatrixAxisIndex'],
      schemas: ['MatrixSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['MatrixDefinition', 'MatrixProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createMatrix', 'getMatrixCellId'],
      schemas: [],
    },
  ],
  'library/standard/collection/queue': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Queue / QueueProps', 'QueueItem / QueueItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['queue / InputQueue', 'QueueInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRQueue'],
      schemas: ['QueueSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['QueueDefinition', 'QueueProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createQueue'],
      schemas: [],
    },
  ],
  'library/standard/collection/stack': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Stack / StackProps', 'StackItem / StackItemProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['stack / InputStack', 'StackInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRStack'],
      schemas: ['StackSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['StackDefinition', 'StackProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createStack'],
      schemas: [],
    },
  ],
  'library/standard/collection/tree': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Tree / TreeProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['tree / InputTree', 'TreeInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRTree'],
      schemas: ['TreeSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['TreeDefinition', 'TreeProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createTree'],
      schemas: [],
    },
  ],
  'library/standard/presentation/axes': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Axes / AxesProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['AxesInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['axes', 'AxesInput', 'createAxes'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRAxes'],
      schemas: ['AxesSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['AxesDefinition', 'AxesProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/frame': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Frame / FrameProps', 'FrameTitle / FrameTitleProps', 'FrameDescription / FrameDescriptionProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputFrame', 'FrameInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: [
        'frame',
        'frameDescription',
        'frameTitle',
        'FrameDescriptionInput',
        'FrameInput',
        'FrameTitleInput',
        'createFrame',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRFrame'],
      schemas: ['FrameSchema', 'FrameTitleSchema', 'FrameDescriptionSchema', 'FrameBorderSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['FrameDefinition', 'FrameProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/grid': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Grid / GridProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['GridInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['grid', 'GridInput', 'GridLineInput', 'createGrid'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGrid'],
      schemas: ['GridSchema', 'GridLineInputSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['GridDefinition', 'GridProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/legend': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: [
        'Legend / LegendProps',
        'LegendTitle / LegendTitleProps',
        'LegendItem / LegendItemProps',
        'LegendRamp / LegendRampProps',
        'LegendTick / LegendTickProps',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputLegend', 'LegendInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['legend', 'LegendArtifact', 'LegendCompileArtifact', 'LegendInput', 'createLegend'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRLegend', 'IRLegendItem', 'IRLegendItemsContent', 'IRLegendRampContent', 'IRLegendTick'],
      schemas: ['LegendSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['LegendDefinition', 'LegendProvider'],
      schemas: [],
    },
  ],
  'library/standard/presentation/surface': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Surface / SurfaceProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputSurface', 'InputSurfaceChild', 'SurfaceInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['surface', 'surfaceChild', 'SurfaceInput', 'createSurface'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRSurface'],
      schemas: ['SurfaceSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['SurfaceDefinition', 'SurfaceProvider'],
      schemas: [],
    },
  ],
  'library/standard/shape/arc-sector': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Arc / ArcProps', 'Sector / SectorProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputArc', 'InputSector', 'ArcInputEmbedAdapter', 'SectorInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRArc', 'IRSector'],
      schemas: ['ArcSchema', 'SectorSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['ArcDefinition', 'ArcProvider', 'SectorDefinition', 'SectorProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createArc', 'createSector'],
      schemas: [],
    },
  ],
  'library/standard/shape/circle-ellipse': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Circle / CircleProps', 'Ellipse / EllipseProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputCircle', 'InputEllipse', 'CircleInputEmbedAdapter', 'EllipseInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRCircle', 'IREllipse'],
      schemas: ['CircleSchema', 'EllipseSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['CircleDefinition', 'CircleProvider', 'EllipseDefinition', 'EllipseProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createCircle', 'createEllipse'],
      schemas: [],
    },
  ],
  'library/standard/shape/polygon': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Polygon / PolygonProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputPolygon', 'PolygonInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRPolygon'],
      schemas: ['PolygonSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['PolygonDefinition', 'PolygonProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createPolygon'],
      schemas: [],
    },
  ],
  'library/standard/shape/rectangle': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Rectangle / RectangleProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputRectangle', 'RectangleInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRRectangle'],
      schemas: ['RectangleSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['RectangleDefinition', 'RectangleProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createRectangle'],
      schemas: [],
    },
  ],
  'library/standard/shape/star': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Star / StarProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: ['InputStar', 'StarInputEmbedAdapter'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRStar'],
      schemas: ['StarSchema'],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['StarDefinition', 'StarProvider'],
      schemas: [],
    },
    {
      title: {
        zh: '执行与辅助契约',
        en: 'Execution and supporting contracts',
      },
      members: ['createStar'],
      schemas: [],
    },
  ],
  'schematic/graph/group': [
    {
      title: {
        zh: '组件声明',
        en: 'Component declarations',
      },
      members: ['Group / GroupProps'],
      schemas: [],
    },
    {
      title: {
        zh: '直接调用',
        en: 'Direct calls',
      },
      members: [
        'group / GroupInputEmbedProps',
        'normalizeGroup / InputGroup',
        'GroupInputEmbedAdapter',
        'createGraphVanillaAdapters',
        'createGroup / GroupCreateOptions',
      ],
      schemas: [],
    },
    {
      title: {
        zh: '扩展定义与注册',
        en: 'Extension definitions and registration',
      },
      members: ['GraphDefinitionOptions', 'createGraphDefinitions', 'createGraphProviders'],
      schemas: [],
    },
    {
      title: {
        zh: '持久化配置',
        en: 'Persistent configuration',
      },
      members: ['IRGroup', 'IRGroupCaption', 'IRGroupCaptionText'],
      schemas: [
        'GroupSchema',
        'GroupCaptionSchema',
        'GroupCaptionTextSchema',
        'GroupCaptionSideSchema',
        'GroupCaptionDirectionSchema',
      ],
    },
  ],
};
