import { filterHiddenFiles } from '../../utils/file.js';
import fsPromises from 'fs/promises';
import path from 'path';

export class BaseReader {
  constructor({ longArgs, allArgs }) {
    this.longArgs = longArgs;
    this.allArgs = allArgs;
    this.formatter = longArgs ? new LongFormatter() : new ShortFormatter();
  }

  async read(options) {
    throw new Error('read() must be implemented by subclass');
  }

  formatFile(fileInfo, stat) {
    return this.formatter.format(fileInfo, stat);
  }

  getFileResults(files) {
    if (this.allArgs) {
      return files;
    }
    return filterHiddenFiles(files);
  }

  async readPath(fullPath, displayName) {
    try {
      const stat = await fsPromises.stat(fullPath);
      const fileInfo = { name: displayName };

      // 如果是目錄，讀取第一層子內容
      if (stat.isDirectory()) {
        const children = await this.readDirectory(fullPath);
        fileInfo.children = children;
      }

      return this.formatFile(fileInfo, stat);
    } catch (err) {
      return { name: displayName, error: true };
    }
  }

  async readDirectory(dirPath) {
    if (this.longArgs) {
      const direntList = await fsPromises.readdir(dirPath, {
        withFileTypes: true,
      });
      const promises = direntList.map((dirent) => this.#generateDirentPromise(dirPath, dirent));
      const files = await Promise.all(promises);
      return this.getFileResults(files);
    }

    const files = await fsPromises.readdir(dirPath);
    const fileList = files.map((name) => ({ name }));
    return this.getFileResults(fileList);
  }

  async #generateDirentPromise(dirPath, dirent) {
    const fullPath = path.join(dirPath, dirent.name);
    const stat = await fsPromises.stat(fullPath);

    const fileInfo = { name: dirent.name };
    return this.formatFile(fileInfo, stat);
  }
}

/**
 * Short 格式化器
 * 處理預設格式（無 --long flag）
 */
class ShortFormatter {
  format(fileInfo, stat) {
    return {
      ...fileInfo,
      isDir: stat?.isDirectory() ?? false,
    };
  }
}

/**
 * Long 格式化器
 * 處理 --long flag 的格式化邏輯
 */
class LongFormatter {
  format(fileInfo, stat) {
    return {
      ...fileInfo,
      isDir: stat?.isDirectory() ?? false,
      size: !stat?.isDirectory() && stat?.size,
      mtime: stat?.mtime,
      mode: stat?.mode,
      isSymbolicLink: stat?.isSymbolicLink() ?? false,
    };
  }
}
