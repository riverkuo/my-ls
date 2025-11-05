import packageJson from '../../package.json' with { type: 'json' };
import { ARGS } from '../constants/config.js';

export class HelpAndVersionService {
  constructor({ helpArgs, versionArgs, tokens }) {
    this.helpArgs = helpArgs;
    this.versionArgs = versionArgs;
    this.tokens = tokens;
  }

  print() {
    if (this.helpArgs && this.versionArgs) {
      const helpIndex = this.tokens.findIndex((token) => token.name === ARGS.HELP);
      const versionIndex = this.tokens.findIndex((token) => token.name === ARGS.VERSION);

      if (helpIndex < versionIndex) {
        this.#printHelp();
      } else {
        this.#printVersion();
      }
      return;
    }

    if (this.helpArgs) {
      this.#printHelp();
      return;
    }

    if (this.versionArgs) {
      this.#printVersion();
      return;
    }
  }

  #printHelp() {
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

  #printVersion() {
    console.log(`v${packageJson.version}`);
  }
}
