// Helper to parse and render chat text with embedded code blocks and formatting
import React from 'react';
import CodeBlock from './CodeBlock';

export default function ChatMessageContent({ content }) {
  if (!content) return null;

  // Split on code fences ```lang\ncode\n```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        text: content.substring(lastIndex, match.index),
      });
    }

    // The code block itself
    parts.push({
      type: 'code',
      language: match[1] || 'javascript',
      code: match[2].trimEnd(),
    });

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      text: content.substring(lastIndex),
    });
  }

  // If no code blocks found, render as formatted text
  if (parts.length === 0) {
    parts.push({ type: 'text', text: content });
  }

  return (
    <div className="flex flex-col gap-2 text-xs leading-relaxed">
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <CodeBlock
              key={index}
              language={part.language}
              code={part.code}
            />
          );
        }

        // Render paragraphs and formatted inline text
        const paragraphs = part.text.split('\n\n');
        return (
          <div key={index} className="space-y-2">
            {paragraphs.map((p, pIdx) => {
              if (!p.trim()) return null;
              // Check for bullet lists
              if (p.trim().startsWith('- ') || p.trim().startsWith('* ')) {
                const items = p
                  .split('\n')
                  .filter((line) => line.trim().startsWith('- ') || line.trim().startsWith('* '));
                return (
                  <ul key={pIdx} className="list-disc list-inside space-y-1 my-1 pl-1">
                    {items.map((it, itIdx) => (
                      <li key={itIdx}>
                        {renderInlineFormatted(it.replace(/^[-*]\s+/, ''))}
                      </li>
                    ))}
                  </ul>
                );
              }

              // Check for headings
              if (p.trim().startsWith('### ')) {
                return (
                  <h4 key={pIdx} className="font-semibold text-ink text-sm mt-2 mb-1">
                    {renderInlineFormatted(p.replace(/^###\s+/, ''))}
                  </h4>
                );
              }
              if (p.trim().startsWith('## ')) {
                return (
                  <h3 key={pIdx} className="font-bold text-ink text-sm mt-3 mb-1">
                    {renderInlineFormatted(p.replace(/^##\s+/, ''))}
                  </h3>
                );
              }

              return (
                <p key={pIdx} className="whitespace-pre-wrap">
                  {renderInlineFormatted(p)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Inline formatting for `inline code` and **bold**
function renderInlineFormatted(text) {
  const tokens = [];
  let remaining = text;
  let keyCounter = 0;

  // Split on inline code `code` and bold **bold**
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let match;
  let lastIdx = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(text.substring(lastIdx, match.index));
    }

    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code
          key={`c-${keyCounter++}`}
          className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface border border-line text-[#0099FF] dark:text-blue-400 font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={`b-${keyCounter++}`} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    }

    lastIdx = match.index + token.length;
  }

  if (lastIdx < text.length) {
    tokens.push(text.substring(lastIdx));
  }

  return tokens.length > 0 ? tokens : text;
}
