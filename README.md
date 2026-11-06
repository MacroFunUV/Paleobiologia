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

Los 31 tutores temáticos de B1–B7 y la mascota conectan con un servicio protegido del ordenador de la oficina. La clave de aula se introduce en el recuadro del asistente; este repositorio no contiene claves, tokens ni código del servicio privado. Las lecturas privadas se consultan en el servicio de oficina y no se distribuyen en la web ni en la aplicación.

La dirección actual es temporal. Si se reinicia el túnel de oficina, hay que verificar el nuevo informe `Conexion_para_libro.json`, ejecutar `python herramientas/activar_asistentes.py --informe <archivo>`, construir y volver a publicar. La activación comprueba HTTPS, coincidencia de la edición y bloqueo de consultas sin clave. `portal/asistentes/config.json` contiene solo la dirección pública y la huella de la edición. Al cambiar el contenido aprobado, la construcción desactiva una conexión cuya biblioteca ya no coincide. No se ha configurado arranque automático en el ordenador.

## Aplicación instalable

La portada de lectura está en `/Paleobiologia/app/`. En Chrome para Android se puede instalar desde la página o desde el menú del navegador, sin tienda. Reutiliza la misma edición pública y conserva el punto de lectura solo en ese dispositivo. La instalación no descarga automáticamente el libro completo.

El botón «Guardar lectura» descarga una instantánea del texto aprobado y sus dependencias locales. Los PDF, EPUB, vídeos, servidores de aplicaciones, la conexión de oficina y las respuestas de IA quedan fuera del guardado. La simulación local de deriva genética sí está incluida. Los tutores requieren Internet, clave de aula y el servicio de oficina activo.

`herramientas/preparar_app.py` actualiza el índice y el manifiesto de instalación antes de construir. Después calcula el paquete sin conexión a partir de las páginas publicadas, con el tamaño y SHA-256 de cada recurso. `portal/sw.js` es la plantilla del servicio de guardado; la construcción inserta la versión calculada en `_site/sw.js`. No editar manualmente HTML generado. Cada nueva edición aceptada entra en el índice al construir; la copia sin conexión se actualiza por solicitud del lector y solo reemplaza la anterior al terminar y comprobar todos los archivos.

La aplicación utiliza nombres de caché exclusivos de este proyecto, no guarda claves ni conversaciones y no necesita arranque automático en la oficina. El navegador puede liberar almacenamiento; el guardado es una comodidad de lectura, no una copia de respaldo. Para comprobar la lógica de descarga, privacidad, interrupción y actualización: `node herramientas/probar_app.cjs`.
