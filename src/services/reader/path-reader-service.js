import path from 'path';
import { BaseReader } from './base-reader-service.js';

export class PathReader extends BaseReader {
  async read({ paths }) {
    const results = await Promise.all(
      paths.map((positional) => {
        const fullPath = path.isAbsolute(positional) ? positional : path.join(process.cwd(), positional);
        return this.readPath(fullPath, positional);
      })
    );

    return {
      successFiles: results.filter((r) => !r.error),
      errorFiles: results.filter((r) => r.error),
    };
  }
}
