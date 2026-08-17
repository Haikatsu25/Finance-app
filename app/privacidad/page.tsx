import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Aviso de Privacidad — Finance Control",
    description: "Aviso de privacidad de Finance Control conforme a la LFPDPPP.",
};

// ─────────────────────────────────────────────────────────────────
// Aviso de privacidad conforme a la Ley Federal de Protección de
// Datos Personales en Posesión de los Particulares (México).
// Plantilla de buena fe — para uso comercial, revísala con un
// profesional legal.
// ─────────────────────────────────────────────────────────────────

const CONTACT_EMAIL = "rodrigomedranoo@gmail.com";
const LAST_UPDATE = "Agosto de 2026";

export default function PrivacidadPage() {
    return (
        <main className="max-w-3xl mx-auto px-6 py-12 text-foreground">
            <Link href="/" className="text-sm text-emerald-500 hover:underline">← Volver a Finance Control</Link>

            <h1 className="text-3xl font-black tracking-tight mt-6 mb-2">Aviso de Privacidad</h1>
            <p className="text-sm text-default-400 mb-8">Última actualización: {LAST_UPDATE}</p>

            <div className="space-y-6 text-sm leading-relaxed text-default-600">
                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">1. Responsable del tratamiento</h2>
                    <p>
                        Finance Control (en adelante, &quot;la Aplicación&quot;) es operada por su titular, con domicilio en
                        México, quien es responsable del tratamiento de tus datos personales conforme a la Ley Federal de
                        Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Para cualquier asunto
                        relacionado con este aviso puedes escribir a <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-500 hover:underline">{CONTACT_EMAIL}</a>.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">2. Datos que recabamos</h2>
                    <p>
                        Al crear tu cuenta recabamos tu nombre, correo electrónico y, en su caso, la imagen de perfil que
                        proporciones a través de nuestro proveedor de autenticación. Durante el uso de la Aplicación se
                        almacena la información financiera que tú registras voluntariamente: montos de activos, gastos,
                        apartados, movimientos, presupuestos, metas de ahorro, y datos de tus tarjetas de crédito limitados a
                        nombre o alias de la tarjeta, saldos que capturas, límite de crédito y días de corte y pago.
                        <strong className="text-foreground"> Nunca solicitamos ni almacenamos números completos de tarjeta,
                        códigos de seguridad (CVV), NIP ni credenciales bancarias.</strong> Si activas los recordatorios,
                        se guarda un identificador técnico de notificaciones de tu dispositivo. Si usas el asistente de voz,
                        el audio se procesa localmente en tu navegador y no se almacena.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">3. Finalidades del tratamiento</h2>
                    <p>
                        Tus datos se utilizan exclusivamente para operar las funciones de la Aplicación: mostrar y calcular
                        tus finanzas, enviarte los recordatorios de fechas de corte y pago que tú actives, sincronizar tu
                        información entre tus dispositivos, compartir tus datos con los miembros que tú invites expresamente
                        a tus cuentas compartidas, y generar respuestas del asistente de inteligencia artificial cuando tú
                        lo consultes. No utilizamos tus datos para publicidad, no los vendemos ni los compartimos con
                        terceros con fines comerciales.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">4. Encargados y transferencias</h2>
                    <p>
                        Para funcionar, la Aplicación se apoya en proveedores de infraestructura que actúan como encargados
                        del tratamiento: Clerk (autenticación de usuarios), MongoDB Atlas (almacenamiento cifrado de la base
                        de datos), Vercel (alojamiento de la Aplicación) y los servicios de notificaciones push de tu
                        navegador (Google, Apple o Mozilla, según tu dispositivo). Cuando consultas al asistente de IA, un
                        resumen agregado de tus finanzas (totales y categorías, junto con tu pregunta) se envía a Google
                        (API de Gemini) únicamente para generar la respuesta. Estos proveedores pueden procesar datos fuera
                        de México bajo sus propias medidas de seguridad. Fuera de estos encargados, no se realizan
                        transferencias de tus datos personales.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">5. Derechos ARCO</h2>
                    <p>
                        Tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales
                        (derechos ARCO), así como a revocar tu consentimiento. Puedes ejercerlos directamente desde la
                        Aplicación —editando o eliminando tus registros, exportando tu información desde Ajustes, o
                        eliminando tu cuenta— o enviando tu solicitud a{" "}
                        <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-500 hover:underline">{CONTACT_EMAIL}</a>,
                        indicando tu nombre, el correo asociado a tu cuenta y el derecho que deseas ejercer. Responderemos
                        en un plazo máximo de 20 días hábiles.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">6. Seguridad y conservación</h2>
                    <p>
                        Tus datos viajan siempre cifrados (HTTPS/TLS) y se almacenan en infraestructura con cifrado en
                        reposo. El acceso a tu información requiere tu autenticación, y opcionalmente el bloqueo biométrico
                        de tu dispositivo. Conservamos tus datos mientras tu cuenta esté activa; al eliminarla, tu
                        información se elimina de nuestra base de datos.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">7. Cuentas compartidas</h2>
                    <p>
                        Si te unes a unas cuentas compartidas o invitas a alguien a las tuyas, los miembros del grupo verán
                        y podrán editar la información financiera del grupo, incluyendo la indicación de quién agregó cada
                        registro. Puedes salir del grupo en cualquier momento desde Ajustes.
                    </p>
                </section>

                <section>
                    <h2 className="text-lg font-bold text-foreground mb-2">8. Cambios a este aviso</h2>
                    <p>
                        Cualquier modificación a este aviso se publicará en esta misma página, actualizando la fecha de
                        &quot;última actualización&quot;. El uso continuado de la Aplicación tras un cambio implica tu
                        conocimiento del aviso vigente.
                    </p>
                </section>
            </div>
        </main>
    );
}
