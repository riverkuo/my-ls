function isHiddenFile(filename) {
  return filename.startsWith('.');
}

export function getFilenameFromPath(path) {
  if (path.includes('/')) {
    return path.split('/').pop();
  }
  return path;
}

export function filterHiddenFiles(files) {
  return files.filter((file) => !isHiddenFile(file.name));
}
