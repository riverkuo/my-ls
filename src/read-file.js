import path from 'path';
import fsPromises from 'fs/promises';
import { isHiddenFile, getFilenameFromPath } from './utils/index.js';

async function handleReadFiles({ positionals, longArgs, allArgs = false, regexArgs = false }) {
  if (positionals.length > 0 && !regexArgs) {
    const results = await readPositionals({ positionals, longArgs, allArgs });
    return {
      successFiles: results.filter((result) => !result.error),
      errorFiles: results.filter((result) => result.error),
    };
  }

  // if (positionals.length > 0 && regexArgs) {
  //   const results = await readPositionalsWithRegex({ positionals, longArgs, allArgs });
  //   return {
  //     successFiles: results.filter((result) => !result.error),
  //     errorFiles: results.filter((result) => result.error),
  //   };
  // }

  return { successFiles: await readDirectories({ longArgs, allArgs }) };
}

async function generatePositionalsPromise({ positional, longArgs = false, allArgs = false }) {
  const fullPath = path.join(process.cwd(), positional);
  const filename = getFilenameFromPath(positional);

  let stat = null;

  try {
    stat = await fsPromises.stat(fullPath);
  } catch (err) {
    return {
      name: filename,
      error: true,
    };
  }

  const shortResult = {
    name: filename,
  };

  let children = [];

  if (stat.isDirectory()) {
    children = await readDirectories({ longArgs, destinationPath: fullPath, allArgs });

    shortResult.children = children;
  }

  return longArgs ? handleLongArgs({ shortResult, stat }) : shortResult;
}

async function readPositionals({ positionals, longArgs = false, allArgs = false }) {
  const positionalsPromises = positionals.map(async (positional) =>
    generatePositionalsPromise({ positional, longArgs, allArgs })
  );

  return await Promise.all(positionalsPromises);
}

// async function readPositionalsWithRegex({ positionals, longArgs = false, allArgs = false }) {
//   const matchedFiles = new Set();
//   const unmatchedRegexMap = new Map();
//   for (const regexPattern of positionals) {
//     let regex;
//     try {
//       regex = new RegExp(regexPattern);
//       console.log('🚀 ~ regex =>', regex);
//       unmatchedRegexMap.set(regexPattern, { name: regexPattern, error: true });
//     } catch (err) {
//       console.error(err);
//       // TODO: 處理錯誤
//     }

//     const currentResult = await readDirectories({ longArgs: false, allArgs });
//     for (const file of currentResult) {
//       if (regex.test(file.name)) {
//         const result = await generatePositionalsPromise({ positional: file.name, longArgs, allArgs });
//         matchedFiles.add(result);
//         unmatchedRegexMap.delete(regexPattern);
//       }
//     }
//   }

//   return Array.from(unmatchedRegexMap.values()).concat(Array.from(matchedFiles));
// }

async function generateDirentPromise({ dirent, destinationPath }) {
  const isDir = dirent.isDirectory();
  let stat = null;

  if (!isDir) {
    const fullPath = path.join(destinationPath, dirent.name);
    stat = await fsPromises.stat(fullPath);
  }
  const shortResult = {
    name: dirent.name,
  };

  return handleLongArgs({ shortResult, stat });
}

async function readDirectories({ longArgs = false, destinationPath = process.cwd(), allArgs = false }) {
  try {
    if (longArgs) {
      const direntList = await fsPromises.readdir(destinationPath, { withFileTypes: true });
      const direntListPromises = direntList.map(async (dirent) => generateDirentPromise({ dirent, destinationPath }));
      const direntListResult = await Promise.all(direntListPromises);
      return allArgs ? direntListResult : handleAllArgs({ files: direntListResult });
    }

    const files = await fsPromises.readdir(destinationPath);
    const filesResult = files.map((name) => ({ name }));
    return allArgs ? filesResult : handleAllArgs({ files: filesResult });
  } catch (err) {
    console.error(err);
    process.exit(3);
  }
}

function handleAllArgs({ files }) {
  return files.filter(({ name }) => !isHiddenFile(name));
}

function handleLongArgs({ shortResult, stat }) {
  return {
    ...shortResult,
    isDir: stat?.isDirectory() ?? false,
    size: stat?.size,
    mtime: stat?.mtime,
    mode: stat?.mode,
    isSymbolicLink: stat?.isSymbolicLink() ?? false,
  };
}

export { handleReadFiles };
