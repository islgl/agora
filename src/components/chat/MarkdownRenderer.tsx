import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import 'highlight.js/styles/github.css';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
      components={{
        code({ children, className, ...props }) {
          const isBlock = className?.startsWith('language-');
          if (isBlock) {
            return <CodeBlock className={className}>{children}</CodeBlock>;
          }
          return (
            <code
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[0.85em] font-mono text-foreground"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre({ children }) {
          return <>{children}</>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function CodeBlock({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const lang = className?.replace('language-', '') ?? 'code';

  const handleCopy = () => {
    const text = extractText(children);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="my-4 rounded-xl overflow-hidden"
      style={{ boxShadow: '0 0 0 1px var(--border)' }}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-[#30302e]">
        <span className="text-xs font-mono text-[#87867f]">{lang}</span>
        <button
          onClick={handleCopy}
          className="text-xs text-[#87867f] hover:text-[#b0aea5] transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <code
        className={`block overflow-x-auto px-4 py-3 text-sm font-mono bg-[#30302e] text-[#faf9f5] ${className ?? ''}`}
        style={{ lineHeight: 1.6 }}
      >
        {children}
      </code>
    </div>
  );
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as { props: { children?: React.ReactNode } };
    return extractText(el.props.children);
  }
  return '';
}
