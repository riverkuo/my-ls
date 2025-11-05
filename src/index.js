import process from 'process';
import { parseArgs } from 'util';
import { handleReadFiles } from './services/reader/index.js';
import { OutputService } from './services/output-service.js';
import { HelpAndVersionService } from './services/help-and-version-service.js';
import { ARGS, OPTIONS, OUTPUT_OPTIONS } from './constants/config.js';
import { generateErrorMsg } from './utils/error.js';

export async function run(args) {
  try {
    const { helpArgs, versionArgs, longArgs, allArgs, regexArgs, outputArgs, positionals, tokens } = await parse({
      args,
      options: OPTIONS,
    });

    validateArgs({ outputArgs, positionals, regexArgs });

    if (helpArgs || versionArgs) {
      const helpService = new HelpAndVersionService({ helpArgs, versionArgs, tokens });
      helpService.print();
      return;
    }

    const { successFiles, errorFiles } = await handleReadFiles({ positionals, longArgs, allArgs, regexArgs });
    const outputService = new OutputService({ outputArgs, successList: successFiles, errorList: errorFiles, longArgs });
    outputService.printOutput();
  } catch (err) {
    process.exit(1);
  }
}

function validateArgs({ outputArgs, positionals, regexArgs }) {
  if (outputArgs !== OUTPUT_OPTIONS.JSON && outputArgs !== OUTPUT_OPTIONS.CLASSIC) {
    console.error(generateErrorMsg('Wrong output args'));
    process.exit(4);
  }

  if (positionals.length === 0 && regexArgs) {
    console.error(generateErrorMsg('Command-line usage error\n--help for usage information'));
    process.exit(64);
  }
}

async function parse({ args, options }) {
  try {
    const { values, positionals, tokens } = parseArgs({ args, options, allowPositionals: true, tokens: true });
    // 先攔截的 args
    const helpArgs = values[ARGS.HELP];
    const versionArgs = values[ARGS.VERSION];

    // 跟讀取相關的 args
    const longArgs = values[ARGS.LONG];
    const allArgs = values[ARGS.ALL];
    const regexArgs = values[ARGS.REGEX];

    // 輸出相關的 args
    const outputArgs = values[ARGS.OUTPUT];

    return { helpArgs, versionArgs, longArgs, allArgs, regexArgs, outputArgs, positionals, tokens };
  } catch (err) {
    const errorCode = err.code;
    if (errorCode === 'ERR_PARSE_ARGS_UNKNOWN_OPTION') {
      console.error(generateErrorMsg(err.message));
      process.exit(1);
    }
    process.exit(1);
  }
}
