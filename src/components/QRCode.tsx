"use client"

import { useQRCode } from "next-qrcode"
import { useState } from "react";

export default function QRCode({ url }: { url: string }) {

    const { Canvas } = useQRCode();

    const values = ['L', 'M', 'Q', 'H'];

    const [errorCorrectionLevel, setErrorCorrectionLevel] = useState(2);
    const [dark, setDark] = useState('#000000');
    const [light, setLight] = useState('#FFFFFF');


    return (<>

        <div className="flex justify-between max-sm:flex-col">
            <div className="flex justify-between flex-col">
                <h2>QR Code</h2>
                <span className="flex items-center justify-between"> Error Correction Level:
                    <div className="flex justify-between">
                        {values.map((value, index) => (
                            <span
                                key={index}
                                className={`cursor-pointer mx-2 ${errorCorrectionLevel === index ? 'text-white' : 'text-gray-400'}`}
                                onClick={() => setErrorCorrectionLevel(index)}>
                                {value}
                            </span>
                        ))}
                    </div>
                </span>
                <span className="flex items-center justify-between">
                    Dark:
                    <input type="color" className="ml-3 w-5 h-5 p-0" value={dark} onChange={(e) => setDark(e.target.value)} />
                </span>
                <span className="flex items-center justify-between">
                    Light:
                    <input type="color" className="ml-3 w-5 h-5 p-0" value={light} onChange={(e) => setLight(e.target.value)} />
                </span>
            </div>
            <div className="max-sm:mt-5">
                <Canvas
                    text={"https://"+ window.location.host + "/" + url}
                    options={{
                        errorCorrectionLevel: values[errorCorrectionLevel],
                        width: 150,
                        color: {
                            dark: dark,
                            light: light
                        }
                    }}
                />
            </div>
        </div>
    </>
    )
}