import path from 'path';
import { installSourceMapSupport } from '@esbuild-kit/core-utils';
import { getTsconfig, createPathsMatcher } from 'get-tsconfig';

export const sourcemaps = installSourceMapSupport();

const tsconfig = getTsconfig();

export const tsconfigRaw = tsconfig?.config;
export const tsconfigPathsMatcher = tsconfig && createPathsMatcher(tsconfig);

export const tsExtensionsPattern = /\.([cm]?ts|[tj]sx)$/;

export const getFormatFromExtension = (filePath: string): ModuleFormat | undefined => {
	const extension = path.extname(filePath);

	if (extension === '.mjs' || extension === '.mts') {
		return 'module';
	}

	if (extension === '.cjs' || extension === '.cts') {
		return 'commonjs';
	}
};

export type ModuleFormat =
	| 'builtin'
	| 'dynamic'
	| 'commonjs'
	| 'json'
	| 'module'
	| 'wasm';

export type MaybePromise<T> = T | Promise<T>;
