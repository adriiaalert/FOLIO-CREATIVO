# PECADO — landing

Landing de campaña para **PECADO** · *Una nueva forma de vivir el tardeo.*
HTML/CSS/JS vanilla. Sin build, sin dependencias: se sube tal cual a
cualquier hosting estático.

```
index.html               landing de PECADO
portfolio.html           la antigua home del repo (portfolio de Adrià Alert)
css/pecado.css
js/glass-crack-bg.js     fondo procedural de grietas de cristal
js/pecado.js             revelados + desbloqueo por código
assets/                  manzana + serpiente (WebP con alfa), favicon, og
```

## Lo que hay que tocar en cada evento

Todo vive en el bloque `CONFIG` al principio de `js/pecado.js`:

| Clave | Qué es |
|---|---|
| `CODE_SHA256` | huella del código de acceso |
| `CODE_FNV` | huella de respaldo (solo se usa al abrir el archivo sin servidor) |
| `TICKETS_URL` | enlace real de Fourvenues |
| `EVENT_DATE` | sustituye a `???` al desbloquear |
| `EVENT_LINE` | línea inferior de la tarjeta |

El código actual es **`SERPIENTE`** (no distingue mayúsculas, espacios ni tildes).

### Cambiar el código

```bash
printf 'MICODIGO' | shasum -a 256      # -> CODE_SHA256
```

Y para la huella de respaldo, en la consola del navegador:

```js
PECADO.fnv('MICODIGO')                 // -> CODE_FNV
```

> **Esto es validación de cliente.** Sirve para crear el momento, no para
> proteger nada de valor: la URL de Fourvenues está en el HTML y cualquiera
> con las herramientas de desarrollo puede leerla. Si el enlace tiene que ser
> secreto de verdad, debe entregarlo un servidor después de comprobar el
> código. Por eso no hay ninguna clave de API en el cliente.

## Meter el vídeo

En `index.html`, sección `#video`: sustituye el `div.video-placeholder` por el
`<video>` real. El marco (`.video-frame`, 16/9 en desktop y 4/3 en móvil) y las
marcas de encuadre se quedan como están.

## Fondo de grietas

`js/glass-crack-bg.js` es independiente y reutilizable:

```js
GlassCrackBG.init({ canvas: '#crack-bg', intensity: 0.5 });
GlassCrackBG.shatter(x, y, power);   // impacto en coordenadas de viewport
GlassCrackBG.setIntensity(0..1.6);
```

Cubre toda la página (canvas fijo, `z-index:0`) y se apaga con la pestaña en
segundo plano. Con `prefers-reduced-motion` dibuja el campo una sola vez y no
anima nada.

## Notas

- Un único `<h1>` (el wordmark del hero); el resto son `<h2>`.
- Imágenes en WebP con canal alfa: el render venía sobre un cuadrado casi negro
  que, con `mix-blend-mode:screen`, dibujaba un rectángulo gris. El recorte
  circular está horneado en el asset, no parcheado en CSS.
- `prefers-reduced-motion` detiene todo lo decorativo y conserva solo los
  cambios que comunican estado (el candado se abre, aparece el botón).
- El desbloqueo se recuerda con `sessionStorage`: al recargar no hay que
  volver a teclear, pero se olvida al cerrar la pestaña.
