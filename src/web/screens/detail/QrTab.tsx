import { useEffect, useState } from "react";
import QRCode, { type QRCodeErrorCorrectionLevel } from "qrcode";
import { Download } from "lucide-react";
import { Button } from "../../components/ui/button.js";
import { ColorInput, Segmented } from "../../components/ui/form.js";
import { Card, CardFooter, CardHeader } from "../../components/ui/surface.js";

const LEVELS: { value: QRCodeErrorCorrectionLevel; label: string; detail: string }[] = [
  { value: "L", label: "L", detail: "Low (7%): smallest code" },
  { value: "M", label: "M", detail: "Medium (15%)" },
  { value: "Q", label: "Q", detail: "Quartile (25%): good for print" },
  { value: "H", label: "H", detail: "High (30%): survives damage or a logo on top" },
];

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function QrTab({ url, name }: { url: string; name: string }) {
  const [level, setLevel] = useState<QRCodeErrorCorrectionLevel>("Q");
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    QRCode.toString(url, { type: "svg", errorCorrectionLevel: level, margin: 2, color: { dark, light } }).then(setSvg, () => setSvg(""));
  }, [url, level, dark, light]);

  const downloadSvg = () => {
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(blobUrl, `${name}.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  const downloadPng = async () =>
    download(await QRCode.toDataURL(url, { errorCorrectionLevel: level, margin: 2, color: { dark, light }, width: 1024 }), `${name}.png`);

  return (
    <Card>
      <CardHeader title="QR code" description={<span className="font-mono">{url}</span>} />
      <div className="grid gap-8 p-5 md:grid-cols-[auto_1fr]">
        <div
          className="mx-auto size-56 overflow-hidden rounded-xl border border-border shadow-sm [&>svg]:size-full"
          // The SVG markup is generated locally by the qrcode library.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Error correction</span>
            <Segmented ariaLabel="Error correction" value={level} onChange={setLevel} options={LEVELS} />
            <p className="text-xs text-muted">{LEVELS.find((l) => l.value === level)?.detail}</p>
          </div>
          <div className="grid max-w-md grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Foreground</span>
              <ColorInput label="Foreground" value={dark} onChange={setDark} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Background</span>
              <ColorInput label="Background" value={light} onChange={setLight} />
            </div>
          </div>
        </div>
      </div>
      <CardFooter>
        <span className="mr-auto hidden text-sm text-muted sm:block">SVG scales without quality loss and is best for print.</span>
        <Button variant="secondary" icon={<Download />} onClick={() => void downloadPng()}>
          PNG
        </Button>
        <Button icon={<Download />} onClick={downloadSvg} disabled={!svg}>
          SVG
        </Button>
      </CardFooter>
    </Card>
  );
}
