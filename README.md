# RHP - Entorno de trabajo

Repositorio raíz que agrupa todos los repositorios del proyecto RHP en un único directorio de trabajo.

Este repositorio **no contiene el código** de los proyectos: solo el maestro de repositorios y los scripts para clonarlos y mantenerlos actualizados. Cada repositorio se clona en su propio subdirectorio y está excluido mediante `.gitignore`, de modo que cada uno conserva su propio historial y remoto.

## Contenido

| Fichero | Descripción |
|---|---|
| [`repos.txt`](repos.txt) | Maestro de repositorios del proyecto (directorio + URL SSH). |
| [`sync-repos.sh`](sync-repos.sh) | Script de sincronización para Linux, macOS y WSL. |
| [`sync-repos.ps1`](sync-repos.ps1) | Script de sincronización para Windows (PowerShell). |
| [`launchpad/`](launchpad/) | Launchpad Fiori local con todas las aplicaciones `rhp-ui-*`; ver su [`README.md`](launchpad/README.md). |
| [`AGENTS.md`](AGENTS.md) | Instrucciones para agentes de IA al trabajar en el workspace. |
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

Durante la ejecución solo se muestran los repositorios en los que pasa algo (clonado, actualizado, saltado o con error); los que ya estaban al día no generan salida. Al terminar muestra un resumen con el recuento de clonados, actualizados, al día, saltados y fallidos, seguido del detalle de cada uno. Para los actualizados indica la rama, el rango de commits y cuántos ha traído:

```
Clonados: 0  Actualizados: 1  Al día: 36  Saltados: 0  Fallidos: 0
  actualizado: rhp-abap-core (main): 75094e3..b76313c, 1 commit(s)
```

Si algún repositorio falla, el script devuelve un código de error.

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
