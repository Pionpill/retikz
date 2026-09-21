import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { barChart, ir } from './bar-chart';

export const previewSource = { deriveIR: false };

const Demo: FC = () => <Layout ir={ir} extensions={{ composites: [barChart] }} />;

export default Demo;
