import packageJson from '../../package.json' with { type: 'json' };

export function generateErrorMsg(msg) {
  return `${packageJson.name}: ${msg}`;
}