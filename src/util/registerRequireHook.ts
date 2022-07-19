/*  eslint-disable no-underscore-dangle */

// see https://github.com/nodejs/node/blob/master/lib/module.js
import Module from "module";

// the module in which the require() call originated
let requireCaller: any;
// all custom registered resolvers
let pathResolvers: any[] = [];

// keep original Module._resolveFilename
const originalResolveFilename = (Module as any)._resolveFilename;
// override Module._resolveFilename
(Module as any)._resolveFilename = function _resolveFilename(
  ...parameters: any[]
) {
  const parent = parameters[1];
  // store require() caller (the module in which this require() call originated)
  requireCaller = parent;
  return originalResolveFilename.apply(this, parameters);
};

// keep original Module._findPath
const originalFindPath = (Module as any)._findPath;
// override Module._findPath
(Module as any)._findPath = function _findPath(...parameters: any[]) {
  const request = parameters[0];

  // try to resolve the path with custom resolvers
  for (const resolve of pathResolvers) {
    const resolved = resolve(request, requireCaller);
    if (typeof resolved !== "undefined") {
      return resolved;
    }
  }

  // and when none found try to resolve path with original resolver
  const filename = originalFindPath.apply(this, parameters);
  if (filename !== false) {
    return filename;
  }

  return false;
};

export default function registerRequireHook(
  dotExt: string,
  resolve: (
    path: string,
    parent: Module
  ) => { path?: string | null; source?: string | null }
) {
  // cache source code after resolving to avoid another access to the fs
  const sourceCache: Record<string, string | null | undefined> = {};
  // store all files that were affected by this hook
  const affectedFiles: Record<string | number, boolean> = {};

  const resolvePath = (path: string, parent: Module) => {
    // get CommonJS module source code for this require() call
    const { path: resolvedPath, source } = resolve(path, parent);

    // if no CommonJS module source code returned - skip this require() hook
    if (resolvedPath == null) {
      return undefined;
    }

    // flush require() cache
    delete require.cache[resolvedPath];

    // put the CommonJS module source code into the hash
    sourceCache[resolvedPath] = source;

    // return the path to be require()d in order to get the CommonJS module source code
    return resolvedPath;
  };

  const resolveSource = (path: string | number) => {
    const source = sourceCache[path];
    delete sourceCache[path];
    return source;
  };

  pathResolvers.push(resolvePath);

  // keep original extension loader
  const originalLoader = (Module as any)._extensions[dotExt];
  // override extension loader
  (Module as any)._extensions[dotExt] = (
    module: { _compile: (arg0: string | null, arg1: any) => void },
    filename: string | number
  ) => {
    const source = resolveSource(filename);

    if (typeof source === "undefined") {
      // load the file with the original loader
      (originalLoader || (Module as any)._extensions[".js"])(module, filename);
      return;
    }

    affectedFiles[filename] = true;

    // compile javascript module from its source
    module._compile(source, filename);
  };

  return function unmout() {
    pathResolvers = pathResolvers.filter((r) => r !== resolvePath);
    (Module as any)._extensions[dotExt] = originalLoader;
    Object.keys(affectedFiles).forEach((path) => {
      delete require.cache[path];
      delete sourceCache[path];
      delete affectedFiles[path];
    });
  };
}
