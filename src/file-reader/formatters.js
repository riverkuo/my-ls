/**
 * Short 格式化器
 * 處理預設格式（無 --long flag）
 */
export class ShortFormatter {
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
export class LongFormatter {
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

