import path from 'path';
import fsPromises from 'fs/promises';
import { BaseReader } from './base-reader.js';
import { getFilenameFromPath } from '../../utils/index.js';
import { readDirectory } from './shared.js';

export class PathReader extends BaseReader {
  async read({ paths }) {
    const results = await Promise.all(paths.map(this.readPath.bind(this)));

    return {
      successFiles: results.filter((r) => !r.error),
      errorFiles: results.filter((r) => r.error),
    };
  }

  async readPath(positional) {
    const fullPath = path.isAbsolute(positional) ? positional : path.join(process.cwd(), positional);
    const filename = getFilenameFromPath(positional);

    let stat = null;
    try {
      stat = await fsPromises.stat(fullPath);
    } catch (err) {
      return { name: filename, error: true };
    }

    const fileInfo = { name: filename };
    let children = [];

    // 如果是目錄，讀取子內容
    if (stat.isDirectory()) {
      children = await readDirectory({ path: fullPath, reader: this });
      fileInfo.children = children;
    }

    return this.formatFile(fileInfo, stat);
  }
}
