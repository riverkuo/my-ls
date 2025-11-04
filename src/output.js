import packageJson from '../package.json' with { type: 'json' };
import { OUTPUT_OPTIONS } from './constants/config.js';

function printHelp() {
  console.log(`${packageJson.name} - ${packageJson.description}
  
  \n
  Usage:
    ${packageJson.name} [options] [file | path | regex | ...]
  \n
  Options:
    \n                                             default          description
    --all                       -a                 false            show hidden files
    --long                      -l                 false            show detailed information
    --regex                     -r                 false            search files with regex, should wrap with single quotes if contains special characters
    --output={json|classic}      -                classic           output format
    --help                      -h                 false            show help
    --version                   -v                 false            show version
    \n`);
}

function printVersion() {
  console.log(`v${packageJson.version}`);
}

function printOutput({ outputArgs, successFiles, errorFiles }) {

  const hasError = errorFiles?.length > 0;
  const hasSuccess = successFiles?.length > 0;

  if (hasError) {
    errorFiles.forEach((file) => {
      console.error(`${packageJson.name}: ${file.name}: No such file or directory`);
    });
  }


  if (hasSuccess) {
    if (outputArgs === OUTPUT_OPTIONS.JSON) {
      console.log(JSON.stringify(successFiles));
    } else {
      successFiles.forEach((file,index) => {
        if (successFiles.length > 1 && file.isDir) {
            console.log(file.name+":");
          } else if(file.isDir && successFiles.length === 1) {
          } else {
            console.log(generateResultString(file));
          }

        if (file.children) {
          file.children.forEach((childFile) => {
              console.log(generateResultString(childFile));
          });
        }

        const nextFile = successFiles[index + 1];

        if(nextFile && !nextFile.isDir && file.isDir) {
          console.log('\n');
        }

      });
    }
  }

  if (hasError) {
    process.exit(3);
  }
}


function generateResultString(file){
  return file.name + (("size" in file) ? ` | ${file.isDir ? 'd' : 'f'} | ${file.size ? file.size + "kb" : '-'} | ${file.mtime ? file.mtime : '-'}` : "");
}

export { printHelp, printVersion, printOutput };
