import { BaseReader } from './base-reader-service.js';
import process from 'process';

export class DirectoryReader extends BaseReader {
  async read({ path }) {
    try {
      const files = await this.readDirectory(path);

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
