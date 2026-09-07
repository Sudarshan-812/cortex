/** Suggested starter prompts, derived from the workspace's document names. */
export function buildSuggestedPrompts(docNames: string[]): string[] {
  if (docNames.length === 0) return [
    'Summarize the key points',
    'What are the main topics?',
    'Explain the core concepts',
    'Find specific information',
  ]
  const first  = docNames[0].replace(/\.(pdf|docx|doc|txt|md|csv)$/i, '')
  const second = docNames[1]?.replace(/\.(pdf|docx|doc|txt|md|csv)$/i, '')
  return [
    `Summarize the key points from "${first}"`,
    `What are the main topics in "${first}"?`,
    second
      ? `Compare "${first}" with "${second}"`
      : `What conclusions can be drawn from "${first}"?`,
    'Find specific information across all documents',
  ]
}
