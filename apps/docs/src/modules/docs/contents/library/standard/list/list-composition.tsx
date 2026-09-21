import { Layout } from '@retikz/react';
import { List, ListItem, Map } from '@retikz/standard-react';
import type { FC } from 'react';

const ListComposition: FC = () => (
  <Layout>
    <List layout={{ gap: 4 }}>
      <ListItem text="A" />
      <ListItem id="record" style={{ fill: 'dodgerblue' }}>
        <Map entries={[{ key: 'id', value: 'B' }]} />
      </ListItem>
    </List>
  </Layout>
);
export default ListComposition;
