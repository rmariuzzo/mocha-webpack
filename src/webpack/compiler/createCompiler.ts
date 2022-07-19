import webpack from "webpack";

export default function createCompiler(webpackConfig: {}): webpack.Compiler {
  const compiler = webpack(webpackConfig);

  return compiler;
}
