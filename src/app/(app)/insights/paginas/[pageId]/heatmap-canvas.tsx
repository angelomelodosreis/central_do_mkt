"use client";

import { useEffect, useRef, useState } from "react";
import {
  Monitor,
  Smartphone,
  Sliders,
  Layers,
  Info,
  Globe,
  Image as ImageIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Eye,
  Flame,
  MousePointerClick,
} from "lucide-react";
import type { CtaHotspot, HeatmapPoint, ScrollDepthData } from "@/lib/modules/insights/queries";
import { cn } from "@/lib/utils/cn";

export type HeatmapMode = "density" | "points" | "scroll" | "clean";

interface HeatmapCanvasProps {
  viewport: "desktop" | "mobile";
  mode: HeatmapMode;
  screenshotUrl: string | null;
  pageUrl: string;
  densityPoints: HeatmapPoint[];
  maxWeight: number;
  ctaHotspots: CtaHotspot[];
  scrollDepth: ScrollDepthData[];
  totalVisits: number;
  totalClicks: number;
}

export function HeatmapCanvas({
  viewport,
  mode,
  screenshotUrl,
  pageUrl,
  densityPoints,
  maxWeight,
  ctaHotspots,
  scrollDepth,
  totalVisits,
  totalClicks,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [displaySource, setDisplaySource] = useState<"iframe" | "screenshot">("iframe");
  const [iframeKey, setIframeKey] = useState(0);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [zoomScale, setZoomScale] = useState<number>(viewport === "mobile" ? 1 : 0.75);

  const [radius, setRadius] = useState<number>(viewport === "mobile" ? 24 : 34);
  const [opacity, setOpacity] = useState<number>(0.75);
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    subtitle: string;
    count: number;
  } | null>(null);

  // Dimensões exatas do viewport virtual da página
  const targetWidth = viewport === "mobile" ? 390 : 1200;
  const targetHeight = viewport === "mobile" ? 3200 : 2800;

  // Ajusta zoom padrão ao trocar viewport
  useEffect(() => {
    if (viewport === "mobile") {
      setZoomScale(1);
    } else {
      setZoomScale(0.75);
    }
  }, [viewport]);

  // Renderizador do Mapa de Calor via Canvas 2D
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    if (mode === "density" && densityPoints.length > 0) {
      renderDensityHeatmap(ctx, targetWidth, targetHeight, densityPoints, maxWeight, radius, opacity);
    } else if (mode === "scroll" && scrollDepth.length > 0) {
      renderScrollmap(ctx, targetWidth, targetHeight, scrollDepth);
    }
  }, [mode, densityPoints, maxWeight, radius, opacity, scrollDepth, targetWidth, targetHeight]);

  const proxyUrl = `/api/insights/preview-proxy?url=${encodeURIComponent(pageUrl)}`;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Barra de Ferramentas Superior do Heatmap */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-2xs w-full max-w-5xl">
        {/* Toggle Iframe Ao Vivo vs Screenshot */}
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setDisplaySource("iframe")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition",
              displaySource === "iframe"
                ? "bg-white text-brand-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Globe className="size-3.5" />
            Iframe Ao Vivo (Site Real)
          </button>
          <button
            type="button"
            onClick={() => setDisplaySource("screenshot")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold transition",
              displaySource === "screenshot"
                ? "bg-white text-brand-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ImageIcon className="size-3.5" />
            Screenshot / Mockup
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Zoom:</span>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 font-mono text-[11px]">
            {[
              { label: "50%", scale: 0.5 },
              { label: "65%", scale: 0.65 },
              { label: "75%", scale: 0.75 },
              { label: "100%", scale: 1 },
            ].map((z) => (
              <button
                key={z.scale}
                type="button"
                onClick={() => setZoomScale(z.scale)}
                className={cn(
                  "rounded-lg px-2 py-0.5 transition",
                  zoomScale === z.scale
                    ? "bg-white font-bold text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                {z.label}
              </button>
            ))}
          </div>
          {displaySource === "iframe" && (
            <button
              type="button"
              onClick={() => {
                setIsIframeLoading(true);
                setIframeKey((k) => k + 1);
              }}
              title="Recarregar Iframe"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500"
            >
              <RefreshCw className="size-3.5" />
            </button>
          )}
        </div>

        {/* Controles de intensidade do Heatmap */}
        {mode === "density" && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>Opacidade:</span>
              <input
                type="range"
                min="10"
                max="100"
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(parseInt(e.target.value, 10) / 100)}
                className="h-1.5 w-20 accent-brand-600 cursor-pointer"
              />
              <span className="font-mono w-7 text-right text-slate-800">
                {Math.round(opacity * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span>Raio:</span>
              <input
                type="range"
                min="14"
                max="50"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value, 10))}
                className="h-1.5 w-16 accent-brand-600 cursor-pointer"
              />
              <span className="font-mono w-6 text-right text-slate-800">{radius}px</span>
            </div>
          </div>
        )}
      </div>

      {/* Frame de Dispositivo com Zoom Aplicado */}
      <div
        className="overflow-x-auto w-full flex justify-center py-2"
        style={{ minHeight: "650px" }}
      >
        <div
          ref={containerRef}
          style={{
            width: targetWidth,
            transform: `scale(${zoomScale})`,
            transformOrigin: "top center",
            marginBottom: zoomScale < 1 ? `-${Math.round((1 - zoomScale) * 780)}px` : "0px",
          }}
          className="relative rounded-2xl border-4 border-slate-800 bg-slate-950 shadow-2xl overflow-hidden transition-transform duration-200 shrink-0"
        >
          {/* Barra superior estilo Browser */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2 text-xs text-slate-400 select-none">
            <div className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="size-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="size-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1 font-mono text-[11px] text-slate-300 max-w-md truncate">
              <span className="text-emerald-400">🔒</span>
              <span className="truncate">{pageUrl}</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span className="inline-block size-2 rounded-full bg-emerald-500" />
              <span>Cloudflare Edge</span>
              <span>·</span>
              <span>{viewport === "mobile" ? "390 × 3200 (iPhone)" : "1200 × 2800 (Desktop)"}</span>
            </div>
          </div>

          {/* Área de Visualização com Scroll Sincronizado */}
          <div className="relative h-[720px] overflow-y-auto overflow-x-hidden bg-slate-900 scroll-smooth">
            {/* CONTAINER UNIFICADO: Iframe + Canvas + Hotspots compartilham exatamente o mesmo espaço */}
            <div
              className="relative"
              style={{ width: targetWidth, height: targetHeight, minHeight: targetHeight }}
            >
              {/* CAMADA 0: IFRAME AO VIVO OU SCREENSHOT */}
              {displaySource === "iframe" ? (
                <>
                  {isIframeLoading && (
                    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 text-white backdrop-blur-xs">
                      <div className="size-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
                      <span className="text-xs font-semibold">Carregando visualização ao vivo de {pageUrl}...</span>
                      <span className="text-[11px] text-slate-400 mt-1">Conectando via Cloudflare Edge</span>
                    </div>
                  )}
                  <iframe
                    key={iframeKey}
                    src={proxyUrl}
                    title="Landing Page Live Preview"
                    onLoad={() => setIsIframeLoading(false)}
                    style={{
                      width: targetWidth,
                      height: targetHeight,
                      border: "none",
                    }}
                    className="w-full h-full bg-white select-none pointer-events-none"
                  />
                </>
              ) : screenshotUrl ? (
                <img
                  src={screenshotUrl}
                  alt="Screenshot da Landing Page"
                  className="w-full object-top select-none pointer-events-none"
                  style={{ width: targetWidth, minHeight: targetHeight }}
                />
              ) : (
                /* Mockup Ilustrativo MedCof */
                <div
                  style={{ width: targetWidth, height: targetHeight }}
                  className="relative w-full bg-radial from-slate-900 via-slate-950 to-black p-8 text-slate-300"
                >
                  <div className="space-y-16 opacity-90">
                    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-10 text-center space-y-4">
                      <div className="inline-block rounded-full bg-brand-500/10 px-4 py-1 text-xs font-semibold text-brand-400">
                        MedCof Oficial · Preparatório & Residência
                      </div>
                      <h1 className="text-3xl font-extrabold tracking-tight text-white max-w-xl mx-auto">
                        A sua aprovação na residência médica começa aqui.
                      </h1>
                      <p className="text-sm text-slate-400 max-w-md mx-auto">
                        Mais de 8.000 médicos aprovados nas instituições mais concorridas do país.
                      </p>
                      <div className="pt-4 flex justify-center gap-3">
                        <span className="rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-brand-500/20">
                          Quero me matricular
                        </span>
                        <span className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-300">
                          Conhecer metodologia
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CAMADA 1: CANVAS TÉRMICO 2D (Sincronizado 1:1 com a página) */}
              <canvas
                ref={canvasRef}
                width={targetWidth}
                height={targetHeight}
                style={{ width: targetWidth, height: targetHeight }}
                className={cn(
                  "absolute inset-0 pointer-events-none transition-opacity duration-300 z-10",
                  mode === "clean" || mode === "points" ? "opacity-0" : "opacity-100"
                )}
              />

              {/* CAMADA 2: HOTSPOTS DE CLIQUES E CTAS */}
              {(mode === "points" || mode === "density") && (
                <div
                  className="absolute inset-0 pointer-events-auto z-20"
                  style={{ width: targetWidth, height: targetHeight }}
                >
                  {ctaHotspots.map((cta, index) => {
                    const pixelX = (cta.x / 1000) * targetWidth;
                    const pixelY = (cta.y / 1000) * targetHeight;
                    const isTop1 = index === 0;

                    return (
                      <div
                        key={cta.elementId}
                        style={{ left: pixelX, top: pixelY }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                        onMouseEnter={() => {
                          setActiveTooltip({
                            x: pixelX,
                            y: pixelY,
                            title: cta.elementLabel,
                            subtitle: `ID: ${cta.elementId}${cta.sectionId ? ` · Seção: ${cta.sectionId}` : ""}`,
                            count: cta.clicks,
                          });
                        }}
                        onMouseLeave={() => setActiveTooltip(null)}
                      >
                        {isTop1 && (
                          <span className="absolute -inset-2 animate-ping rounded-full bg-rose-500 opacity-60" />
                        )}

                        <div
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold shadow-xl ring-2 transition-transform group-hover:scale-125",
                            isTop1
                              ? "bg-rose-600 text-white ring-rose-300"
                              : "bg-slate-900/90 text-white ring-amber-400 backdrop-blur-md"
                          )}
                        >
                          <span className="size-2 rounded-full bg-amber-400" />
                          <span>{cta.clicks}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TOOLTIP INTERATIVO DE CTA */}
              {activeTooltip && (
                <div
                  style={{
                    left: Math.min(targetWidth - 220, Math.max(20, activeTooltip.x - 100)),
                    top: Math.max(10, activeTooltip.y - 75),
                  }}
                  className="absolute pointer-events-none z-50 rounded-xl border border-slate-700 bg-slate-900/95 p-2.5 text-xs text-white shadow-2xl backdrop-blur-md transition-all w-52"
                >
                  <div className="font-bold text-amber-400 truncate">{activeTooltip.title}</div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">
                    {activeTooltip.subtitle}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between border-t border-slate-800 pt-1 text-[11px]">
                    <span className="text-slate-400">Total de cliques:</span>
                    <span className="font-bold text-white">{activeTooltip.count}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Motor de Renderização Térmica (Canvas 2D)
 */
function renderDensityHeatmap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  points: HeatmapPoint[],
  maxWeight: number,
  radius: number,
  opacity: number
) {
  const shadowCanvas = document.createElement("canvas");
  shadowCanvas.width = width;
  shadowCanvas.height = height;
  const sCtx = shadowCanvas.getContext("2d");
  if (!sCtx) return;

  const brushCanvas = document.createElement("canvas");
  brushCanvas.width = radius * 2;
  brushCanvas.height = radius * 2;
  const bCtx = brushCanvas.getContext("2d");
  if (bCtx) {
    const radGrad = bCtx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    radGrad.addColorStop(0, "rgba(0, 0, 0, 1)");
    radGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
    bCtx.fillStyle = radGrad;
    bCtx.fillRect(0, 0, radius * 2, radius * 2);
  }

  for (const pt of points) {
    const px = (pt.x / 1000) * width;
    const py = (pt.y / 1000) * height;
    const alpha = Math.min(1, Math.max(0.12, pt.weight / Math.max(1, maxWeight * 0.75)));
    sCtx.globalAlpha = alpha;
    sCtx.drawImage(brushCanvas, px - radius, py - radius);
  }

  const image = sCtx.getImageData(0, 0, width, height);
  const data = image.data;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      const normalizedAlpha = alpha / 255;
      const rgb = getHeatColor(normalizedAlpha);
      data[i] = rgb.r;
      data[i + 1] = rgb.g;
      data[i + 2] = rgb.b;
      data[i + 3] = Math.round(alpha * opacity);
    }
  }

  ctx.putImageData(image, 0, 0);
}

function getHeatColor(v: number): { r: number; g: number; b: number } {
  if (v <= 0.25) {
    const t = v / 0.25;
    return { r: 0, g: Math.round(t * 255), b: 255 };
  } else if (v <= 0.5) {
    const t = (v - 0.25) / 0.25;
    return { r: 0, g: 255, b: Math.round((1 - t) * 255) };
  } else if (v <= 0.75) {
    const t = (v - 0.5) / 0.25;
    return { r: Math.round(t * 255), g: 255, b: 0 };
  } else {
    const t = (v - 0.75) / 0.25;
    return { r: 255, g: Math.round((1 - t) * 255), b: 0 };
  }
}

function renderScrollmap(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  scrollDepth: ScrollDepthData[]
) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "rgba(239, 68, 68, 0.45)");
  grad.addColorStop(0.25, "rgba(245, 158, 11, 0.35)");
  grad.addColorStop(0.5, "rgba(16, 185, 129, 0.25)");
  grad.addColorStop(0.75, "rgba(59, 130, 246, 0.20)");
  grad.addColorStop(1, "rgba(15, 23, 42, 0.35)");

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  scrollDepth.forEach((item) => {
    if (item.percent === 0) return;
    const y = (item.percent / 100) * height;

    ctx.beginPath();
    ctx.setLineDash([8, 6]);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();

    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(width - 160, y - 14, 150, 26);

    ctx.setLineDash([]);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.strokeRect(width - 160, y - 14, 150, 26);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(`${item.percent}% da página: ${item.retentionRate}%`, width - 150, y + 4);
  });
}
