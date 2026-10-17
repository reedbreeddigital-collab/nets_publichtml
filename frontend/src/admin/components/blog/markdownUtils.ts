import TurndownService from 'turndown'
import { marked } from 'marked'

// Configure Turndown with ATX headings, fenced code blocks, and custom rules
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
})

// Support strikethrough (<del>, <s>)
turndownService.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
})

// Configure marked with GitHub Flavored Markdown
marked.setOptions({
  gfm: true,
  breaks: true,
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
    return marked.parse(markdown, { async: false }) as string
  } catch (err) {
    console.error('Error converting Markdown to HTML:', err)
    return markdown
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
