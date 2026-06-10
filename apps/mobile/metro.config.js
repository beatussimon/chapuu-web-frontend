const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

// Find the project and workspace root
const projectRoot = __dirname;
// In a monorepo, we typically go up two levels: apps/mobile -> apps -> root
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch only mobile and shared packages (do not watch root node_modules)
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared')
];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 4. Ignore non-JS/TS backend files, other monorepo apps, and build outputs
config.resolver.blockList = [
  /[/\\]chapuu-backend[/\\]/,
  /[/\\]apps[/\\]web[/\\]/,
  /\.git[/\\]/,
  /[/\\]apps[/\\]mobile[/\\]dist[/\\]/,
].concat(config.resolver.blockList || []);

module.exports = config;
