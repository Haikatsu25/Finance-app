"use client";

import { Card, CardBody, Button } from "@heroui/react";
import { Wand2 } from "lucide-react";

export function DemoDataBanner({ onClear }: { onClear: () => void }) {
  return (
    <Card className="glass rule-ink shadow-none">
      <CardBody className="p-3 flex flex-row items-center gap-3">
        <Wand2 size={16} className="text-foreground shrink-0" />
        <p className="text-xs text-default-600 flex-1">
          Estás explorando con <span className="font-bold">datos de ejemplo</span>. Juega con todo: nada es real.
        </p>
        <Button size="sm" variant="solid" className="font-bold shrink-0 bg-foreground text-background" onPress={onClear}>
          Borrar ejemplo y empezar
        </Button>
      </CardBody>
    </Card>
  );
}
