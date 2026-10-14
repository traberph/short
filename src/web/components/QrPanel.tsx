import { useEffect, useState } from "react";
import QRCode, { type QRCodeErrorCorrectionLevel } from "qrcode";

const LEVELS: QRCodeErrorCorrectionLevel[] = ["L", "M", "Q", "H"];

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

export function QrPanel({ url, name }: { url: string; name: string }) {
  const [level, setLevel] = useState<QRCodeErrorCorrectionLevel>("Q");
  const [dark, setDark] = useState("#000000");
  const [light, setLight] = useState("#ffffff");
  const [svg, setSvg] = useState("");

  const options = { errorCorrectionLevel: level, margin: 2, color: { dark, light } };

  useEffect(() => {
    QRCode.toString(url, { errorCorrectionLevel: level, margin: 2, color: { dark, light }, type: "svg" }).then(setSvg, () => setSvg(""));
  }, [url, level, dark, light]);

  const downloadSvg = () => {
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    download(blobUrl, `${name}.svg`);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  };
  const downloadPng = async () => download(await QRCode.toDataURL(url, { ...options, width: 1024 }), `${name}.png`);

  return (
    <section className="card">
      <h2 className="mb-4">QR code</h2>
      <div className="flex flex-wrap gap-6">
        <div
          className="h-40 w-40 overflow-hidden rounded [&>svg]:h-full [&>svg]:w-full"
          // The SVG markup is generated locally by the qrcode library.
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            Error correction:
            {LEVELS.map((l) => (
              <button
                key={l}
                className={`cursor-pointer rounded px-2 ${l === level ? "bg-gray-600 text-white" : "text-gray-400"}`}
                onClick={() => setLevel(l)}
              >
                {l}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-3 normal-case">
            Foreground <input type="color" value={dark} onChange={(e) => setDark(e.target.value)} />
          </label>
          <label className="flex items-center gap-3 normal-case">
            Background <input type="color" value={light} onChange={(e) => setLight(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button className="btn btn-secondary py-1" onClick={downloadSvg} disabled={!svg}>
              SVG
            </button>
            <button className="btn btn-secondary py-1" onClick={downloadPng}>
              PNG
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
