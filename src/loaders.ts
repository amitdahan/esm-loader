import path from 'path';
import { pathToFileURL } from 'url';
import {
	transform,
	transformDynamicImport,
	applySourceMap,
	resolveTsPath,
} from '@esbuild-kit/core-utils';
import {
	sourcemaps,
	tsconfigRaw,
	tsconfigPathsMatcher,
	tsExtensionsPattern,
	getFormatFromExtension,
	type ModuleFormat,
	type MaybePromise,
} from './utils';
import { getPackageType } from './package-json';

type Resolved = {
	url: string;
	format: ModuleFormat;
};

type Context = {
	conditions: string[];
	parentURL: string | undefined;
};

type resolve = (
	specifier: string,
	context: Context,
	defaultResolve: resolve,
	recursiveCall?: boolean,
) => MaybePromise<Resolved>;

const extensions = ['.js', '.json', '.ts', '.tsx', '.jsx'] as const;

async function tryExtensions(
	specifier: string,
	context: Context,
	defaultResolve: resolve,
) {
	let error;
	for (const extension of extensions) {
		try {
			return await resolve(
				specifier + extension,
				context,
				defaultResolve,
				true,
			);
		} catch (_error: any) {
			if (error === undefined) {
				const { message } = _error;
				_error.message = _error.message.replace(`${extension}'`, "'");
				_error.stack = _error.stack.replace(message, _error.message);
				error = _error;
			}
		}
	}

	throw error;
}

async function tryDirectory(
	specifier: string,
	context: Context,
	defaultResolve: resolve,
) {
	const appendIndex = specifier.endsWith('/') ? 'index' : '/index';

	try {
		return await tryExtensions(specifier + appendIndex, context, defaultResolve);
	} catch (error: any) {
		const { message } = error;
		error.message = error.message.replace(`${appendIndex.replace('/', path.sep)}'`, "'");
		error.stack = error.stack.replace(message, error.message);
		throw error;
	}
}

const fileProtocol = 'file://';
const isPathPattern = /^\.{0,2}\//;

export const resolve: resolve = async function (
	specifier,
	context,
	defaultResolve,
	recursiveCall,
) {
	// Added in v12.20.0
	// https://nodejs.org/api/esm.html#esm_node_imports
	if (specifier.startsWith('node:')) {
		specifier = specifier.slice(5);
	}

	// If directory, can be index.js, index.ts, etc.
	if (specifier.endsWith('/')) {
		return await tryDirectory(specifier, context, defaultResolve);
	}

	const isPath = (
		specifier.startsWith(fileProtocol)
		|| isPathPattern.test(specifier)
	);

	if (
		tsconfigPathsMatcher
		&& !isPath // bare specifier
		&& !context.parentURL?.includes('/node_modules/')
	) {
		const possiblePaths = tsconfigPathsMatcher(specifier);
		for (const possiblePath of possiblePaths) {
			try {
				return await resolve(
					pathToFileURL(possiblePath).toString(),
					context,
					defaultResolve,
				);
			} catch {}
		}
	}

	/**
	 * Typescript gives .ts, .cts, or .mts priority over actual .js, .cjs, or .mjs extensions
	 */
	if (tsExtensionsPattern.test(context.parentURL!)) {
		const tsPath = resolveTsPath(specifier);

		if (tsPath) {
			try {
				return await resolve(tsPath, context, defaultResolve, true);
			} catch (error) {
				if ((error as any).code !== 'ERR_MODULE_NOT_FOUND') {
					throw error;
				}
			}
		}
	}

	let resolved: Resolved;
	try {
		resolved = await defaultResolve(specifier, context, defaultResolve);
	} catch (error) {
		if (
			(error instanceof Error)
			&& !recursiveCall
		) {
			if ((error as any).code === 'ERR_UNSUPPORTED_DIR_IMPORT') {
				return await tryDirectory(specifier, context, defaultResolve);
			}

			if ((error as any).code === 'ERR_MODULE_NOT_FOUND') {
				return await tryExtensions(specifier, context, defaultResolve);
			}
		}

		throw error;
	}

	if (resolved.url.endsWith('.json')) {
		return {
			...resolved,
			format: 'json',
		};
	}

	let { format } = resolved;

	if (resolved.url.startsWith(fileProtocol)) {
		format = getFormatFromExtension(resolved.url) ?? format;

		if (!format) {
			format = await getPackageType(resolved.url);
		}
	}

	return {
		...resolved,
		format,
	};
};

type load = (
	url: string,
	context: {
		format: string;
		importAssertions: Record<string, string>;
	},
	defaultLoad: load,
) => MaybePromise<{
	format: string;
	source: string | ArrayBuffer | SharedArrayBuffer | Uint8Array;
}>;

export const load: load = async function (
	url,
	context,
	defaultLoad,
) {
	if (process.send) {
		process.send({
			type: 'dependency',
			path: url,
		});
	}

	if (url.endsWith('.json')) {
		if (!context.importAssertions) {
			context.importAssertions = {};
		}
		context.importAssertions.type = 'json';
	}

	const loaded = await defaultLoad(url, context, defaultLoad);

	if (!loaded.source) {
		return loaded;
	}

	const code = loaded.source.toString();

	if (
		loaded.format === 'json'
		|| tsExtensionsPattern.test(url)
	) {
		const transformed = await transform(
			code,
			url,
			{
				tsconfigRaw,
			},
		);

		return {
			format: 'module',
			source: applySourceMap(transformed, url, sourcemaps),
		};
	}

	const dynamicImportTransformed = transformDynamicImport(code);
	if (dynamicImportTransformed) {
		loaded.source = applySourceMap(
			dynamicImportTransformed,
			url,
			sourcemaps,
		);
	}

	return loaded;
};
