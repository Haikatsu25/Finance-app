# Diseño "Pop" — especificación de implementación

Referencia exacta: `docs/design-pop/finance-control-pop.html`. Es una demo
navegable y autocontenida de toda la app con el diseño aprobado. **Ábrela en
el navegador antes de tocar código** (móvil 390px y escritorio ≥900px, claro y
noche). Todo lo que no esté dicho aquí, se resuelve mirando el HTML.

Sustituye por completo la dirección "Rotulado" (tinta sobre cal). Lo que se
conserva de Rotulado es solo lo estructural: filas de movimientos, barras en
vez de donas, botones ≥44px, textos sin mayúsculas espaciadas, fix de vencido,
tests.

## Tokens (copiar tal cual a globals.css / tailwind.config.js / tema HeroUI)

Claro:
- fondo `#f5f6fa`, tarjeta `#ffffff`, tinta `#0e1a33`, texto secundario `#6b7590`, línea `rgba(14,26,51,.07)`
- marino (héroe, botón primario, FAB) `#0b1f4d` → `#0a1a40`
- marca (interactivo, pestaña activa, chips) `#2f9e8f`, suave `rgba(47,158,143,.14)`
- pop1 `#2f9e8f` · pop2 `#f2b53a` · pop3 `#3b82f6` · pop4 `#e7772b` (decoración: círculos del héroe, bloques de cifras, barras de reparto)
- dinero: entra `#1f8c7d`, sale `#d9473f`, apartado `#c98f12` (+ versiones suaves al 14–20%)
- sombra `0 2px 4px rgba(14,26,51,.04), 0 16px 36px -18px rgba(14,26,51,.2)`
- pista (tracks) `#e8ebf2`

Noche:
- fondo `#0a0c12`, tarjeta `#15181f`, tinta `#f1f3f8`, secundario `#8d95a8`, línea `rgba(255,255,255,.06)`
- marino → `#171b25` / `#10131a`; el héroe lleva halo lima `rgba(216,242,106,.5)` arriba-derecha y lavanda `rgba(199,184,255,.42)` abajo-izquierda en vez de círculos
- marca `#d8f26a`, pop1 `#d8f26a`, pop2 `#c7b8ff`, pop3 `#7dd3fc`, pop4 `#ff8a65`
- dinero: entra `#5fd3a8`, sale `#ff6f66`, apartado `#ffd166`
- bloques de cifras: `#1f6f5f`, `#b24a3a`, `#2b5aa8`

Tipografía: **Plus Jakarta Sans** en todo (400–800), vía `next/font/google`.
Montos con `font-variant-numeric: tabular-nums`. Saldo del héroe 46px/800 en
móvil, 54px en escritorio. Cifras de bloques 19px/800. Títulos de sección 17px/800.

Radios: tarjetas 24px, héroe y tarjeta de crédito 28px, filas 18px, bloques
22px, botones y chips 999px (píldora), inputs 16px, hojas modales 28px arriba.

## Componentes clave (ver HTML para el detalle)
- **Logo** "Tarjeta al día" (`docs/design-pop/logo/`): tarjeta con banda y chip y un medallón con palomita. Archivos listos (no regenerar): `mark.svg`, `icon*.svg`, PNG de 192/512/maskable, `apple-touch-icon.png` y `favicon.ico` (16/32/48). En la app lo dibuja `components/ui/Logo.tsx` con los tokens (tarjeta pop1, medallón pop2, banda/borde/palomita `--logo-dot`).
- **Saludo**: avatar circular con degradado pop1→pop3, "Buenas tardes / Rodrigo" (según hora local). Reemplaza al logo en la barra superior en móvil.
- **Héroe**: marino con tres círculos (pop3 118px arriba-derecha, pop2 54px, pop1 90px abajo-izquierda) recortados por el borde. Botones píldora blanco/translúcido. Anillo cónico con el % de disponible.
- **Bloques de cifras**: tres tiles de color sólido (pop1/pop4/pop3) con ícono en círculo blanco.
- **Secciones**: tarjeta blanca, título + chip verde suave a la derecha.
- **Filas** (`.it`): fondo del page, radio 18, ícono circular en marca suave, monto 800 a la derecha, acciones en círculos de 36px.
- **Tarjeta de crédito**: marino con círculo pop2 en la esquina, montos 26px, barra de límite pop1, chips de fecha (vencido = rojo sólido, pagado = pop1), botones píldora, nota translúcida cuando venció.
- **Presupuestos**: dos columnas, barra pop1 (ámbar ≥80%, rojo ≥100%).
- **Barra inferior** (móvil): flotante, cristal, radio 28, activa en marca. **Escritorio**: rail izquierdo de 232px con el nombre arriba y las cinco secciones.
- **FAB**: círculo marino 56px (60 en escritorio), en noche color marca.
- **Hojas** (`.sheet`): suben desde abajo en móvil; centradas en escritorio.

## Animaciones (todas respetan `prefers-reduced-motion`)
- Easing "spring": `cubic-bezier(.22,1.1,.3,1)`; "ease": `cubic-bezier(.2,.8,.2,1)`.
- Cambio de pestaña: la vista nueva entra deslizando 40px desde el lado correspondiente al orden de pestañas (derecha si avanzas, izquierda si retrocedes), 0.5s spring; cada bloque hijo con retraso de 45ms×índice (máx. 9). En Inicio el saldo cuenta de 0 al valor en 750ms (ease-out cúbico).
- Hojas modales: `translateY(100%)→0` 0.5s spring; la app detrás `scale(.94) translateY(10px)` y radio 28 (en escritorio `scale(.97)`). Cierre inverso en 320ms.
- Presión: todo botón/tile/fila `scale(.96)` en `:active`, 180ms spring; nav `scale(.88)`.
- Barras (reparto, presupuesto, límite, metas, distribuciones): `transition: width .9s ease`. Anillos: `--p` animado con `@property`.
- Registro rápido: teclado numérico propio (3×4, teclas píldora 52px); cada dígito nuevo "brota" (`popd`: opacidad 0 + translateY(10px) + scale(.6) → normal, 320ms spring).
- Confirmación (Pagado, Transferir): overlay a pantalla completa con `clip-path: circle(0 at x y)` desde el botón → `circle(150%)` en 650ms; palomita dibujada con `stroke-dashoffset`; monto 36px/800; se cierra sola a los 2.6s o al tocar. Color: pop1 (pagado), azul 500 `#1f3f9c` (transferencia).
- Toast: sube 20px con spring; "Deshacer" 44px.

## Reglas
- El color de dinero (entra/sale/apartado) solo en montos, chips de estado y barras de presupuesto/distribución de gastos. pop1–4 son decoración y categorías de reparto; no significan nada.
- Gráficas (Recharts): ejes y etiquetas con la fuente de la app y `fill` de token; **nunca** heredar el `stroke` de los íconos. Tendencia como curva suave con área bajo activos y punto final resaltado; ticks "bonitos" (1/2/2.5/5×10ⁿ); comparación mensual con el valor encima de cada barra; distribuciones en barras horizontales ordenadas.
- Copys: sentence case, sin mayúsculas espaciadas, sin " · " dentro de frases, sin emojis.
- Accesibilidad: foco visible (anillo marca 2px), botones ≥44px (36px en acciones de fila), contraste AA en ambos temas.

## Plan de trabajo
1. Rama `redesign-pop` desde `main`.
2. Tokens: `globals.css` (claro/noche), `tailwind.config.js` (escalas completas de HeroUI: primary = marino, success/danger/warning = dinero), fuente en `layout.tsx`.
3. Inicio: saludo, héroe, bloques, reparto, Por pagar, listas, tarjeta, presupuestos, metas. Verificar en pantalla contra el HTML a 390 y 1366px, claro y noche.
4. Movs, Análisis, IA, Historial, en ese orden.
5. Modales y hojas (incluido el teclado numérico en Registro rápido) y la confirmación con círculo.
6. Barra inferior móvil / rail de escritorio, FAB, toast.
7. Animaciones de pestaña y hojas (framer-motion ya está instalado; usar `AnimatePresence`).
8. `npm run test:e2e` en verde; actualizar capturas; barrido de clases sueltas.
9. Push de la rama → preview de Vercel → revisión visual de Rodrigo → `main`.

Un commit por pantalla. Preguntar solo si algo del HTML no se puede reproducir con el stack.
