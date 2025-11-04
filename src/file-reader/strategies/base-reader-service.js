import { filterHiddenFiles } from '../../utils/index.js';

export class BaseReader {
  constructor({ longArgs, allArgs }) {
    this.longArgs = longArgs;
    this.allArgs = allArgs;
    this.formatter = longArgs ? new LongFormatter() : new ShortFormatter();
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

  async read(options) {
    throw new Error('read() must be implemented by subclass');
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
      size: stat?.size,
      mtime: stat?.mtime,
      mode: stat?.mode,
      isSymbolicLink: stat?.isSymbolicLink() ?? false,
    };
  }
}
