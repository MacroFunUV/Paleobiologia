# Paleobiología Esencial

Distribución pública del libro docente de Humberto G. Ferrón. La edición inicial contiene B1–B7 en castellano y se identifica como parcial.

## Construir

Requisitos: Python 3.11+ y Quarto 1.9.31 o compatible. Ejecutar `python herramientas/construir.py`. Produce HTML, PDF y EPUB en `_site/`. El servidor de desarrollo puede iniciarse con `python -m http.server 8767 --bind 127.0.0.1 --directory _site`.

El contenido de `ediciones/es/_bloques/` procede de instantáneas aceptadas del maestro editorial privado. No editar manualmente el HTML ni importar propuestas pendientes. Los identificadores se conservan en la web y en la fuente.

## Distribución

La web está publicada en https://macrofunuv.github.io/Paleobiologia/. GitHub Pages utiliza GitHub Actions como origen. En Actions, el flujo «Generar y publicar el libro» se activa mediante «Run workflow» y genera HTML, PDF y EPUB antes de desplegar `_site/`. Guardar cambios no publica automáticamente: el lanzamiento sigue siendo deliberado.

Los scripts de construcción y los datos se incluyen con el proyecto. Las aplicaciones Shiny mantienen su servicio externo. La biblioteca de PDF de consulta y el espacio editorial no forman parte de este repositorio.

## Idiomas y formatos

Castellano disponible parcialmente. Valenciano y otras traducciones quedan pendientes; cada una deberá vincularse a la versión aprobada del texto original. El proyecto no usa servicios externos de traducción.

## Créditos

Se conserva la licencia de la obra de origen y los créditos particulares de sus ilustraciones. La exportación no amplía permisos de terceros. El inventario editorial distingue las declaraciones de licencia y las verificaciones pendientes.

## Asistentes del libro

El tutor de B1 aparece al final de ese bloque y la mascota se incorpora a las páginas HTML del libro. Ambos conectan con un servicio protegido del ordenador de la oficina. La clave de aula se introduce en el recuadro del asistente; este repositorio no contiene claves, tokens ni código del servicio privado. El piloto consulta solo B1–B7 aprobados, sin los PDF completos de las lecturas.

La dirección actual es temporal. Si se reinicia el túnel de oficina, hay que verificar el nuevo informe `Conexion_para_libro.json`, ejecutar `python herramientas/activar_asistentes.py --informe <archivo>`, construir y volver a publicar. La activación comprueba HTTPS, coincidencia de la edición y bloqueo de consultas sin clave. `portal/asistentes/config.json` contiene solo la dirección pública y la huella de la edición. Al cambiar el contenido aprobado, la construcción desactiva una conexión cuya biblioteca ya no coincide. No se ha configurado arranque automático en el ordenador.
