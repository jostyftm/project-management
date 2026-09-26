"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { PageOrientation, PageSize, PageHeader, PageFooter } from "@/types/document-type";
import { FileText, Layout, AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface PageSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const PageSettingsModal: React.FC<PageSettingsModalProps> = ({
  open,
  onOpenChange,
}) => {
  const pageSettings = useDocStudioStore((state) => state.pageSettings);
  const setPageSettings = useDocStudioStore((state) => state.setPageSettings);

  const [size, setSize] = React.useState<PageSize>(pageSettings.size);
  const [orientation, setOrientation] = React.useState<PageOrientation>(
    pageSettings.orientation
  );
  const [margins, setMargins] = React.useState(pageSettings.margins);
  const [header, setHeader] = React.useState<PageHeader>(
    pageSettings.header || { enabled: false, text: "", alignment: "right" }
  );
  const [footer, setFooter] = React.useState<PageFooter>(
    pageSettings.footer || { enabled: true, showPageNumber: true, text: "" }
  );

  React.useEffect(() => {
    if (open) {
      setSize(pageSettings.size);
      setOrientation(pageSettings.orientation);
      setMargins(pageSettings.margins);
      setHeader(
        pageSettings.header || { enabled: false, text: "", alignment: "right" }
      );
      setFooter(
        pageSettings.footer || { enabled: true, showPageNumber: true, text: "" }
      );
    }
  }, [open, pageSettings]);

  const handleApplyMarginPreset = (preset: "normal" | "narrow" | "wide") => {
    switch (preset) {
      case "narrow":
        setMargins({ top: 10, right: 10, bottom: 10, left: 10 });
        break;
      case "wide":
        setMargins({ top: 30, right: 30, bottom: 30, left: 30 });
        break;
      case "normal":
      default:
        setMargins({ top: 20, right: 20, bottom: 20, left: 20 });
        break;
    }
  };

  const handleSave = () => {
    setPageSettings({
      size,
      orientation,
      margins,
      header,
      footer,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            <span>Configuración de Página del Documento</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="page" className="w-full mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="page">Hoja y Márgenes</TabsTrigger>
            <TabsTrigger value="header-footer">Encabezado y Pie</TabsTrigger>
          </TabsList>

          <TabsContent value="page" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tamaño de Papel</Label>
                <Select
                  value={size}
                  onValueChange={(val) => setSize(val as PageSize)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccionar tamaño" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a4">A4 (210 x 297 mm)</SelectItem>
                    <SelectItem value="letter">Carta / Letter (8.5 x 11 in)</SelectItem>
                    <SelectItem value="legal">Oficio / Legal (8.5 x 14 in)</SelectItem>
                    <SelectItem value="a5">A5 (148 x 210 mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientación</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant={orientation === "portrait" ? "default" : "outline"}
                    className="w-full flex flex-col h-14 items-center justify-center p-1 text-xs gap-1"
                    onClick={() => setOrientation("portrait")}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Vertical</span>
                  </Button>
                  <Button
                    type="button"
                    variant={orientation === "landscape" ? "default" : "outline"}
                    className="w-full flex flex-col h-14 items-center justify-center p-1 text-xs gap-1"
                    onClick={() => setOrientation("landscape")}
                  >
                    <FileText className="w-4 h-4 rotate-90" />
                    <span>Horizontal</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Márgenes (en milímetros)</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApplyMarginPreset("normal")}
                  >
                    Normal (20)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApplyMarginPreset("narrow")}
                  >
                    Estrecho (10)
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleApplyMarginPreset("wide")}
                  >
                    Ancho (30)
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Superior (mm)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={margins.top}
                    onChange={(e) =>
                      setMargins({ ...margins, top: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Inferior (mm)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={margins.bottom}
                    onChange={(e) =>
                      setMargins({ ...margins, bottom: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Izquierdo (mm)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={margins.left}
                    onChange={(e) =>
                      setMargins({ ...margins, left: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Derecho (mm)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={50}
                    value={margins.right}
                    onChange={(e) =>
                      setMargins({ ...margins, right: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="header-footer" className="space-y-4 pt-4">
            {/* Header section */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-sm">Encabezado superior</Label>
                  <p className="text-xs text-muted-foreground">
                    Texto fijo que se repite en la parte superior de cada página
                  </p>
                </div>
                <Switch
                  checked={header.enabled}
                  onCheckedChange={(checked) =>
                    setHeader({ ...header, enabled: checked })
                  }
                />
              </div>

              {header.enabled && (
                <div className="space-y-2 pt-2 border-t">
                  <Input
                    placeholder="Ej. Confidencial - SDI Report Studio"
                    value={header.text}
                    onChange={(e) =>
                      setHeader({ ...header, text: e.target.value })
                    }
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-2">Alineación:</span>
                    <Button
                      type="button"
                      size="sm"
                      variant={header.alignment === "left" ? "default" : "outline"}
                      className="h-7 w-7 p-0"
                      onClick={() => setHeader({ ...header, alignment: "left" })}
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={header.alignment === "center" ? "default" : "outline"}
                      className="h-7 w-7 p-0"
                      onClick={() => setHeader({ ...header, alignment: "center" })}
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={header.alignment === "right" ? "default" : "outline"}
                      className="h-7 w-7 p-0"
                      onClick={() => setHeader({ ...header, alignment: "right" })}
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer section */}
            <div className="border rounded-md p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="font-semibold text-sm">Pie de página</Label>
                  <p className="text-xs text-muted-foreground">
                    Texto y numeración dinámica de páginas en la parte inferior
                  </p>
                </div>
                <Switch
                  checked={footer.enabled}
                  onCheckedChange={(checked) =>
                    setFooter({ ...footer, enabled: checked })
                  }
                />
              </div>

              {footer.enabled && (
                <div className="space-y-3 pt-2 border-t">
                  <Input
                    placeholder="Texto personalizado en el pie de página..."
                    value={footer.text}
                    onChange={(e) =>
                      setFooter({ ...footer, text: e.target.value })
                    }
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Mostrar número de página (Página X de Y)
                    </span>
                    <Switch
                      checked={footer.showPageNumber}
                      onCheckedChange={(checked) =>
                        setFooter({ ...footer, showPageNumber: checked })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Aplicar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
