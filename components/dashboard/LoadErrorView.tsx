"use client";

import React from "react";
import { Button } from "@heroui/react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export function LoadErrorView() {
  return (
    <main className="max-w-lg mx-auto px-6 py-24 text-center">
      <div className="glass p-8 animate-fade-in-scale">
        <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-amber-500" />
        <h2 className="text-lg font-bold mb-2">No pudimos cargar tus datos</h2>
        <p className="text-sm text-default-500 mb-6">
          Revisa tu conexión a internet. Tus datos siguen seguros en el servidor.
        </p>
        <Button
          color="primary"
          variant="shadow"
          startContent={<RefreshCw size={16} />}
          onPress={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </div>
    </main>
  );
}
