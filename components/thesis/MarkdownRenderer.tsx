'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { BlockMath } from 'react-katex';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { StoredFile } from './types';

interface MarkdownRendererProps {
  content: string;
  files: StoredFile[];
  darkMode: boolean;
  className?: string;
}

export const MarkdownRenderer = ({ content, files, darkMode, className }: MarkdownRendererProps) => {
  const components = {
    img: ({ src, alt }: any) => {
      const file = files.find(f => f.name === src);
      const url = file ? file.data : src;
      return (
        <Image 
          src={url} 
          alt={alt || "Document Image"} 
          width={800}
          height={600}
          className="max-w-full h-auto rounded-lg shadow-md mx-auto block my-6" 
          referrerPolicy="no-referrer"
        />
      );
    },
    p: ({ children }: any) => {
      if (typeof children === 'string' && children.startsWith('$$') && children.endsWith('$$')) {
        return <BlockMath>{children.slice(2, -2)}</BlockMath>;
      }
      
      // Check if children contain an image or other block-like elements
      const hasImage = React.Children.toArray(children).some(
        (child: any) => child?.type === Image || child?.props?.node?.tagName === 'img'
      );

      if (hasImage) {
        return <div className="my-4">{children}</div>;
      }

      return <p className="mb-4 last:mb-0">{children}</p>;
    },
    h1: ({ children }: any) => {
      const id = String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h1 id={id}>{children}</h1>;
    },
    h2: ({ children }: any) => {
      const id = String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h2 id={id}>{children}</h2>;
    },
    h3: ({ children }: any) => {
      const id = String(children).toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      return <h3 id={id}>{children}</h3>;
    }
  };

  return (
    <div className={cn(
      "prose prose-slate max-w-none font-serif p-12 shadow-lg min-h-full border rounded-sm transition-colors duration-300",
      darkMode 
        ? "prose-invert bg-slate-900 border-slate-700" 
        : "bg-white border-slate-200",
      className
    )}>
      <ReactMarkdown components={components as any}>{content}</ReactMarkdown>
    </div>
  );
};
