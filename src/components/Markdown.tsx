import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * The answer, set at reading size. Answers are mostly short paragraphs, often a table of alumni,
 * clubs or placement figures — so the measure, the leading and the table rhythm are the design
 * here, not the container. A wide table scrolls inside its own frame rather than widening the page.
 */
export function Markdown({ content }: { content: string }) {
  return (
    <div className="w-full min-w-0 break-words text-[16.5px] leading-[1.68] text-foreground/90 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-3.5">{children}</p>,
          ul: ({ children }) => <ul className="my-3.5 list-disc space-y-2 pl-5 marker:text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="my-3.5 list-decimal space-y-2 pl-5 marker:text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          h1: ({ children }) => <h3 className="mb-2 mt-6 font-display text-[19px] font-semibold text-foreground">{children}</h3>,
          h2: ({ children }) => <h3 className="mb-2 mt-6 font-display text-[18px] font-semibold text-foreground">{children}</h3>,
          h3: ({ children }) => <h4 className="mb-2 mt-5 font-display text-[16.5px] font-semibold text-foreground">{children}</h4>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          code: ({ children }) => (
            <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[14px]">{children}</code>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline decoration-primary/40 underline-offset-[3px] transition-colors hover:decoration-primary"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-5 max-w-full overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-[14.5px] leading-normal">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          th: ({ children }) => (
            <th className="whitespace-nowrap border-b border-border px-4 py-2.5 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/50 px-4 py-2.5 align-top">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
