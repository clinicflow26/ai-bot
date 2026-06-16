import React from "react";

/**
 * Split text segment by inline codes (`code`) and boldings (**bold**)
 */
function formatTextSegments(text: string): React.ReactNode[] {
  // Match bold accents "**some text**" or inline code "`arg`"
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  const parts = text.split(regex);
  
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-zinc-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="mx-1 px-1.5 py-0.5 rounded bg-zinc-950 text-emerald-400 font-mono text-xs border border-zinc-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

/**
 * Render Markdown helper. Maps common tags like headers, bullet lists, 
 * numbered lists, and triple-backtick block code snippets nicely.
 */
export function renderMarkdown(content: string): React.ReactNode {
  if (!content) return null;

  // Split content by main code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-1 text-sm text-zinc-200">
      {parts.map((part, partIdx) => {
        // Handle Code Blocks
        if (part.startsWith("```")) {
          const lines = part.split("\n");
          // Extract first line language (e.g. ```typescript)
          const firstLine = lines[0];
          const language = firstLine.slice(3).trim() || "code";
          
          // Get content between triple backticks
          const codeLines = lines.slice(1);
          if (codeLines[codeLines.length - 1] === "```") {
            codeLines.pop();
          } else {
            // If the code block is trailing/cut off
            const lastLine = codeLines[codeLines.length - 1];
            if (lastLine && lastLine.endsWith("```")) {
              codeLines[codeLines.length - 1] = lastLine.slice(0, -3);
            }
          }
          
          const code = codeLines.join("\n");

          const handleCopy = () => {
            navigator.clipboard.writeText(code);
          };

          return (
            <div
              key={partIdx}
              className="my-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 font-mono text-xs md:text-sm shadow-xl"
            >
              <div className="flex items-center justify-between bg-zinc-900 px-4 py-1.5 border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400 select-none">
                <span>{language}</span>
                <button
                  id={`copy-code-${partIdx}`}
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-zinc-100 transition-colors py-0.5 px-1.5 rounded bg-zinc-950/40 hover:bg-zinc-950 duration-150 cursor-pointer text-[10px]"
                >
                  Copy Code
                </button>
              </div>
              <pre className="overflow-x-auto p-4 text-zinc-300 leading-relaxed font-mono select-text">
                <code className="block select-text whitespace-pre">{code}</code>
              </pre>
            </div>
          );
        }

        // Handle paragraphs and nested lines
        const blockLines = part.split("\n");
        let isInsideList = false;
        let listItems: React.ReactNode[] = [];
        let isInsideNumList = false;
        let numListItems: React.ReactNode[] = [];

        const elements: React.ReactNode[] = [];

        const flushLists = (keyPrefix: string) => {
          if (isInsideList && listItems.length > 0) {
            elements.push(
              <ul key={`${keyPrefix}-ul`} className="my-2 space-y-1 list-disc pl-5">
                {...listItems}
              </ul>
            );
            listItems = [];
            isInsideList = false;
          }
          if (isInsideNumList && numListItems.length > 0) {
            elements.push(
              <ol key={`${keyPrefix}-ol`} className="my-2 space-y-1 list-decimal pl-5">
                {...numListItems}
              </ol>
            );
            numListItems = [];
            isInsideNumList = false;
          }
        };

        blockLines.forEach((line, lineIdx) => {
          const trimmed = line.trim();
          const key = `p-${partIdx}-${lineIdx}`;

          if (!trimmed) {
            flushLists(key);
            elements.push(<div key={key} className="h-2" />);
            return;
          }

          // Headers
          if (trimmed.startsWith("### ")) {
            flushLists(key);
            elements.push(
              <h3 key={key} className="text-sm md:text-base font-semibold text-zinc-100 mt-4 mb-2">
                {formatTextSegments(trimmed.slice(4))}
              </h3>
            );
            return;
          }
          if (trimmed.startsWith("## ")) {
            flushLists(key);
            elements.push(
              <h2 key={key} className="text-base md:text-lg font-bold text-zinc-50 mt-5 mb-2 border-b border-zinc-800 pb-1">
                {formatTextSegments(trimmed.slice(3))}
              </h2>
            );
            return;
          }
          if (trimmed.startsWith("# ")) {
            flushLists(key);
            elements.push(
              <h1 key={key} className="text-lg md:text-xl font-extrabold text-white mt-6 mb-3">
                {formatTextSegments(trimmed.slice(2))}
              </h1>
            );
            return;
          }

          // Bullet Points
          if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
            if (isInsideNumList) flushLists(key);
            isInsideList = true;
            listItems.push(
              <li key={`li-${key}`} className="text-sm text-zinc-300 leading-relaxed pl-1">
                {formatTextSegments(trimmed.slice(2))}
              </li>
            );
            return;
          }

          // Numbered lists
          const numListMatch = trimmed.match(/^(\d+)\.\s(.*)/);
          if (numListMatch) {
            if (isInsideList) flushLists(key);
            isInsideNumList = true;
            numListItems.push(
              <li key={`nli-${key}`} className="text-sm text-zinc-300 leading-relaxed pl-1">
                {formatTextSegments(numListMatch[2])}
              </li>
            );
            return;
          }

          // Base paragraph
          flushLists(key);
          elements.push(
            <p key={key} className="text-sm text-zinc-300 leading-relaxed my-1.5">
              {formatTextSegments(line)}
            </p>
          );
        });

        flushLists(`flush-end-${partIdx}`);

        return <React.Fragment key={partIdx}>{elements}</React.Fragment>;
      })}
    </div>
  );
}
