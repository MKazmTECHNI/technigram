"use client";

import { useState, useCallback, useRef } from "react";
import Cropper, { Area } from "react-easy-crop";

type CropModalProps = {
  imageSrc: string;
  aspect: number;
  onCrop: (blob: Blob) => void;
  onCancel: () => void;
};

export default function CropModal({ imageSrc, aspect, onCrop, onCancel }: CropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels || croppedAreaPixels.width === 0 || croppedAreaPixels.height === 0) return;
    const canvas = document.createElement("canvas");
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(
      image,
      croppedAreaPixels.x, croppedAreaPixels.y,
      croppedAreaPixels.width, croppedAreaPixels.height,
      0, 0,
      croppedAreaPixels.width, croppedAreaPixels.height
    );

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    onCrop(blob);
  }, [imageSrc, croppedAreaPixels, onCrop]);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: "rgba(0,0,0,0.85)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: "90vw", height: "70vh", background: "#111", borderRadius: 12, overflow: "hidden" }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 16, alignItems: "center" }}>
        <input
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          style={{ width: 200 }}
        />
        <button
          onClick={handleConfirm}
          style={{
            padding: "10px 32px", borderRadius: 20, border: "none",
            background: "#c6a4ff", color: "#181818", fontWeight: 600,
            cursor: "pointer", fontSize: "1em",
          }}
        >
          Confirm
        </button>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 32px", borderRadius: 20, border: "1px solid #555",
            background: "transparent", color: "#fff", fontWeight: 600,
            cursor: "pointer", fontSize: "1em",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}