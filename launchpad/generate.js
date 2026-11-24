#!/usr/bin/env node
"use strict";

// Genera ui5.yaml y ui5-mock.yaml del launchpad local a partir de repos.txt y
// del manifest.json de cada aplicación rhp-ui-*. Cada inbound declarado en
// sap.app.crossNavigation.inbounds se registra como intent del sandbox FLP,
// de modo que la navegación entre aplicaciones funciona igual que en el
// launchpad desplegado. Las aplicaciones sin inbound se excluyen.
//
// Uso: node generate.js (se ejecuta solo antes de npm start / npm run start-mock)

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// --- Configuración común -----------------------------------------------------
const UI5_VERSION = "1.146.0"; // >= mayor minUI5Version de las aplicaciones
const UI5_CDN = "https://ui5.sap.com";
const BACKEND_URL = "https://rstls4h.resultoconsultoria.com:44300";
// ws: reenvía también los WebSocket (canal APC /sap/bc/apc/sap/odata de los side-effects
// por eventos de RAP). El APC rechaza con 403 el handshake si Origin no es un origen
// permitido (http://localhost:8080 no lo es), así que el proxy lo reescribe al del backend.
const BACKEND = { path: "/sap", url: BACKEND_URL, client: "100", ws: true, headers: { origin: BACKEND_URL } };
const THEME = "sap_horizon";
const FLP_PATH = "/flp.html";
// ------------------------------------------------------------------------------

const LAUNCHPAD_DIR = __dirname;
const WORKSPACE_DIR = path.resolve(LAUNCHPAD_DIR, "..");
const HEADER = "# GENERADO por generate.js a partir de repos.txt y los manifest.json de las aplicaciones.\n# No editar a mano: los cambios se pierden en el siguiente npm start.\n\n";

const warnings = [];
const warn = (msg) => warnings.push(msg);

/** Ruta relativa al launchpad con separadores POSIX, para el YAML. */
const rel = (abs) => path.relative(LAUNCHPAD_DIR, abs).split(path.sep).join("/");

function readYamlDocs(file) {
	return fs.existsSync(file) ? yaml.loadAll(fs.readFileSync(file, "utf8")).filter(Boolean) : [];
}

/** Directorios de aplicación UI declarados en repos.txt. */
function readUiRepos() {
	const text = fs.readFileSync(path.join(WORKSPACE_DIR, "repos.txt"), "utf8");
	return text
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith("#"))
		.map((l) => l.split(/\s+/)[0])
		.filter((dir) => dir.startsWith("rhp-ui-"));
}

/** Ruta del webapp según el ui5.yaml de la aplicación (por defecto, webapp). */
function webappDir(appDir) {
	const project = readYamlDocs(path.join(appDir, "ui5.yaml")).find((d) => d.type === "application");
	const configured = project && project.resources && project.resources.configuration
		&& project.resources.configuration.paths && project.resources.configuration.paths.webapp;
	return path.join(appDir, configured || "webapp");
}

/** Servicios del sap-fe-mockserver de ui5-mock.yaml, con rutas relativas al launchpad. */
function mockConfig(appDir) {
	const docs = readYamlDocs(path.join(appDir, "ui5-mock.yaml"));
	const project = docs.find((d) => d.server);
	const mw = project && (project.server.customMiddleware || []).find((m) => m.name === "sap-fe-mockserver");
	if (!mw) {
		return null;
	}
	const rebase = (entry) => {
		const out = { ...entry };
		for (const key of Object.keys(out)) {
			if (key !== "urlPath" && /Path$/.test(key) && typeof out[key] === "string") {
				out[key] = rel(path.resolve(appDir, out[key]));
			}
		}
		return out;
	};
	const cfg = mw.configuration || {};
	return {
		services: (cfg.services || []).map(rebase),
		annotations: (cfg.annotations || []).map(rebase)
	};
}

function collectApps() {
	const apps = [];
	const intents = new Map();
	const tsApps = [];
	const mock = { services: new Map(), annotations: new Map() };
	const excluded = [];

	for (const dir of readUiRepos()) {
		const appDir = path.join(WORKSPACE_DIR, dir);
		if (!fs.existsSync(appDir)) {
			warn(`${dir}: no está clonado (ejecuta sync-repos); se omite.`);
			continue;
		}
		const webapp = webappDir(appDir);
		const manifestFile = path.join(webapp, "manifest.json");
		if (!fs.existsSync(manifestFile)) {
			warn(`${dir}: no tiene ${rel(manifestFile)}; se omite.`);
			continue;
		}
		const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
		const sapApp = manifest["sap.app"] || {};
		const inbounds = Object.values((sapApp.crossNavigation && sapApp.crossNavigation.inbounds) || {});
		if (inbounds.length === 0) {
			excluded.push(dir);
			continue;
		}

		const target = `/apps/${sapApp.id}`;
		for (const inbound of inbounds) {
			const intent = `${inbound.semanticObject}-${inbound.action}`;
			if (intents.has(intent)) {
				warn(`${dir}: el intent ${intent} ya lo declara ${intents.get(intent)}; se ignora.`);
				continue;
			}
			intents.set(intent, dir);
			apps.push({
				target,
				local: rel(appDir),
				intent: { object: inbound.semanticObject, action: inbound.action }
			});
		}

		if (fs.existsSync(path.join(webapp, "Component.ts"))) {
			tsApps.push({ target, webapp: rel(webapp) });
		}

		const appMock = mockConfig(appDir);
		if (!appMock) {
			warn(`${dir}: no tiene sap-fe-mockserver en ui5-mock.yaml; en modo mock sus servicios no responderán.`);
		} else {
			for (const service of appMock.services) {
				if (!mock.services.has(service.urlPath)) {
					mock.services.set(service.urlPath, service);
				}
			}
			for (const annotation of appMock.annotations) {
				mock.annotations.set(annotation.urlPath, annotation);
			}
		}
	}

	// Avisa de navegaciones salientes sin aplicación destino en el launchpad.
	for (const dir of readUiRepos()) {
		const manifestFile = path.join(webappDir(path.join(WORKSPACE_DIR, dir)), "manifest.json");
		if (!fs.existsSync(manifestFile)) continue;
		const sapApp = JSON.parse(fs.readFileSync(manifestFile, "utf8"))["sap.app"] || {};
		for (const outbound of Object.values((sapApp.crossNavigation && sapApp.crossNavigation.outbounds) || {})) {
			const intent = `${outbound.semanticObject}-${outbound.action}`;
			if (!intents.has(intent)) {
				warn(`${dir}: navega a ${intent}, pero ninguna aplicación del workspace declara ese inbound.`);
			}
		}
	}

	if (excluded.length) {
		warn(`Sin inbound en crossNavigation, excluidas del launchpad: ${excluded.join(", ")}.`);
	}
	apps.sort((a, b) => `${a.intent.object}-${a.intent.action}`.localeCompare(`${b.intent.object}-${b.intent.action}`));
	return { apps, tsApps, mock };
}

function buildConfig({ apps, tsApps, mock }, mode) {
	const proxy = {
		name: "fiori-tools-proxy",
		afterMiddleware: "compression",
		configuration: {
			ignoreCertErrors: false,
			ui5: { path: ["/resources", "/test-resources"], url: UI5_CDN, version: UI5_VERSION }
		}
	};
	if (mode === "backend") {
		proxy.configuration.backend = [BACKEND];
	}

	const middleware = [
		proxy,
		{
			name: "rhp-ts-transpile",
			afterMiddleware: "compression",
			configuration: { apps: tsApps }
		},
		{
			name: "fiori-tools-preview",
			afterMiddleware: "rhp-ts-transpile",
			configuration: {
				flp: { path: FLP_PATH, theme: THEME, libs: false, apps }
			}
		}
	];

	if (mode === "mock") {
		middleware.push({
			name: "sap-fe-mockserver",
			beforeMiddleware: "csp",
			configuration: {
				mountPath: "/",
				services: [...mock.services.values()],
				annotations: [...mock.annotations.values()]
			}
		});
	}

	const project = {
		specVersion: "4.0",
		metadata: { name: "com.rhp.launchpad" },
		type: "application",
		server: { customMiddleware: middleware }
	};
	const extension = {
		specVersion: "4.0",
		kind: "extension",
		type: "server-middleware",
		metadata: { name: "rhp-ts-transpile" },
		middleware: { path: "lib/ts-transpile-middleware.js" }
	};
	const dump = (doc) => yaml.dump(doc, { lineWidth: -1, noRefs: true });
	return HEADER + dump(project) + "---\n" + dump(extension);
}

function main() {
	const collected = collectApps();
	fs.writeFileSync(path.join(LAUNCHPAD_DIR, "ui5.yaml"), buildConfig(collected, "backend"));
	fs.writeFileSync(path.join(LAUNCHPAD_DIR, "ui5-mock.yaml"), buildConfig(collected, "mock"));

	const appCount = new Set(collected.apps.map((a) => a.target)).size;
	console.log(`Launchpad generado: ${appCount} aplicaciones, ${collected.apps.length} intents, ` +
		`${collected.mock.services.size} servicios mock, UI5 ${UI5_VERSION}.`);
	for (const app of collected.apps) {
		console.log(`  ${app.intent.object}-${app.intent.action}`.padEnd(42) + app.local);
	}
	if (warnings.length) {
		console.log("\nAvisos:");
		for (const w of warnings) console.log(`  - ${w}`);
	}
}

main();
