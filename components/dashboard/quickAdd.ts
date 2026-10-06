export type QuickAddType = "asset" | "liability" | "bucket";

export const QUICK_CATEGORIES: Record<QuickAddType, string[]> = {
  asset:     ["Efectivo", "Banco", "Inversión", "Propiedad", "Otros"],
  liability: ["Tarjeta de Crédito", "Préstamo", "Servicios", "Hogar", "Comida", "Transporte", "Otros"],
  bucket:    ["Emergencia", "Viaje", "Auto", "Regalos", "Ahorro", "Otros"],
};

export type EditKind = "asset" | "liability" | "bucket" | "sub" | "goal";
