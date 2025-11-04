import { LongFormatter, ShortFormatter } from '../formatters.js';
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
