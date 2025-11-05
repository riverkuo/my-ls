function isHiddenFile(filename) {
  return filename.startsWith('.');
}

export function filterHiddenFiles(files) {
  return files.filter((file) => !isHiddenFile(file.name));
}
