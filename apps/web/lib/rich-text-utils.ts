/**
 * Utilities for formatting, converting and serializing rich text descriptions.
 */

function escapeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Extracts plain text from an HTML string for summaries or fallback indexing.
 */
export function extractPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

/**
 * Normalizes any work item description_json payload (legacy Notion blocks,
 * Doc/Tiptap structure, HTML string, or plain text) into a valid HTML string
 * suitable for RichTextEditor.
 */
export function formatDescriptionToHtml(descriptionInput: any): string {
  if (!descriptionInput) {
    return "";
  }

  // 0. If a WorkItem object was passed directly with description_html
  if (typeof descriptionInput === "object" && typeof descriptionInput.description_html === "string") {
    return descriptionInput.description_html;
  }

  const descriptionJson = descriptionInput;

  // 1. Direct HTML or plain text string
  if (typeof descriptionInput === "string") {
    const trimmed = descriptionInput.trim();
    if (!trimmed) return "";
    // If it already contains HTML tags
    if (/<[a-z][\s\S]*>/i.test(trimmed)) {
      return trimmed;
    }
    // Plain text with line breaks
    return trimmed
      .split("\n")
      .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
      .join("");
  }

  // 2. Array of Notion-style DocBlocks
  if (Array.isArray(descriptionJson)) {
    if (descriptionJson.length === 0) return "";
    return descriptionJson
      .map((block: any) => {
        const content = block?.content ?? "";
        const escaped = escapeHtml(content);
        switch (block?.type) {
          case "heading_1":
            return `<h1>${escaped}</h1>`;
          case "heading_2":
          case "heading":
            return `<h2>${escaped}</h2>`;
          case "heading_3":
            return `<h3>${escaped}</h3>`;
          case "bullet_list":
            return `<ul><li>${escaped}</li></ul>`;
          case "numbered_list":
            return `<ol><li>${escaped}</li></ol>`;
          case "todo":
            return `<p>${block.checked ? "☑" : "☐"} ${escaped}</p>`;
          case "quote":
            return `<blockquote>${escaped}</blockquote>`;
          case "code":
            return `<pre><code>${escaped}</code></pre>`;
          case "callout":
            return `<blockquote><strong>Nota:</strong> ${escaped}</blockquote>`;
          case "divider":
            return `<hr />`;
          case "paragraph":
          default:
            return escaped ? `<p>${escaped}</p>` : "<p><br></p>";
        }
      })
      .join("");
  }

  // 3. Object with explicit HTML
  if (typeof descriptionJson === "object" && descriptionJson !== null) {
    if (typeof descriptionJson.html === "string") {
      return descriptionJson.html;
    }

    // Object with plain text
    if (typeof descriptionJson.text === "string") {
      return `<p>${escapeHtml(descriptionJson.text)}</p>`;
    }

    // Tiptap / ProseMirror Document structure ({ type: "doc", content: [...] })
    if (Array.isArray(descriptionJson.content)) {
      return descriptionJson.content
        .map((node: any) => {
          if (node.type === "paragraph") {
            const innerText = Array.isArray(node.content)
              ? node.content.map((c: any) => c.text || "").join("")
              : node.text || "";
            return innerText ? `<p>${escapeHtml(innerText)}</p>` : "<p><br></p>";
          }
          if (node.type === "heading") {
            const level = node.attrs?.level || 2;
            const innerText = Array.isArray(node.content)
              ? node.content.map((c: any) => c.text || "").join("")
              : node.text || "";
            return `<h${level}>${escapeHtml(innerText)}</h${level}>`;
          }
          return "";
        })
        .join("");
    }
  }

  return "";
}
