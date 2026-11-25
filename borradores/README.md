# Borradores (no publicados)

Los ficheros de esta carpeta **no se despliegan**: los workflows publican solo
`*.html` de la raíz y las carpetas que copian expresamente a `dist/`.

## `tienda.html`

Página de la edición física (pendrive en cinta de cassette, pago con PayPal).
Está retirada del sitio a propósito, pero se conserva para seguir trabajando en ella.

**Para volver a publicarla:**

1. `git mv borradores/tienda.html tienda.html`
2. En `build-episodes.mjs`, dentro de `mainUrls` (sitemap-main.xml), recuperar la línea:

   ```js
   { loc: `${SITE_URL}/tienda.html`, lastmod: today, changefreq: "monthly", priority: "0.5" },
   ```

3. Hacer commit y push: el workflow "Actualizar episodios" reconstruye y despliega.
   Si además quieres enlazarla desde el menú, añade el enlace en la cabecera de las plantillas.
