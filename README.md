# Bienvenido a los 90 — web del podcast

Sitio estático generado a partir del feed del blog (`bienvenidoalos90.blogspot.com`), desplegado en GitHub Pages con dominio propio `bienvenidoalos90.com`.

## Scripts principales

```bash
npm run scrape         # vuelve a descargar el feed del blog y regenera episodes.json
npm run build           # regenera las páginas de episodio, sitemap.xml, robots.txt y los bloques de data/
npm run update           # scrape + build
npm run links:ivoox     # busca enlaces exactos en iVoox
npm run links:apple     # busca enlaces exactos en Apple Podcasts
npm run links:amazon    # busca enlaces exactos en Amazon Music
npm run links:spotify   # busca enlaces exactos en Spotify
npm run serve            # sirve la web en http://localhost:8765
```

## Automatización (GitHub Actions)

- **`Actualizar episodios`** (cada hora): scrapea el blog; si detecta episodios nuevos, busca también sus enlaces de plataformas y publica los cambios.
- **`Actualizar enlaces de plataformas`** (cada lunes): vuelve a intentar los enlaces que no se encontraron el día de publicación (por ejemplo, si la plataforma todavía no había indexado el episodio).
- **`Desplegar web`** (en cada push a `main`): construye el sitio y lo publica en GitHub Pages mediante Actions (`upload-pages-artifact` + `deploy-pages`), sin comitear los archivos generados al repo.

Si algún workflow falla, se crea automáticamente un issue en el repo con la etiqueta `workflow-failure`.

## Recuperación si se borra el sitio de GitHub Pages

Si por error se ejecuta `DELETE /repos/{owner}/{repo}/pages` (este endpoint borra el sitio entero, no solo el dominio personalizado), la web deja de responder y hay que recrearlo:

```bash
# 1. Recrear el sitio con despliegue por Actions
gh api repos/jordi1593/bienvenido-a-los-90-web/pages -X POST -f "build_type=workflow"

# 2. Volver a fijar el dominio personalizado
gh api repos/jordi1593/bienvenido-a-los-90-web/pages -X PUT -f "cname=bienvenidoalos90.com"

# 3. Forzar un despliegue para que vuelva a haber contenido publicado
gh workflow run "Desplegar web" --repo jordi1593/bienvenido-a-los-90-web
```

El certificado HTTPS se suele reemitir muy rápido tras este proceso (en nuestro caso, en cuestión de minutos). Comprobar el estado con:

```bash
gh api repos/jordi1593/bienvenido-a-los-90-web/pages
```

Si `https_certificate.state` aparece como `"approved"` pero `curl -sI https://bienvenidoalos90.com` todavía no responde, solo hace falta esperar unos minutos a que se propague.

**Importante**: nunca usar `DELETE` sobre el endpoint `pages` salvo que la intención sea borrar el sitio por completo. Para quitar solo el dominio personalizado (sin borrar el sitio), usar `PUT` con `cname` vacío en su lugar.
