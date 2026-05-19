export const coderDocs = {
  overview:
    'AI-powered code editing assistant. Generates edit proposals through the edit pipeline — no direct file mutation.\n\nUses the Provider Registry (OpenAI, Anthropic, Ollama, etc.) — never embeds provider-specific logic.',
  examples:
    '  /coder src/App.tsx Add error boundaries\n  /coder src/utils.ts Refactor validation\n  /c src/api.ts Add retry logic',
  workflows:
    '  1. /coder <filepath> <what to change>\n  2. AI reads the file + workspace context\n  3. Edit proposal flows through the edit pipeline\n  4. Workflow tab shows diff (green/red)\n  5. Click Apply to write, Reject to discard',
  troubleshooting:
    '  "No AI provider configured" — set VITE_LEMU_AI_API_KEY in .env\n  "AI returned no changes" — try a more specific prompt\n  "Could not read file" — check the path is correct',
  tips:
    '  Be specific about what you want changed.\n  Include context about patterns or style.\n  Use /coder without a filepath to ask general code questions.',
  limitations:
    '  Requires an external API key.\n  AI may produce incorrect or insecure code — review before applying.\n  No streaming response display in current version.',
};
