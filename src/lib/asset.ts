/** Pfad zu einer Datei aus public/ – immer über diese Funktion, nie mit festem "/" vorne
 *  (die App läuft auf GitHub Pages unter /swapd-app-dev/). Beispiel: asset('logo.svg') */
export const asset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
