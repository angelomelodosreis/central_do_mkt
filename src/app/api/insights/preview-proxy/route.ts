import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export const runtime = "nodejs";

/**
 * Proxy de renderização para iframe de Landing Pages no visualizador de Heatmap.
 * Remove cabeçalhos de bloqueio de frame, neutraliza scripts conflitantes/redirecionamentos
 * e reescreve todas as URLs raiz (CSS, imagens, fontes, SVGs) para o domínio original da página.
 */
function normalizeMedcofUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const path = parsed.pathname.toLowerCase().replace(/^\/|\/$/g, "");

    // Se for rota sob grupomedcof.com.br que é subdomínio próprio no ecossistema
    if (parsed.hostname.includes("grupomedcof.com.br")) {
      const pathToSubdomain: Record<string, string> = {
        otorrino: "https://otorrino.grupomedcof.com.br",
        cardio: "https://cardio.grupomedcof.com.br",
        cardiologia: "https://cardio.grupomedcof.com.br",
        cirurgia: "https://cirurgia.grupomedcof.com.br",
        clinica: "https://clinicof.grupomedcof.com.br",
        "clinica-medica": "https://clinicof.grupomedcof.com.br",
        clinicof: "https://clinicof.grupomedcof.com.br",
        anestesio: "https://anestesio.grupomedcof.com.br",
        anestesiologia: "https://anestesio.grupomedcof.com.br",
        pediatria: "https://pediatria.grupomedcof.com.br",
        ortopedia: "https://ortopedia.grupomedcof.com.br",
        oftalmo: "https://oftalmo.grupomedcof.com.br",
        oftalmologia: "https://oftalmo.grupomedcof.com.br",
        radio: "https://radio.grupomedcof.com.br",
        radiologia: "https://radio.grupomedcof.com.br",
        uro: "https://uro.grupomedcof.com.br",
        urologia: "https://uro.grupomedcof.com.br",
        temi: "https://temi.grupomedcof.com.br",
        "medicina-intensiva": "https://temi.grupomedcof.com.br",
        tego: "https://tego.grupomedcof.com.br",
        ginecologia: "https://tego.grupomedcof.com.br",
        lifehacks: "https://lifehacks.grupomedcof.com.br",
        usa: "https://usa.grupomedcof.com.br",
        revalida: "https://revaliday.grupomedcof.com.br",
        revaliday: "https://revaliday.grupomedcof.com.br",
        hiit: "https://hiit.grupomedcof.com",
        "hiit-target": "https://hiit.grupomedcof.com",
        concursus: "https://concursus.grupomedcof.com.br",
        gastro: "https://gastro.grupomedcof.com.br",
        derma: "https://medcofderma.com.br",
        dermatologia: "https://medcofderma.com.br",
        endocrino: "https://medcofendocrino.com.br",
        endocrinologia: "https://medcofendocrino.com.br",
      };

      if (path && pathToSubdomain[path]) {
        return pathToSubdomain[path];
      }
    }

    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export async function GET(request: Request) {
  try {
    await requireUser();
  } catch {
    return new NextResponse("Não autorizado", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawTargetUrl = searchParams.get("url");

  if (!rawTargetUrl) {
    return new NextResponse("URL alvo ausente", { status: 400 });
  }

  const targetUrl = normalizeMedcofUrl(rawTargetUrl);

  try {
    const parsedTarget = new URL(targetUrl);

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

    if (response.status === 404) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:500px;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;">
            <h2 style="color:#ef4444;margin-top:0;">Página Não Encontrada (404)</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;">A URL solicitada não existe no servidor de destino: <code>${targetUrl}</code></p>
            <p style="color:#38bdf8;font-size:13px;">Se esta frente possui subdomínio próprio, acerte o cadastro no painel de LPs.</p>
          </div>
        </body></html>`,
        { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: { "Content-Type": contentType },
      });
    }

    let html = await response.text();
    const finalUrl = response.url || targetUrl;
    const parsedFinal = new URL(finalUrl);
    const origin = parsedFinal.origin;

    // 1. Injetar <base href="..."> no <head> com a URL final pós-redirecionamento
    const basePath = parsedFinal.pathname.endsWith("/") ? parsedFinal.pathname : `${parsedFinal.pathname}/`;
    const baseTag = `<base href="${origin}${basePath}" />`;
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${baseTag}`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // 2. Reescrever URLs relativas à raiz (começadas com "/") para URLs absolutas do domínio original
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
    html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs) => {
      if (attrs.includes('type="application/ld+json"') || attrs.includes('type="application/json"')) {
        return match;
      }
      return `<!-- disabled-script-for-preview -->`;
    });

    // 6. Remover meta tags de Content-Security-Policy e X-Frame-Options
    html = html.replace(/<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
    html = html.replace(/<meta\s+http-equiv=["']X-Frame-Options["'][^>]*>/gi, "");

    // 7. Injetar estilos de compatibilidade para visualização do heatmap
    const previewStyles = `
      <style>
        html, body {
          overflow-x: hidden !important;
          max-width: 100vw !important;
        }
        a {
          cursor: default !important;
        }
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
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:3rem;color:#475569;text-align:center;background:#0f172a;">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;padding:2rem;border-radius:1rem;border:1px solid #334155;">
          <h3 style="color:#f8fafc;margin-bottom:0.5rem;">Prévia da Landing Page MedCof</h3>
          <p style="color:#94a3b8;font-size:0.875rem;">Não foi possível carregar a prévia direta de ${targetUrl}: ${err?.message || "Erro de conexão"}</p>
          <a href="${targetUrl}" target="_blank" style="display:inline-block;margin-top:1rem;background:#0284c7;color:#fff;padding:0.5rem 1rem;border-radius:0.5rem;text-decoration:none;font-size:0.875rem;font-bold;">Abrir em nova aba</a>
        </div>
      </body></html>`,
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
