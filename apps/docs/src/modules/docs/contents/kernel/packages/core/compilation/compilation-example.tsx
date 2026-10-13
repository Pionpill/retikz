import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { compilationExample } from './compilation-example.data';

/** 展示正文所追踪的同一份 IR */
const CompilationExample: FC = () => <Layout ir={compilationExample} style={{ maxWidth: '100%', height: 'auto' }} />;

export default CompilationExample;
