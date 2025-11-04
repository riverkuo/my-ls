import { PathReader } from './strategies/path-reader-service.js';
import { RegexReader } from './strategies/regex-reader-service.js';
import { DirectoryReader } from './strategies/directory-reader-service.js';

export async function handleReadFiles({ positionals, longArgs, allArgs, regexArgs }) {
  //   if (positionals.length > 0 && regexArgs) {
  //     const reader = new RegexReader({ longArgs, allArgs });
  //     return await reader.read({ patterns: positionals });
  //   }

  if (positionals.length > 0) {
    const reader = new PathReader({ longArgs, allArgs });
    return await reader.read({ paths: positionals });
  }

  const reader = new DirectoryReader({ longArgs, allArgs });
  return await reader.read({ path: process.cwd() });
}
