'use client';
import dynamic from 'next/dynamic';

const TikZ = dynamic(() => import('@retikz/core').then(mod => mod.TikZ), { ssr: false });
const Scope = dynamic(() => import('@retikz/core').then(mod => mod.Scope), { ssr: false });
const Node = dynamic(() => import('@retikz/core').then(mod => mod.Node), { ssr: false });
const PathNode = dynamic(() => import('@retikz/core').then(mod => mod.PathNode), { ssr: false });
const Draw = dynamic(() => import('@retikz/core').then(mod => mod.Draw), { ssr: false });

const components = { TikZ, Scope, Node, PathNode, Draw };

export default components;
