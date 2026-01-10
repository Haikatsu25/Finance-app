"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export const startTour = (isDark: boolean) => {
    const driverObj = driver({
        showProgress: true,
        overlayColor: isDark ? '#000000' : '#ffffff',
        theme: isDark ? 'dark' : 'light',
        steps: [
            {
                element: '#tour-welcome',
                popover: {
                    title: 'Bienvenido a Finance Control',
                    description: 'Aquí tienes un resumen rápido de cómo usar la aplicación para dominar tus finanzas.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#balance-card',
                popover: {
                    title: 'Tu Balance Real',
                    description: 'Esta tarjeta te muestra cuánto dinero te queda realmente después de restar tus deudas y apartados a tus activos. ¡Mantenlo en verde!',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#management-sections',
                popover: {
                    title: 'Gestiona tus items',
                    description: 'Aquí agregas tus cuentas bancarias, tarjetas de crédito y sobres de ahorro. Asegúrate de categorizarlos correctamente.',
                    side: "top",
                    align: 'start'
                }
            },
            {
                element: '#save-snapshot-btn',
                popover: {
                    title: 'Guarda tu progreso',
                    description: 'Una vez al mes (o cuando quieras), presiona este botón para guardar una "foto" de tus finanzas en el historial.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#analytics-section',
                popover: {
                    title: 'Analiza tu tendencia',
                    description: 'Visualiza cómo crece tu patrimonio y en qué estás gastando más dinero con estas gráficas interactivas.',
                    side: "top",
                    align: 'start'
                }
            },
        ]
    });

    driverObj.drive();
};
