import fsPromises from 'fs/promises';
import path from 'path';

/**
 * 讀取目錄內容
 * 可被多個策略共用
 */

export async function readDirectory({ path, reader }) {
  // reader 是 BaseReader 實例（或子類實例）
  if (reader.longArgs) {
    const direntList = await fsPromises.readdir(path, {
      withFileTypes: true,
    });
    const promises = direntList.map((dirent) =>
      generateDirentPromiseForLong({
        dirent,
        destinationPath: path,
        reader,
      })
    );
    const files = await Promise.all(promises);
    return reader.getFileResults(files);
  }

  const files = await fsPromises.readdir(path);
  const fileList = files.map((name) => ({ name }));
  return reader.getFileResults(fileList);
}

/**
 * 生成 Dirent Promise（用於 long 模式）
 */
export async function generateDirentPromiseForLong({ dirent, destinationPath, reader }) {
  const isDir = dirent.isDirectory();
  let stat = null;

  if (!isDir) {
    const fullPath = path.isAbsolute(dirent.name) ? dirent.name : path.join(destinationPath, dirent.name);
    stat = await fsPromises.stat(fullPath);
  }

  const fileInfo = { name: dirent.name };
  return reader.formatFile(fileInfo, stat);
}
