# Plan de pruebas E2E (Playwright + Clerk)

Objetivo: que las pruebas corran solas, sin intervención humana, contra el
servidor local y la base `finance-test`. Son el criterio para dar por
terminado cualquier cambio de UI y para decidir si `redesign-rotulado`
pasa a `main`.

## Instalación

- `npm i -D @playwright/test @clerk/testing`
- `playwright.config.ts`:
  - `webServer`: `npm run dev` con la precarga de DNS
    (`NODE_OPTIONS=--require <ruta>/dns-fix.cjs`), `reuseExistingServer: true`.
  - `baseURL`: `http://localhost:3000`.
  - `use`: `screenshot: 'only-on-failure'`, `trace: 'retain-on-failure'`.
  - Proyectos: `chromium-desktop` (1366x900), `chromium-mobile` (390x844) y `mobile-small`
    (360x780; solo corre el recorrido visual y la prueba 14).
- Script en `package.json`: `"test:e2e": "playwright test"`.
- Carpeta: `tests/e2e/`. Capturas de recorrido en `test-results/visual/`
  (ignorado en git).

## Autenticación

- `global-setup.ts` llama a `clerkSetup()` (lee `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  y `CLERK_SECRET_KEY` de `.env.local`, instancia de desarrollo).
- En cada test, `setupClerkTestingToken({ page })` antes de navegar: salta
  el anti-bots de Cloudflare.
- Usuario de prueba: correo `e2e+clerk_test@example.com`, código
  de verificación `424242`. (El plan original usaba `@finance-control.test`, pero Clerk
  rechaza ese dominio con 422 `form_param_format_invalid`; `example.com` es el dominio
  reservado para pruebas.) El inicio de sesión usa `clerk.signIn({ emailAddress })`, que
  no necesita el código. Si no existe, crearlo con la Backend API de
  Clerk desde el global-setup (`clerkClient.users.createUser`).
- Guardar `storageState` en `tests/e2e/.auth/user.json` tras el primer
  login y reutilizarlo en todos los tests. `.auth/` ignorado en git.

## Limpieza

- En el global-setup, borrar el documento de finanzas del usuario de
  prueba en `finance-test` (por `userId`) para que cada corrida empiece
  vacía. Nunca tocar otra base.

## Escenarios

1. **Carga con sesión**: al entrar, exactamente un `GET /api/finance`
   con 200 y cero respuestas 401. Sin errores en consola.
2. **Sin sesión**: la landing no hace ninguna petición a `/api/finance`.
3. **Datos de ejemplo**: tocar "Cargar datos de ejemplo"; aparecen
   activos, tarjeta "Nu (ejemplo)" y presupuestos.
4. **Pago vencido**: crear una tarjeta con día de pago ya pasado este
   mes (día 1), saldo de contado 1000. Debe aparecer "Pago vencido" en la
   tarjeta y en "Por pagar"; el score de salud muestra la penalización
   "Pagos vencidos" (-15); hay un hallazgo "pago VENCIDO" en la pestaña IA.
5. **Pagado**: tocar "Pagado" y confirmar. El modal dice qué ciclo se
   marca ("vence el ..."). Tras confirmar: desaparece el vencido de la
   tarjeta, de "Por pagar" y de IA; el toast dice "Marcaste pagado el
   ciclo del ..."; el score ya no penaliza.
6. **Deshacer**: repetir el paso 5 y pulsar "Deshacer" dentro de la
   ventana del toast; vuelve el vencido.
7. **Persistencia**: tras marcar "Pagado", recargar la página; sigue sin
   vencido. El `GET /api/finance` devuelve `lastPaidCycle` con la fecha
   del ciclo.
8. **Saldo nuevo tras pagar**: con el ciclo pagado, poner de nuevo saldo
   de contado (campo "Reemplazar deuda de contado"). No debe aparecer
   vencido; la tarjeta muestra "Pagas <fecha futura>".
9. **Transferencia**: con dos cuentas de activos, transferir entre ellas;
   el toast dice "Transferiste $X de A a B"; los saldos cambian.
10. **Edición inválida**: abrir "Editar" en un movimiento, poner monto
    vacío o fecha inválida y guardar; el modal NO se cierra y muestra
    error.
11. **Presupuesto duplicado**: intentar crear dos presupuestos de la
    misma categoría; el segundo se rechaza.
12. **Recorrido visual**: para cada pestaña (Inicio, Movs, Análisis, IA,
    Historial) y cada modal (registro rápido, transferir, editar,
    snapshot, ajustes, importar, limpiar historial), en claro y oscuro,
    en los dos proyectos (desktop y mobile):
    - captura en `test-results/visual/<pestaña>-<tema>-<viewport>.png`
    - cero errores de consola
    - ningún elemento con `scrollWidth > clientWidth` (sin desborde
      horizontal)
    - todos los `button` visibles miden al menos 36x36 px; los de acción
      principal 44x44.
14. **Móvil, nada se corta**: con datos reales ("Quincena 30 sep",
    "Fondo de emergencia…") y también con la fuente del sistema al 120 %
    (tamaño raíz ×1.2; todo está en `rem`): ningún `.it b` ni disparador
    de Picker (`.pk-btn`, `.pk-val`, filas del Picker) tiene
    `scrollWidth > clientWidth`.

## Criterio de éxito

`npm run test:e2e` termina en verde en los tres proyectos. Si algo falla,
se arregla el código o la prueba (si la prueba estaba mal), nunca se
salta el escenario.

## CLAUDE.md

Agregar una sección "Verificación obligatoria": antes de dar por
terminado cualquier cambio de UI o de lógica de finanzas, correr
`npm run test:e2e` y adjuntar el resumen y las capturas del recorrido
visual al reporte.
