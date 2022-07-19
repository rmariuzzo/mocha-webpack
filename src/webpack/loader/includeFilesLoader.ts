import loaderUtils from "loader-utils";
import { loader } from "webpack";

// Note: no export default here cause of Babel 6
module.exports = function includeFilesLoader(
  this: loader.LoaderContext,
  sourceCode: string
) {
  if (this.cacheable) {
    this.cacheable();
  }
  const loaderOptions = loaderUtils.getOptions(this);

  if (loaderOptions.include && (loaderOptions.include as any).length) {
    const includes = (loaderOptions.include as any)
      .map(
        (modPath: string) =>
          `require(${loaderUtils.stringifyRequest(this, modPath)});`
      )
      .join("\n");

    const code = [includes, sourceCode].join("\n");

    this.callback(null, code);
    return;
  }

  this.callback(null, sourceCode);
};
