# Paleobiología Esencial

Distribución pública del libro docente de Humberto G. Ferrón. La edición inicial contiene B1–B7 en castellano y se identifica como parcial.

## Construir

Requisitos: Python 3.11+ y Quarto 1.9.31 o compatible. Ejecutar `python herramientas/construir.py`. Produce HTML, PDF y EPUB en `_site/`. El servidor de desarrollo puede iniciarse con `python -m http.server 8767 --bind 127.0.0.1 --directory _site`.

El contenido de `ediciones/es/_bloques/` procede de instantáneas aceptadas del maestro editorial privado. No editar manualmente el HTML ni importar propuestas pendientes. Los identificadores se conservan en la web y en la fuente.

## Distribución

La web prevista es https://macrofunuv.github.io/Paleobiologia/. El flujo de GitHub Actions genera y publica `_site/`. Activar GitHub Pages con origen GitHub Actions cuando el repositorio esté creado. La primera publicación se activa manualmente; el contenido se comprueba antes de desplegarse.

Los scripts de construcción y los datos se incluyen con el proyecto. Las aplicaciones Shiny mantienen su servicio externo. La biblioteca de PDF de consulta y el espacio editorial no forman parte de este repositorio.

## Idiomas y formatos

Castellano disponible parcialmente. Valenciano y otras traducciones quedan pendientes; cada una deberá vincularse a la versión aprobada del texto original. El proyecto no usa servicios externos de traducción.

## Créditos

Se conserva la licencia de la obra de origen y los créditos particulares de sus ilustraciones. La exportación no amplía permisos de terceros. El inventario editorial distingue las declaraciones de licencia y las verificaciones pendientes.
