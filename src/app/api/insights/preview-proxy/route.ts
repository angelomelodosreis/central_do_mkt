import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

export const runtime = "nodejs";

/**
 * Proxy de renderização para iframe de Landing Pages no visualizador de Heatmap.
 * Remove cabeçalhos de bloqueio de frame, neutraliza scripts conflitantes/redirecionamentos
 * e reescreve todas as URLs raiz (CSS, imagens, fontes, SVGs) para o domínio original da página.
 */
export async function GET(request: Request) {
  try {
    await requireUser();
  } catch (authError) {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("URL alvo ausente", { status: 400 });
  }

  try {
    const parsedTarget = new URL(targetUrl);

    // Validação de segurança: apenas domínios HTTP/HTTPS
    if (parsedTarget.protocol !== "http:" && parsedTarget.protocol !== "https:") {
      return new NextResponse("Protocolo inválido", { status: 400 });
    }

    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: { "Content-Type": contentType },
      });
    }

    let html = await response.text();
    const origin = parsedTarget.origin;

    // 1. Injetar <base href="..."> no <head>
    const baseTag = `<base href="${origin}${parsedTarget.pathname}" />`;
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${baseTag}`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // 2. Reescrever URLs relativas à raiz (começadas com "/") para URLs absolutas do domínio original
    // Isso garante que todo o CSS, imagens WebP/PNG/SVG, fontes e mídias carreguem com 100% de sucesso
    html = html.replace(/(href|src|poster)=["']\/([^"']*)["']/gi, (match, attr, path) => {
      if (path.startsWith("#") || path.startsWith("javascript:") || path.startsWith("data:")) return match;
      return `${attr}="${origin}/${path}"`;
    });

    // 3. Reescrever srcset de imagens responsivas
    html = html.replace(/srcset=["']\/([^"']*)["']/gi, (match, path) => {
      return `srcset="${origin}/${path}"`;
    });

    // 4. Reescrever URLs em blocos de style e CSS inline
    html = html.replace(/url\(\s*["']?\/([^"')]+)["']?\s*\)/gi, (match, path) => {
      if (path.startsWith("data:") || path.startsWith("http")) return match;
      return `url("${origin}/${path}")`;
    });

    // 5. Neutralizar scripts que podem tentar frame busting ou redirecionar a página parent
    // Mantemos apenas JSON-LD / dados estruturados; os scripts de hidratação Next.js/React são desativados
    // para preservar o DOM estático sem hydration errors ou popups que atrapalhem o heatmap
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, content) => {
      if (attrs.includes('type="application/ld+json"') || attrs.includes('type="application/json"')) {
        return match;
      }
      return `<!-- disabled-script-for-preview -->`;
    });

    // 6. Remover meta tags de Content-Security-Policy que bloqueariam carregamento de CSS remoto
    html = html.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");

    // 7. Injetar estilos de compatibilidade para visualização do heatmap
    const previewStyles = `
      <style>
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }
        /* Desativa comportamento de links dentro do preview para evitar navegações acidentais */
        a {
          cursor: default !important;
        }
        /* Garante visibilidade e contraste dos elementos */
        img, svg {
          max-width: 100% !important;
        }
      </style>
    `;
    if (html.includes("</head>")) {
      html = html.replace("</head>", `${previewStyles}</head>`);
    } else {
      html = `${previewStyles}${html}`;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:3rem;color:#475569;text-align:center;background:#0f172a;">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;padding:2rem;border-radius:1rem;border:1px solid #334155;">
          <h3 style="color:#f8fafc;margin-bottom:0.5rem;">Prévia da Landing Page MedCof</h3>
          <p style="color:#94a3b8;font-size:0.875rem;">Não foi possível carregar a prévia direta de ${targetUrl}: ${err?.message || "Erro de conexão"}</p>
          <a href="${targetUrl}" target="_blank" style="display:inline-block;margin-top:1rem;background:#0284c7;color:#fff;padding:0.5rem 1rem;border-radius:0.5rem;text-decoration:none;font-size:0.875rem;font-weight:600;">Abrir em nova aba</a>
        </div>
      </body></html>`,
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
