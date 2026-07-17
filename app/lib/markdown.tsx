import React from "react";

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noreferrer"
          className="text-[var(--tint)] underline-offset-2 hover:underline"
        >
          {link[1]}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/** Render assistant/user prose with headings, lists, quotes — commercial markdown lite */
export function MarkdownBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // headings
    const h = line.match(/^(#{1,3})\s+(.+)$/);
    if (h) {
      const level = h[1].length;
      const cls =
        level === 1
          ? "mt-4 mb-2 text-[18px] font-semibold tracking-tight"
          : level === 2
            ? "mt-3 mb-1.5 text-[16px] font-semibold tracking-tight"
            : "mt-2.5 mb-1 text-[14px] font-semibold";
      nodes.push(
        <p key={key++} className={cls}>
          {renderInline(h[2])}
        </p>
      );
      i += 1;
      continue;
    }

    // unordered list block
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ul key={key++} className="my-2 space-y-1.5 pl-5">
          {items.map((item, j) => (
            <li key={j} className="list-disc marker:text-[var(--tint)]">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i += 1;
      }
      nodes.push(
        <ol key={key++} className="my-2 list-decimal space-y-1.5 pl-5 marker:text-[var(--fg-muted)]">
          {items.map((item, j) => (
            <li key={j}>{renderInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // blockquote
    if (line.startsWith("> ")) {
      const quotes: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        quotes.push(lines[i].slice(2));
        i += 1;
      }
      nodes.push(
        <blockquote
          key={key++}
          className="my-2 border-l-2 border-[var(--tint)] pl-3 text-[var(--fg-secondary)]"
        >
          {quotes.map((q, j) => (
            <p key={j} className={j ? "mt-1" : ""}>
              {renderInline(q)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // paragraph (merge consecutive plain lines)
    const para: string[] = [line];
    i += 1;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,3}\s+/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !lines[i].startsWith("> ")
    ) {
      para.push(lines[i]);
      i += 1;
    }
    nodes.push(
      <p key={key++} className="my-1.5">
        {renderInline(para.join(" "))}
      </p>
    );
  }

  return <div className="msg-prose">{nodes}</div>;
}
