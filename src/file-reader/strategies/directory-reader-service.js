import { BaseReader } from './base-reader-service.js';
import { readDirectory } from './shared.js';
import process from 'process';

export class DirectoryReader extends BaseReader {
  async read({ path }) {
    try {
      const files = await readDirectory({
        path,
        reader: this,
      });

      return {
        successFiles: files,
        errorFiles: [],
      };
    } catch (err) {
      console.error(err);
      process.exit(3);
    }
  }
}
