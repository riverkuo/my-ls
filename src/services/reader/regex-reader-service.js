import path from 'path';
import fsPromises from 'fs/promises';
import { BaseReader } from './base-reader-service.js';

/**
 * Regex 讀取策略
 * 功能：用 regex patterns 匹配檔案路徑，聯集且去重
 * positionals 就是 regex patterns
 * 可以有多個 patterns => 要用單引號，否則會被 shell 解析成
 * 先比對 patterns 是否合法
 * 合法的話，從相對路徑找往下找
 * 先搜尋出所有的 subpath(recursive)
 * 再比對 path 是否 match patterns
 * 要去除重複的
 * 如果目標是 folder，要列出第一層子層的內容
 * 處理 long 和 args
 */

export class RegexReader extends BaseReader {
  async read({ patterns }) {
    const cwd = process.cwd();
    const errorFiles = [];
    const allPaths = await this.scanDirectory(cwd, '');

    const matchedPaths = new Set();
    const patternMatched = new Map();

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern);
        patternMatched.set(pattern, false);

        for (const p of allPaths) {
          if (regex.test(p)) {
            matchedPaths.add(p);
            patternMatched.set(pattern, true);
          }
        }

        if (!patternMatched.get(pattern)) {
          errorFiles.push({ name: pattern, error: true });
        }
      } catch (err) {
        errorFiles.push({ name: pattern, error: true, errorType: 'invalid_regex' });
      }
    }

    const results = await Promise.all(
      Array.from(matchedPaths).map((relativePath) => {
        const fullPath = path.join(cwd, relativePath);
        return this.readPath(fullPath, relativePath);
      })
    );

    return {
      successFiles: results.filter((r) => !r.error),
      errorFiles: [...errorFiles, ...results.filter((r) => r.error)],
    };
  }

  async scanDirectory(baseDir, relativePath) {
    const results = [];
    const entries = await fsPromises.readdir(path.join(baseDir, relativePath), { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      results.push(entryRelativePath);

      if (entry.isDirectory()) {
        const subResults = await this.scanDirectory(baseDir, entryRelativePath);
        results.push(...subResults);
      }
    }

    return results;
  }
}
