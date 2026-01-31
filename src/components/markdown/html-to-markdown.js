import TurndownService from 'turndown';

import { htmlTags } from './html-tags';

const excludeTags = ['pre', 'code'];

const turndownService = new TurndownService({ codeBlockStyle: 'fenced', fence: '```' });

const filterTags = htmlTags.filter((item) => !excludeTags.includes(item));

/**
 * Custom rule
 * https://github.com/mixmark-io/turndown/issues/241#issuecomment-400591362
 */
turndownService.addRule('keep', {
  filter: filterTags,
  replacement(content, node) {
    const { isBlock, outerHTML } = node;

    return node && isBlock ? `\n\n${outerHTML}\n\n` : outerHTML;
  },
});

// ----------------------------------------------------------------------

export function htmlToMarkdown(html) {
  return turndownService.turndown(html);
}

// ----------------------------------------------------------------------

export function isMarkdownContent(content) {
  // Checking if the content contains Markdown-specific patterns
  const markdownPatterns = [
    /* Heading */
    /^#+\s/,
    /* List item */
    /^(\*|-|\d+\.)\s/,
    /* Code block */
    /^```/,
    /* Table */
    /^\|/,
    /* Unordered list */
    /^(\s*)[*+-] [^\r\n]+/,
    /* Ordered list */
    /^(\s*)\d+\. [^\r\n]+/,
    /* Image */
    /!\[.*?\]\(.*?\)/,
    /* Link */
    /\[.*?\]\(.*?\)/,
  ];

  // Checking if any of the patterns match
  return markdownPatterns.some((pattern) => pattern.test(content));
}
