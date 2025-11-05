import { OUTPUT_OPTIONS } from '../constants/config.js';
import { generateErrorMsg } from '../utils/error.js';

export class OutputService {
  constructor({ outputArgs, successList, errorList, longArgs, positionals }) {
    this.outputArgs = outputArgs;
    this.longArgs = longArgs;
    this.successList = successList;
    this.errorList = errorList;
    this.hasError = errorList?.length > 0;
    this.hasSuccess = successList?.length > 0;
    this.onlyOneDirectory = successList.length === 1 && successList[0]?.isDir;
    this.successFiles = successList.filter((file) => !file.isDir);
    this.successDirectories = successList.filter((file) => file.isDir);
    this.isCurrentDirOutput = positionals.length === 0;
  }

  printOutput() {
    if (this.hasError) {
      this.errorList.forEach((file) => {
        if (file.errorType === 'invalid_regex') {
          console.error(generateErrorMsg(`${file.name}: Invalid regular expression`));
        } else {
          console.error(generateErrorMsg(`${file.name}: No such file or directory`));
        }
      });
    }

    if (this.hasSuccess) {
      if (this.outputArgs === OUTPUT_OPTIONS.JSON) {
        this.#printJsonFormat();
      } else {
        this.#printClassicFormat();
      }
    }

    if (this.hasError) {
      process.exit(3);
    }
  }

  #printJsonFormat() {
    console.log(JSON.stringify(this.successFiles.concat(this.successDirectories)));
  }

  #printClassicFormat() {
    if (this.onlyOneDirectory) {
      this.#printDirectoryChildren(this.successDirectories[0].children);
      return;
    }

    if (this.isCurrentDirOutput) {
      this.#printDirectoryChildren(this.successList);
      return;
    }

    this.successFiles.forEach((file) => {
      console.log(this.#generateResultString(file));
    });

    this.successDirectories.forEach((directory) => {
      console.log('\n');
      console.log(directory.name + ':');
      this.#printDirectoryChildren(directory.children);
    });
  }

  #printDirectoryChildren(children) {
    children.forEach((childFile) => {
      console.log(this.#generateResultString(childFile));
    });
  }

  #generateResultString(file) {
    return (
      file.name +
      (this.longArgs
        ? ` | ${file.isDir ? 'd' : 'f'} | ${file.size ? file.size + 'kb' : '-'} | ${file.mtime ? file.mtime : '-'}`
        : '')
    );
  }
}
