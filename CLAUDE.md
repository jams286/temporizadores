# temporizadores (casa)

Temporizadores de cocina para la familia, usados desde la tablet (vía el hub `infra/home`) y el celular.

## Qué hace

- Botones rápidos (1, 3, 5, 10, 15, 20, 30, 45 y 60 min) y uno personalizado con nombre, minutos y segundos. Si se escribe un nombre antes de tocar un botón rápido, el temporizador lo usa.
- Varios temporizadores corriendo a la vez; cada uno se puede pausar, sumar 1 minuto o quitar.
- Otras tools crean uno abriendo `/temporizadores/?nombre=<texto>&min=<n>` (también `seg`); la cocina lo usa en los pasos de las recetas. Después se limpia la dirección con `history.replaceState` para que recargar no lo duplique.
- Al terminar: alarma (pitidos con Web Audio) que se repite hasta tocar "Detener", la tarjeta parpadea, vibra si el dispositivo puede y el título de la pestaña avisa.

## Cómo está hecho

Sitio estático, sin frameworks ni paso de build:

- `index.html`, `styles.css` (tema claro, números grandes), `app.js` (IIFE).
- Cada temporizador guarda su hora de fin (`Date.now()`), así que no se desfasa aunque la pestaña quede en segundo plano.
- Se guardan en `localStorage` (clave `temporizadores.v1`), o sea, por dispositivo: si se recarga la página siguen corriendo.
- Los navegadores solo dejan sonar audio después de un toque. Si hay temporizadores corriendo tras recargar, aparece un aviso de "Toca para activar el sonido".
- Wake Lock: mientras haya temporizadores corriendo o sonando, la pantalla no se apaga (`mantenerPantalla()`, se llama en cada `dibujar()` y al volver a la pestaña). Solo funciona por HTTPS; por http no hace nada.
- Rutas relativas para que funcione bajo `/temporizadores/`.

## Dónde se publica

- URL: http://192.168.1.4/temporizadores/
- Carpeta: `/var/www/temporizadores/` (de jams, sin sudo). Comando de publicación en el README.
