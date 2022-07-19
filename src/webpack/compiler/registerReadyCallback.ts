import webpack, { Stats } from "webpack";

export default function registerReadyCallback(
  compiler: webpack.Compiler,
  cb: (err?: Error | string | null, stats?: Stats | null) => void
) {
  compiler.hooks.failed.tap("mocha-webpack", cb);
  compiler.hooks.done.tap("mocha-webpack", (stats: Stats) => {
    if (stats.hasErrors()) {
      const jsonStats = stats.toJson();
      const [err] = jsonStats.errors;
      cb(err, stats);
    } else {
      cb(null, stats);
    }
  });
}
