import process from 'process';
import { parseArgs } from 'util';
import packageJson from '../package.json' with { type: 'json' };
import { handleReadFiles } from './read-file.js';
import { printOutput } from './output.js';
import { handleHelpAndVersion } from './help-and-version.js';

// TODO
// [] regex spec (交集、不可重複)
// [] 架構
// [] glob

// [] shell script
// [] man

// [] cjs vs esm
// [] importmap

const ARGS = Object.freeze({
  HELP: 'help',
  VERSION: 'version',
  ALL: 'all',
  LONG: 'long',
  REGEX: 'regex',
  OUTPUT: 'output',
});

const OUTPUT_OPTIONS = Object.freeze({
  JSON: 'json',
  CLASSIC: 'classic',
});

const OPTIONS = Object.freeze({
  [ARGS.ALL]: {
    type: 'boolean',
    short: 'a',
    default: false,
  },
  [ARGS.LONG]: {
    type: 'boolean',
    short: 'l',
    default: false,
  },
  [ARGS.REGEX]: {
    type: 'boolean',
    short: 'r',
    default: false,
  },

  [ARGS.OUTPUT]: {
    type: 'string',
    default: OUTPUT_OPTIONS.CLASSIC,
  },

  [ARGS.HELP]: {
    type: 'boolean',
    short: 'h',
    default: false,
  },
  [ARGS.VERSION]: {
    type: 'boolean',
    short: 'v',
    default: false,
  },
});


async function parse({ args, options }) {
  try {
    const { values, positionals, tokens } = parseArgs({ args, options, allowPositionals: true, tokens: true });

    const helpArgs = values[ARGS.HELP];
    const versionArgs = values[ARGS.VERSION];

    const longArgs = values[ARGS.LONG];
    const allArgs = values[ARGS.ALL];
    const regexArgs = values[ARGS.REGEX];

    const outputArgs = values[ARGS.OUTPUT];

    return { helpArgs, versionArgs, longArgs, allArgs, regexArgs, outputArgs, positionals, tokens };
  } catch (err) {
    const errorCode = err.code;
    if (errorCode === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      console.error(`${packageJson.name}: ${err.message}`);
      process.exit(1);
    }
    process.exit(1);
  }
}

async function run(args) {
  try {
    const { 
      helpArgs,
      versionArgs,
      longArgs,
      allArgs,
      regexArgs,
      outputArgs,
      positionals,
      tokens,
    } = await parse({ args, options: OPTIONS });


    // 1. 處理 args 給錯的情況
    if(outputArgs !== OUTPUT_OPTIONS.JSON && outputArgs !== OUTPUT_OPTIONS.CLASSIC) {
      console.error(`${packageJson.name}: Command-line usage error\n--output=${outputArgs}`);
      process.exit(4);
    }

    if (positionals.length === 0 && regexArgs) {
      console.error(`${packageJson.name}: Command-line usage error\n--help for usage information`);
      process.exit(64);
    }


    // 2. 處理 args 中的 help 和 version
    if (helpArgs || versionArgs) {
      handleHelpAndVersion({ helpArgs, versionArgs, tokens });
      return;
    }

    // 3. 處理 read files 與其他 args
    const { successFiles, errorFiles } = await handleReadFiles({ positionals, longArgs, allArgs, regexArgs });

    // 4. 處理 output (output args)
    printOutput({ outputArgs, successFiles, errorFiles });
  } catch (err) {
    process.exit(1);
  }
}

export {
  run,
  ARGS,
  OUTPUT_OPTIONS,
  OPTIONS,
};
