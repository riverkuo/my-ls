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
    const allPaths = await this.#scanDirectory(cwd, '');

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

    // 過濾掉被匹配祖先目錄，但保留文件
    const filteredPaths = await this.#filterPathsWithMatchedAncestors(Array.from(matchedPaths), cwd);

    const results = await Promise.all(
      filteredPaths.map((matchedPath) => {
        const fullPath = path.join(cwd, matchedPath);
        return this.readPath(fullPath, matchedPath);
      })
    );

    return {
      successFiles: results.filter((r) => !r.error),
      errorFiles: [...errorFiles, ...results.filter((r) => r.error)],
    };
  }

  async #scanDirectory(baseDir, relativePath) {
    const results = [];
    const entries = await fsPromises.readdir(path.join(baseDir, relativePath), { withFileTypes: true });

    for (const entry of entries) {
      const entryRelativePath = relativePath ? path.join(relativePath, entry.name) : entry.name;
      results.push(entryRelativePath);

      if (entry.isDirectory()) {
        const subResults = await this.#scanDirectory(baseDir, entryRelativePath);
        results.push(...subResults);
      }
    }

    return results;
  }

  async #filterPathsWithMatchedAncestors(matchedPaths, cwd) {
    const matchedPathsSet = new Set(matchedPaths);
    const filteredPaths = []; // 過濾後的結果
    const statCache = new Map();

    for (const mp of matchedPaths) {
      const ancestors = this.#getAncestors(mp);
      // 父目錄
      const directParent = ancestors.length > 0 ? ancestors[0] : null;
      const hasMatchedDirectParent = directParent && matchedPathsSet.has(directParent);

      // 父目錄被匹配，檢查直接父目錄是否會被過濾
      if (hasMatchedDirectParent) {
        // 父目錄的祖先
        const parentAncestors = directParent ? this.#getAncestors(directParent) : [];
        const parentWillBeFiltered = parentAncestors.some((ancestor) => matchedPathsSet.has(ancestor));

        // 如果直接父目錄不會被過濾，那麼直接子項應該被過濾（無論文件還是目錄）
        // 因為直接子項會在父目錄的輸出中顯示
        if (!parentWillBeFiltered) {
          continue;
        }
        // 如果直接父目錄會被過濾，繼續後續邏輯（根據類型決定是否過濾）
      }

      // 檢查是否有其他祖先被匹配（用於更深層的路徑）
      const hasMatchedAncestor = ancestors.some((ancestor) => matchedPathsSet.has(ancestor));

      if (hasMatchedAncestor) {
        const fullPath = path.join(cwd, mp);
        let stat;
        if (statCache.has(fullPath)) {
          stat = statCache.get(fullPath);
        } else {
          try {
            stat = await fsPromises.stat(fullPath);
            statCache.set(fullPath, stat);
          } catch (err) {
            // 如果無法獲取 stat，跳過過濾（讓後續的 readPath 處理錯誤）
            filteredPaths.push(mp);
            continue;
          }
        }

        // ** 過濾目錄，跳過這層，進入下一次迭代 **
        if (stat.isDirectory()) continue;
      }

      filteredPaths.push(mp);
    }

    return filteredPaths;
  }

  #getAncestors(relativePath) {
    const ancestors = [];
    let current = relativePath;

    while (current && current !== '.' && current !== path.sep) {
      const parent = path.dirname(current);
      if (parent === current) break;
      if (parent === '.') break;
      ancestors.push(parent);
      current = parent;
    }

    return ancestors;
  }
}
