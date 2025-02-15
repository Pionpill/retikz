'use client';
import React, { FC } from 'react';
import { clientComponents } from './components';
import { MDXRemote, MDXRemoteProps } from 'next-mdx-remote';

const MDXClient: FC<MDXRemoteProps> = props => {
  return <MDXRemote {...props} components={clientComponents} />;
};

export default MDXClient;
