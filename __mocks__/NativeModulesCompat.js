'use strict';
/**
 * Compatibility shim for jest-expo + React Native 0.76+.
 *
 * jest-expo/src/preset/setup.js does:
 *   const mockNativeModules = require('react-native/Libraries/BatchedBridge/NativeModules').default;
 *
 * RN 0.76's jest mock returns a plain CJS object with no `.default`, so mockNativeModules
 * ends up as `undefined` and every subsequent Object.defineProperty call throws.
 *
 * This file is wired in via moduleNameMapper so jest-expo gets our object instead.
 * We use the absolute path (which bypasses the mapper) with jest.requireMock to pull
 * the full mock that react-native/jest/setup.js registered, then tack on `.default`.
 */
const path = require('path');

// Absolute path bypasses moduleNameMapper (pattern only matches the short package form)
const rnNativeModulesPath = path.resolve(
  __dirname,
  '../node_modules/react-native/Libraries/BatchedBridge/NativeModules.js'
);

const baseModules = jest.requireMock(rnNativeModulesPath);
const modules = Object.assign({}, baseModules);
modules.default = modules;
module.exports = modules;
