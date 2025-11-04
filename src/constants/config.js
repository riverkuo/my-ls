export const ARGS = Object.freeze({
  HELP: 'help',
  VERSION: 'version',
  ALL: 'all',
  LONG: 'long',
  REGEX: 'regex',
  OUTPUT: 'output',
});

export const OUTPUT_OPTIONS = Object.freeze({
  JSON: 'json',
  CLASSIC: 'classic',
});

export const OPTIONS = Object.freeze({
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
