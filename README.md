# RHP — Entorno de trabajo

Repositorio raíz que agrupa todos los repositorios del proyecto RHP en un único directorio de trabajo.

Este repositorio **no contiene el código** de los proyectos: solo el maestro de repositorios y los scripts para clonarlos y mantenerlos actualizados. Cada repositorio se clona en su propio subdirectorio y está excluido mediante `.gitignore`, de modo que cada uno conserva su propio historial y remoto.

## Contenido

| Fichero | Descripción |
|---|---|
| [`repos.txt`](repos.txt) | Maestro de repositorios del proyecto (directorio + URL SSH). |
| [`sync-repos.sh`](sync-repos.sh) | Script de sincronización para Linux, macOS y WSL. |
| [`sync-repos.ps1`](sync-repos.ps1) | Script de sincronización para Windows (PowerShell). |
| [`AGENTS.md`](AGENTS.md) | Instrucciones para agentes de IA al trabajar en el workspace. |
| [`CLAUDE.md`](CLAUDE.md) | Punto de entrada para Claude Code; remite a `AGENTS.md`. |
| [`.gitignore`](.gitignore) | Excluye los repositorios clonados y el fichero `.env`. |

## Requisitos

- `git`
- Acceso por SSH a la organización `RESULTO-CONSULTORIA-SL` en GitHub (clave SSH configurada en tu cuenta).

Puedes comprobar el acceso con:

```bash
ssh -T git@github.com
```

## Puesta en marcha

1. Clona este repositorio.
2. Ejecuta el script de sincronización para clonar todos los repositorios del proyecto.

**Linux / macOS / WSL**

```bash
./sync-repos.sh
```

**Windows (PowerShell)**

```powershell
.\sync-repos.ps1
```

Si PowerShell bloquea la ejecución de scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\sync-repos.ps1
```

## Qué hacen los scripts

Para cada repositorio listado en `repos.txt`:

- **Si no existe**, lo clona en un directorio con su nombre.
- **Si ya existe**, lo actualiza con `git pull --ff-only`. Nunca crea merges ni sobrescribe trabajo local.
- **Si tiene cambios sin commitear**, lo salta y lo indica en el resumen.
- **Si no está en el `.gitignore`**, lo añade.

Al terminar muestra un resumen (clonados, actualizados, saltados y fallidos) y devuelve un código de error si alguno ha fallado.

Para clonar solo los repositorios que falten, sin actualizar los existentes:

```bash
./sync-repos.sh --clone-only
```

```powershell
.\sync-repos.ps1 -CloneOnly
```

## Maestro de repositorios

`repos.txt` es la fuente de verdad de los repositorios del proyecto. Cada línea tiene el formato:

```
<directorio> <url-ssh>
```

Las líneas vacías y las que empiezan por `#` se ignoran, por lo que se pueden usar para agrupar y comentar.

Los repositorios están agrupados en:

- **Documentación** — `rhp-docs-*`
- **Backend ABAP** — `rhp-abap-*`
- **Aplicaciones UI** — `rhp-ui-*`

### Añadir un repositorio

1. Añade una línea a `repos.txt` en el grupo que corresponda:

   ```
   rhp-ui-nuevo                     git@github.com:RESULTO-CONSULTORIA-SL/rhp-ui-nuevo.git
   ```

2. Ejecuta el script de sincronización. Clonará el repositorio y lo añadirá al `.gitignore`.
3. Haz commit de `repos.txt` y `.gitignore`.

### Quitar un repositorio

1. Elimina su línea de `repos.txt` y su entrada del `.gitignore`.
2. Borra el directorio local si ya no lo necesitas.
3. Haz commit de los cambios.

## Configuración local

El fichero `.env` es para configuración local y secretos. Está en el `.gitignore` y **no debe subirse nunca** al repositorio.
