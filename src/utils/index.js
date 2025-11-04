function isHiddenFile(filename) {
  return filename.startsWith('.');
}

function getFilenameFromPath(path) {
  if (path.includes('/')) {
    return path.split('/').pop();
  }
  return path;
}

export { isHiddenFile, getFilenameFromPath };
