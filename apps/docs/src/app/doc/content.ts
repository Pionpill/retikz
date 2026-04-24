export type DocItem = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: Array<DocItem>;
};

const mdxModules = import.meta.glob<string>('/doc/**/*.mdx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

export const getMdxSource = (lang: string, relativePath: string): string => {
  const key = `/doc/${lang}/${relativePath}`;
  return mdxModules[key] ?? '';
};

export const getDocTree = (lang: string): Array<DocItem> => {
  const prefix = `/doc/${lang}/`;
  const keys = Object.keys(mdxModules).filter(k => k.startsWith(prefix));

  const root: Array<DocItem> = [];

  for (const key of keys) {
    const parts = key.slice(prefix.length).split('/');
    let cursor = root;
    let cumulative = `doc/${lang}`;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      cumulative = `${cumulative}/${part}`;

      let node = cursor.find(n => n.name === part);
      if (!node) {
        node = {
          name: part,
          path: cumulative,
          type: isFile ? 'file' : 'dir',
          ...(isFile ? {} : { children: [] }),
        };
        cursor.push(node);
      }

      if (!isFile) cursor = node.children!;
    }
  }

  const sortTree = (items: Array<DocItem>) => {
    items.sort((a, b) => a.name.localeCompare(b.name));
    items.forEach(item => item.children && sortTree(item.children));
  };
  sortTree(root);

  return root;
};
