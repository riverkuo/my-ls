import { BaseReader } from './base-reader-service.js';

export class DirectoryReader extends BaseReader {
  async read({ path }) {
    const files = await this.readDirectory(path);

    return {
      successFiles: files,
      errorFiles: [],
    };
  }
}
