"use client";

import React from "react";
import { Card, CardBody, Button } from "@heroui/react";
import { Wand2 } from "lucide-react";

export function DemoDataBanner({ onClear }: { onClear: () => void }) {
  return (
    <Card className="glass border border-amber-500/30">
      <CardBody className="p-3 flex flex-row items-center gap-3">
        <Wand2 size={16} className="text-amber-500 shrink-0" />
        <p className="text-xs text-default-600 flex-1">
          Estás explorando con <span className="font-bold">datos de ejemplo</span>. Juega con todo — nada es real.
        </p>
        <Button size="sm" color="warning" variant="flat" className="font-bold shrink-0" onPress={onClear}>
          Borrar ejemplo y empezar
        </Button>
      </CardBody>
    </Card>
  );
}
