import { BaseReader } from './base-reader-service.js';
import { readDirectory } from './shared.js';
import { PathReader } from './path-reader-service.js';

/**
 * Regex 讀取策略
 * 處理：my-ls -r 'e.*' '.*\.txt'
 * 功能：用 regex patterns 匹配檔案名，聯集且去重
 */
export class RegexReader extends BaseReader {
  async read({ patterns }) {
    // 1. 讀取當前目錄（只讀一次）
    const currentFiles = await readDirectory({
      path: process.cwd(),
      longArgs: false,
      allArgs: this.allArgs,
    });

    // 2. 驗證並建立 regex
    const { validRegexes, invalidPatterns } = this.validatePatterns(patterns);

    // 3. 匹配檔案
    const { matchedFiles, unmatchedPatterns } = this.matchFiles(currentFiles, validRegexes);

    // 4. 讀取匹配檔案的完整資訊
    const pathReader = new PathReader({
      longArgs: this.longArgs,
      allArgs: this.allArgs,
    });

    const successFiles = [];
    for (const filename of matchedFiles) {
      const result = await pathReader.readPath(filename);
      if (!result.error) {
        successFiles.push(result);
      }
    }

    // 5. 組合錯誤（不合法的 + 沒匹配到的）
    const errorFiles = [
      ...invalidPatterns.map((pattern) => ({ name: pattern, error: true })),
      ...unmatchedPatterns.map((pattern) => ({ name: pattern, error: true })),
    ];

    return { successFiles, errorFiles };
  }

  validatePatterns(patterns) {
    const validRegexes = new Map();
    const invalidPatterns = [];

    for (const pattern of patterns) {
      try {
        validRegexes.set(pattern, new RegExp(pattern));
      } catch (err) {
        invalidPatterns.push(pattern);
      }
    }

    return { validRegexes, invalidPatterns };
  }

  matchFiles(files, regexMap) {
    const matchedFiles = new Set();
    const unmatchedPatterns = new Set(regexMap.keys());

    for (const file of files) {
      for (const [pattern, regex] of regexMap.entries()) {
        if (regex.test(file.name)) {
          matchedFiles.add(file.name);
          unmatchedPatterns.delete(pattern);
        }
      }
    }

    return {
      matchedFiles,
      unmatchedPatterns: Array.from(unmatchedPatterns),
    };
  }
}
