"use strict";

// Middleware de UI5 Tooling que sirve transpiladas las fuentes TypeScript de
// las aplicaciones del launchpad. El middleware de preview de Fiori tools
// sirve cada aplicación con express.static, que no transpila: cuando se pide
// un .js que no existe y sí existe el .ts correspondiente, este middleware
// lo transpila con los mismos presets que ui5-tooling-transpile.
//
// configuration.apps: [{ target: "/apps/<id>", webapp: "<ruta a webapp relativa al launchpad>" }]

const fs = require("fs");
const path = require("path");
const babel = require("@babel/core");

const LAUNCHPAD_DIR = path.resolve(__dirname, "..");

module.exports = function ({ log, options }) {
	const apps = ((options.configuration && options.configuration.apps) || []).map((a) => ({
		target: a.target,
		webapp: path.resolve(LAUNCHPAD_DIR, a.webapp)
	}));
	const cache = new Map(); // ruta .ts -> { mtimeMs, code }

	return async function tsTranspile(req, res, next) {
		const urlPath = decodeURIComponent(req.path);
		if (req.method !== "GET" || !urlPath.endsWith(".js")) {
			return next();
		}
		const app = apps.find((a) => urlPath.startsWith(a.target + "/"));
		if (!app) {
			return next();
		}
		const relative = urlPath.slice(app.target.length + 1);
		const jsFile = path.join(app.webapp, relative);
		const tsFile = jsFile.replace(/\.js$/, ".ts");
		if (!jsFile.startsWith(app.webapp) || fs.existsSync(jsFile) || !fs.existsSync(tsFile)) {
			return next();
		}
		try {
			const { mtimeMs } = fs.statSync(tsFile);
			let entry = cache.get(tsFile);
			if (!entry || entry.mtimeMs !== mtimeMs) {
				const result = await babel.transformFileAsync(tsFile, {
					babelrc: false,
					configFile: false,
					sourceMaps: "inline",
					presets: [
						[require.resolve("babel-preset-transform-ui5"), { overridesToOverride: true }],
						require.resolve("@babel/preset-typescript")
					]
				});
				entry = { mtimeMs, code: result.code };
				cache.set(tsFile, entry);
			}
			res.setHeader("Content-Type", "application/javascript; charset=utf-8");
			res.end(entry.code);
		} catch (err) {
			log.error(`Error transpilando ${tsFile}: ${err.message}`);
			next(err);
		}
	};
};
