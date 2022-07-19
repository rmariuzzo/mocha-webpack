import path from "path";
import sortChunks from "./sortChunks";
import getAffectedModuleIds from "./getAffectedModuleIds";
import { Chunk, Module, Stats } from "webpack";

// import type { Chunk, Module, Stats } from "../types";

export type BuildStats = {
  affectedModules: Array<number | string>;
  affectedFiles: Array<string>;
  entries: Array<string>;
};

export default function getBuildStats(
  stats: Stats,
  outputPath?: string
): BuildStats {
  const { chunks, chunkGroups, modules } = stats.compilation;

  const sortedChunks = sortChunks(chunks, chunkGroups);
  const affectedModules = getAffectedModuleIds(chunks, modules);

  const entries: string[] = [];
  const js: string[] = [];
  const pathHelper = (f: string) => path.join(outputPath ?? "", f);

  sortedChunks.forEach((chunk) => {
    if (!chunk) return;

    const files = Array.isArray(chunk.files) ? chunk.files : [chunk.files];

    if (chunk.isOnlyInitial()) {
      // only entry files
      const entry = files[0];
      entries.push(entry);
    }

    if (
      chunk
        .getModules()
        .some(
          (module) =>
            module.id === null || affectedModules.indexOf(module.id) !== -1
        )
    ) {
      files.forEach((file) => {
        if (/\.js$/.test(file)) {
          js.push(file);
        }
      });
    }
  });

  const buildStats: BuildStats = {
    affectedModules,
    affectedFiles: js.map(pathHelper),
    entries: entries.map(pathHelper),
  };

  return buildStats;
}
