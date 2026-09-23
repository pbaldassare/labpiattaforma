// Configurazione Metro per il monorepo.
// Senza questo, il bundler guarda solo dentro apps/mobile e non trova
// @lab/shared ne' le dipendenze appiattite nella radice.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Nessun disableHierarchicalLookup: serve ai monorepo con pnpm, dove le
// dipendenze sono collegate simbolicamente. Con npm, che le appiattisce nella
// radice, impedirebbe a Metro di risalire e trovarle.

module.exports = config;
