import { Layout } from '@retikz/react';
import { List } from '@retikz/standard-react/container';

import { defineControlledPreview } from '@/modules/docs/preview';

import { previewControlContract } from './list-data.controls';

/** Fallback controls for preview registration. */
export const previewControls = previewControlContract.controls;
const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Layout>
    <List
      data={['a', 'a', null, { ready: false }, [1, { active: true }]]}
      dataObjectDisplay={values.dataObjectDisplay}
      layout={{ width: 'content' }}
    />
  </Layout>
));
export const previewSource = controlledPreview.source;
const Demo = controlledPreview.Component;
export default Demo;
