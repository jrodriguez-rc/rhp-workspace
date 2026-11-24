# RHP — Workspace

Directorio raíz que agrupa los repositorios de RHP (Resulto Healthcare Platform). Este
repositorio solo contiene el maestro de repositorios ([`repos.txt`](repos.txt)) y los scripts
para sincronizarlos; el código vive en los subdirectorios.

## Estructura

- **Cada subdirectorio `rhp-*` es un repositorio git independiente**, con su propio remoto e
  historial, y está excluido en el `.gitignore` del workspace. Los cambios en su código se
  commitean **dentro de ese repositorio**, nunca en el raíz.
- El repositorio raíz solo versiona `repos.txt`, los scripts `sync-repos.*`, el `README.md`,
  este fichero y el `.gitignore`.
- Grupos de repositorios:
  - `rhp-docs-development-guide` — guías de desarrollo (Markdown, sin código).
  - `rhp-abap-core` — backend ABAP de `/RHP/CORE`, serializado con abapGit (`objects/`, `tabledata/`).
  - `rhp-ui-*` — aplicaciones UI5/Fiori, una por recurso clínico.
- Para añadir o quitar un repositorio del proyecto, edita `repos.txt` y ejecuta
  `./sync-repos.sh` (o `sync-repos.ps1`); ver [`README.md`](README.md).

## Instrucciones para agentes

- Las instrucciones para agentes viven en ficheros **`AGENTS.md`**, tanto en el workspace como
  en cada repositorio que las tenga (hoy, `rhp-docs-development-guide`).
- **No se crean ficheros `CLAUDE.md`.** Claude Code carga `AGENTS.md` automáticamente solo si
  no hay ningún `CLAUDE.md` en el directorio de trabajo ni por encima: un `CLAUDE.md` en el
  workspace o en un repositorio impediría que se cargara su `AGENTS.md`.
- Al trabajar desde el raíz del workspace, el `AGENTS.md` de un repositorio no se carga por
  adelantado: solo llega cuando se lee un fichero de ese repositorio. Si la tarea cae en un
  repositorio con `AGENTS.md`, **léelo explícitamente antes de empezar** y aplica sus reglas
  dentro de ese repositorio.

## Desarrollo y análisis ABAP

**Antes de desarrollar, revisar, analizar o documentar cualquier objeto ABAP de RHP, lee la
documentación de [`rhp-docs-development-guide`](rhp-docs-development-guide/).** Aplica tanto al
código de `rhp-abap-core` como al trabajo directo contra el sistema SAP.

1. Empieza por [`rhp-docs-development-guide/AGENTS.md`](rhp-docs-development-guide/AGENTS.md):
   contiene el índice de guías con el alcance de cada una y las convenciones del repositorio.
2. Lee **completa** la guía de `how-to-abap/` que cubra la tarea, no solo su resumen en el
   índice. Las guías recogen reglas verificadas contra el sistema que no se deducen del código.
3. Si la tarea toca varios ámbitos, lee todas las guías implicadas. Como orientación:

   | Tarea | Guías |
   |---|---|
   | Cualquier desarrollo ABAP | `general-development.md` (namespace, paquetes, nomenclatura) y `abap-code-style.md` |
   | Mensajes, textos al usuario, excepciones | `messages-and-exceptions.md` |
   | Crear o modificar una entidad RAP | `build-entity-pattern.md`, y la de la entidad hija si aplica (`build-entity-address.md`, `build-entity-identifier.md`, `build-entity-timing.md`) |
   | Tests ABAP Unit | `unit-test.md` |
   | Documentación KTD (`SKTD`) de un BDEF | `generate-knowledge-transfer-document.md` |

   El índice autoritativo es el de `AGENTS.md`; si aparece una guía nueva allí, aplica aunque
   no figure en esta tabla.

4. Si el código existente contradice una guía, la guía describe el patrón objetivo: señala la
   desviación en lugar de copiarla.
5. Las guías usan marcas de confianza (`[V]`, `[E]`, `[I]`) definidas en
   [`rhp-docs-development-guide/README.md`](rhp-docs-development-guide/README.md). Una regla
   marcada `[I]` es una inferencia sin confirmar: no la trates como hecho.

Antes de leer las guías, asegúrate de que el repositorio está al día (`git -C
rhp-docs-development-guide pull --ff-only`, o `./sync-repos.sh`).
