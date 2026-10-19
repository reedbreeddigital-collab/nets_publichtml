import TurndownService from 'turndown'
import * as gfmPlugin from 'turndown-plugin-gfm'
import { marked } from 'marked'
import katex from 'katex'
import renderMathInElement from 'katex/contrib/auto-render'

// Configure Turndown with ATX headings, fenced code blocks, and custom rules
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
})

// Enable GFM tables in Turndown so HTML tables convert cleanly to Markdown grids
turndownService.use(gfmPlugin.tables)

// Support strikethrough (<del>, <s>)
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
})

// Preserve KaTeX math markup when converting from HTML back to Markdown
turndownService.addRule('katex', {
  filter: (node) => {
    return (
      node.nodeName === 'SPAN' &&
      (node.classList.contains('katex') || node.classList.contains('katex-display'))
    )
  },
  replacement: (content, node) => {
    const el = node as HTMLElement
    const annotation = el.querySelector('annotation')
    if (annotation && annotation.textContent) {
      const isDisplay = el.classList.contains('katex-display') || el.closest('.katex-display')
      const formula = annotation.textContent.trim()
      return isDisplay ? `\n\n$$\n${formula}\n$$\n\n` : `$${formula}$`
    }
    return content
  },
})

// Unwrap blog table wrapper cleanly
turndownService.addRule('blogTableWrapper', {
  filter: (node) => {
    return (
      node.nodeName === 'DIV' &&
      node.classList.contains('blog-table-wrapper')
    )
  },
  replacement: (content) => `\n\n${content.trim()}\n\n`,
})

// Configure marked with GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
})

// Custom marked extension for LaTeX / KaTeX math rendering ($...$ and $$...$$)
const mathExtension = {
  name: 'math',
  level: 'inline' as const,
  start(src: string) {
    const match = src.match(/\$|\\\[|\\\(/)
    return match ? match.index : -1
  },
  tokenizer(src: string) {
    // 1. Block display math: $$ ... $$ or \[ ... \]
    const blockMatch = /^(?:\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\])/.exec(src)
    if (blockMatch) {
      const text = blockMatch[1] ?? blockMatch[2]
      return {
        type: 'math',
        raw: blockMatch[0],
        text: text.trim(),
        display: true,
      }
    }

    // 2. Inline math: $ ... $ or \( ... \)
    // Guard against regular currency dollar notation like $50 or $100
    const inlineMatch = /^(?:\$(?!\s)([^\$\n]+?)(?<!\s)\$|\\\(([\s\S]+?)\\\))/.exec(src)
    if (inlineMatch) {
      const text = inlineMatch[1] ?? inlineMatch[2]
      return {
        type: 'math',
        raw: inlineMatch[0],
        text: text.trim(),
        display: false,
      }
    }
    return false
  },
  renderer(token: any) {
    try {
      return katex.renderToString(token.text, {
        displayMode: token.display,
        throwOnError: false,
      })
    } catch (err) {
      console.warn('KaTeX rendering error:', err)
      return token.raw
    }
  },
}

// Apply math extension and responsive table wrapping to marked
marked.use({
  extensions: [mathExtension],
  renderer: {
    table(token: any) {
      const tableHtml = marked.Renderer.prototype.table.call(this, token)
      return `<div class="blog-table-wrapper">\n${tableHtml}</div>\n`
    },
  },
})

/**
 * Converts HTML string to Markdown formatted string
 */
export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return ''
  try {
    return turndownService.turndown(html)
  } catch (err) {
    console.error('Error converting HTML to Markdown:', err)
    return html
  }
}

/**
 * Converts Markdown formatted string to clean HTML
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || !markdown.trim()) return ''
  try {
    return marked.parse(markdown, { async: false, gfm: true, breaks: true }) as string
  } catch (err) {
    console.error('Error converting Markdown to HTML:', err)
    return markdown
  }
}

/**
 * Normalizes blog post content so both HTML and Markdown (as well as plain text)
 * render with proper paragraph spacing, line breaks, headings, images, tables, and KaTeX math.
 */
export function formatBlogContent(raw?: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  try {
    return marked.parse(trimmed, { async: false, gfm: true, breaks: true }) as string
  } catch (err) {
    console.warn('Error formatting blog content with marked:', err)
    return trimmed
  }
}

/**
 * Auto-renders any KaTeX formulas inside a given DOM container element.
 * Useful for posts containing raw HTML or LaTeX expressions.
 */
export function renderKatexInElement(element: HTMLElement | null): void {
  if (!element) return
  try {
    renderMathInElement(element, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
      ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    })
  } catch (err) {
    console.warn('KaTeX auto-render error in element:', err)
  }
}

/**
 * Checks whether text contains HTML tags
 */
export function isHtmlContent(text: string): boolean {
  if (!text) return false
  const trimmed = text.trim()
  return /<(p|div|h[1-6]|ul|ol|li|blockquote|img|table|pre|code|strong|b|em|i|a|hr|br)\b[^>]*>/i.test(trimmed)
}

/**
 * Normalizes content based on target mode ('wysiwyg' expects HTML, 'markdown' expects Markdown)
 */
export function normalizeContentForMode(content: string, targetMode: 'wysiwyg' | 'markdown'): string {
  if (!content) return ''
  const hasHtml = isHtmlContent(content)
  
  if (targetMode === 'markdown') {
    return hasHtml ? htmlToMarkdown(content) : content
  } else {
    // WYSIWYG mode expects HTML
    return hasHtml ? content : markdownToHtml(content)
  }
}
