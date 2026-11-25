# Launchpad local de RHP

Sandbox de SAP Fiori launchpad que sirve **todas las aplicaciones `rhp-ui-*` del workspace desde
su código local**, con sus target mappings reales. Sirve para probar cambios y la navegación entre
aplicaciones sin desplegar nada.

## Requisitos

- Node.js 22.15 o superior (por `--use-system-ca`, ver [Certificados](#certificados-y-proxy-corporativo)).
- Los repositorios clonados con `./sync-repos.sh` (o `sync-repos.ps1`) desde la raíz del workspace.
- Para el modo con backend: acceso a `rstls4h.resultoconsultoria.com:44300` y un usuario del cliente 100.

## Uso

```bash
cd launchpad
npm install        # solo la primera vez o al cambiar package.json
npm start          # contra el backend S/4 real
npm run start-mock # con los mockservers de las aplicaciones, sin backend
```

Ambos comandos regeneran la configuración y abren `flp.html#Shell-home`, con una tile por aplicación.
Los cambios en el código de cualquier aplicación se ven al recargar el navegador.

En modo backend, el proxy pide usuario y contraseña de SAP. Para no teclearlos en cada arranque,
defínelos en las variables de entorno `FIORI_TOOLS_USER` y `FIORI_TOOLS_PASSWORD`.

No hace falta ejecutar `npm install` en cada aplicación: el launchpad sirve sus ficheros
directamente desde `webapp/`.

## Cómo funciona

[`generate.js`](generate.js) lee [`repos.txt`](../repos.txt) y el `manifest.json` de cada
`rhp-ui-*`. Con eso genera dos configuraciones de UI5 Tooling, que no se versionan:

| Fichero | Contenido |
|---|---|
| `ui5.yaml` | Proxy de UI5 y proxy de `/sap` al backend S/4. |
| `ui5-mock.yaml` | Proxy de UI5 y el `sap-fe-mockserver` con los servicios de todos los `ui5-mock.yaml` de las aplicaciones. |

- Cada aplicación se sirve en `/apps/<sap.app.id>/` y se registra en el sandbox con el intent de
  cada uno de sus inbounds (`sap.app.crossNavigation.inbounds`). Las navegaciones entre aplicaciones
  (outbounds) resuelven contra esos intents igual que en el launchpad desplegado.
- El título de la tile es `sap.app.title`, resuelto con el i18n de la aplicación.
- Las aplicaciones en TypeScript se transpilan al vuelo con
  [`lib/ts-transpile-middleware.js`](lib/ts-transpile-middleware.js), que usa los mismos presets de
  Babel que `ui5-tooling-transpile`.
- Todas las aplicaciones comparten una sola versión de UI5 (`UI5_VERSION` en `generate.js`). Tiene
  que ser igual o mayor que la `minUI5Version` más alta de las aplicaciones.

## Avisos del generador

Al arrancar, el generador lista lo que no puede resolver:

- **Aplicaciones sin inbound**: se excluyen del launchpad. Para incluir una, declara su inbound en
  `crossNavigation` dentro de su `manifest.json`.
- **Outbounds sin destino**: la aplicación navega a un intent que no declara ninguna aplicación del
  workspace, así que esa navegación falla también en local.
- **Aplicaciones sin `ui5-mock.yaml`**: en `start-mock` sus servicios no responden.

## Certificados y proxy corporativo

Los proxies con inspección TLS (Netskope, Zscaler…) firman `ui5.sap.com` con una CA corporativa
que Windows tiene instalada pero Node no. Sin ella, el proxy de UI5 falla con
`self-signed certificate in certificate chain` y `fiori-tools-preview` avisa de
`Could not get UI5 version of application` (no puede leer `sap-ui-version.json`).

Por eso [`.npmrc`](.npmrc) define `node-options=--use-system-ca`: npm lo pasa como `NODE_OPTIONS`
a `npm start` y `npm run start-mock`, y Node confía también en las CA del sistema operativo. Si
lanzas `fiori run` sin npm, añade tú `NODE_OPTIONS=--use-system-ca`.

No uses `ignoreCertErrors: true` ni `NODE_TLS_REJECT_UNAUTHORIZED=0` para resolverlo: desactivan
la validación de certificados en lugar de añadir la CA.

## Limitaciones

- No hay recarga automática al guardar: hay que refrescar el navegador.
- Todas las aplicaciones se cargan con la misma versión de UI5, no con la de su propio `ui5.yaml`.
