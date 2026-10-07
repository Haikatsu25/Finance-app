
## Verificación obligatoria

Antes de dar por terminado cualquier cambio de interfaz o de lógica de finanzas:

1. `npx tsc --noEmit` y `npm test` (pruebas unitarias de `lib/`).
2. `npm run test:e2e` (Playwright, proyectos `chromium-desktop` y `chromium-mobile`). Debe quedar en verde.
3. Adjunta al resumen final el resultado de las pruebas y las capturas del recorrido visual de
   `test-results/visual/` (pestañas y modales, claro/oscuro, escritorio/móvil).

Si una prueba falla, se arregla el código o la prueba; nunca se omite. Detalles y escenarios en `docs/e2e-plan.md`.
Las pruebas E2E solo corren contra la base `finance-test` y llaves `pk_test_`/`sk_test_` (lo verifica `tests/e2e/env.ts`).
Tras cambiar CSS o configuración de Tailwind, reinicia el servidor de desarrollo: no recompila las clases nuevas en caliente.
