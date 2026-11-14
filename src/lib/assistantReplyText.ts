// Replies are shown as plain React text. Remove model-generated Markdown emphasis
// without interpreting HTML, URLs, or executable content.
export function assistantReplyText(value: string): string {
  return value
    .replace(/\\([*`_])/g, '$1')
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1')
    .trim();
}
