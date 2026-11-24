#!/usr/bin/env bash
# Clona o actualiza todos los repositorios listados en repos.txt.
#
# - Si el directorio no existe, lo clona.
# - Si existe, hace `git pull --ff-only` (nunca crea merges ni pisa cambios locales).
#   Se salta los repositorios con cambios sin commitear.
# - Distingue los repositorios que han traído commits nuevos (con el rango y el número de
#   commits) de los que ya estaban al día; en pantalla solo se listan los que cambian.
# - Añade al .gitignore cualquier repositorio que todavía no esté.
#
# Uso: ./sync-repos.sh [--clone-only]

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MASTER="$ROOT/repos.txt"
GITIGNORE="$ROOT/.gitignore"
CLONE_ONLY=0
[[ "${1:-}" == "--clone-only" ]] && CLONE_ONLY=1

cloned=() updated=() uptodate=() skipped=() failed=()

while read -r dir url _; do
  [[ -z "${dir:-}" || "$dir" == \#* ]] && continue
  path="$ROOT/$dir"

  if ! grep -qxF "$dir/" "$GITIGNORE" 2>/dev/null; then
    echo "$dir/" >> "$GITIGNORE"
    echo "[gitignore] añadido $dir/"
  fi

  if [[ ! -d "$path/.git" ]]; then
    if [[ -e "$path" ]]; then
      echo "[error] $dir existe pero no es un repositorio git"
      failed+=("$dir"); continue
    fi
    echo "[clone] $dir"
    if git clone -q "$url" "$path" </dev/null; then cloned+=("$dir"); else failed+=("$dir"); fi
    continue
  fi

  (( CLONE_ONLY )) && continue

  if [[ -n "$(git -C "$path" status --porcelain)" ]]; then
    echo "[skip] $dir tiene cambios sin commitear"
    skipped+=("$dir"); continue
  fi

  branch="$(git -C "$path" branch --show-current)"
  before="$(git -C "$path" rev-parse --short HEAD)"
  if ! git -C "$path" pull -q --ff-only </dev/null; then
    echo "[error] $dir ($branch): falló git pull"
    failed+=("$dir"); continue
  fi
  after="$(git -C "$path" rev-parse --short HEAD)"

  if [[ "$before" == "$after" ]]; then
    uptodate+=("$dir")
  else
    count="$(git -C "$path" rev-list --count "$before..$after")"
    summary="$dir ($branch): $before..$after, $count commit(s)"
    echo "[update] $summary"
    updated+=("$summary")
  fi
done < "$MASTER"

echo
echo "Clonados: ${#cloned[@]}  Actualizados: ${#updated[@]}  Al día: ${#uptodate[@]}  Saltados: ${#skipped[@]}  Fallidos: ${#failed[@]}"
(( ${#cloned[@]} ))  && printf '  clonado:     %s\n' "${cloned[@]}"
(( ${#updated[@]} )) && printf '  actualizado: %s\n' "${updated[@]}"
(( ${#skipped[@]} )) && printf '  saltado:     %s\n' "${skipped[@]}"
(( ${#failed[@]} ))  && printf '  fallido:     %s\n' "${failed[@]}"
(( ${#failed[@]} == 0 ))
