import React, { type ReactNode } from "react";

/**
 * Minimal markdown → React for record bodies and .md artifacts (Design Brief
 * §4.2 — "markdown rendered inline; anything else links out"). Deliberately
 * tiny and safe: everything is built as React nodes (auto-escaped), raw HTML
 * in the source renders as text, links are plain <a> with rel=noopener.
 * Supported: #-#### headings, paragraphs, - lists, ``` fences, tables,
 * **bold**, `code`, [text](url).
 */

function inline(text: string, key: number): ReactNode {
  const out: ReactNode[] = [];
  // tokenize: `code` | **bold** | [text](url)
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<code key={`${key}-${i++}`}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<b key={`${key}-${i++}`}>{m[2].slice(2, -2)}</b>);
    else if (m[3]) out.push(
      <a key={`${key}-${i++}`} href={m[5]} target="_blank" rel="noopener noreferrer">{m[4]}</a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0, k = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++; // past the closing fence
      blocks.push(<pre key={k++}><code>{buf.join("\n")}</code></pre>);
      continue;
    } else if (/^#{1,4} /.test(line)) {
      const level = line.match(/^#+/)![0].length;
      const Tag = (["h2", "h3", "h4", "h5"] as const)[level - 1]; // page owns h1
      blocks.push(<Tag key={k++}>{inline(line.replace(/^#+ /, ""), k)}</Tag>);
    } else if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(<li key={k++}>{inline(lines[i].slice(2), k)}</li>);
        i++;
      }
      blocks.push(<ul key={k++}>{items}</ul>);
      continue;
    } else if (line.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i].split("|").slice(1, -1).map((c) => c.trim());
        if (!cells.every((c) => /^:?-+:?$/.test(c))) rows.push(cells); // skip separator
        i++;
      }
      blocks.push(
        <div className="table-scroll" key={k++}>
          <table>
            {rows.length > 0 && (
              <thead><tr>{rows[0].map((c, j) => <th key={j}>{inline(c, k)}</th>)}</tr></thead>
            )}
            <tbody>
              {rows.slice(1).map((r, ri) => (
                <tr key={ri}>{r.map((c, j) => <td key={j}>{inline(c, k)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    } else {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim() && !/^(#{1,4} |- |\||```)/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      blocks.push(<p key={k++}>{inline(buf.join(" "), k)}</p>);
      continue;
    }
    i++;
  }
  return <div className="md">{blocks}</div>;
}
