import { printHelp, printVersion } from './output.js';
import { ARGS } from './index.js';

function handleHelpAndVersion({ helpArgs, versionArgs, tokens }) {
  if (helpArgs && versionArgs) {
    const helpIndex = tokens.findIndex((token) => token.name === ARGS.HELP);
    const versionIndex = tokens.findIndex((token) => token.name === ARGS.VERSION);
    if (helpIndex < versionIndex) {
      printHelp();
    } else {
      printVersion();
    }
    return;
  }

  if (helpArgs) {
    printHelp();
    return;
  }

  if (versionArgs) {
    printVersion();
    return;
  }
}

export { handleHelpAndVersion };
