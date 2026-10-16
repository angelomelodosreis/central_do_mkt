import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import dns from "node:dns";

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export const runtime = "nodejs";

/**
 * Normaliza e resolve a URL canônica de qualquer frente ou subdomínio do Grupo MedCof.
 * Corrige rotas antigas, typos em subdomínios legados e paths inexistentes para os domínios
 * oficiais em produção que retornam HTTP 200 OK.
 */
function normalizeMedcofUrl(rawUrl: string): string {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) return rawUrl;

    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase().replace(/^\/|\/$/g, "");

    // 1. Correções diretas de subdomínios com erros de digitação / DNS legado
    if (host === "revaliday.grupomedcof.com.br") {
      return "https://revalida.grupomedcof.com.br";
    }
    if (host === "hiit.grupomedcof.com") {
      return "https://hiit.grupomedcof.com.br";
    }
    if (host === "lifehacks.grupomedcof.com.br") {
      return "https://cursos.grupomedcof.com.br";
    }
    if (host === "aulaavcisquemico.grupomedcof.com.br" || host === "gastro.grupomedcof.com.br") {
      return "https://grupomedcof.com.br";
    }
    if (host === "otorrinolaringologia.grupomedcof.com.br") {
      return "https://otorrino.grupomedcof.com.br";
    }
    if (host === "cardiologia.grupomedcof.com.br") {
      return "https://cardio.grupomedcof.com.br";
    }
    if (host === "clinica-medica.grupomedcof.com.br" || host === "clinica.grupomedcof.com.br") {
      return "https://clinicof.grupomedcof.com.br";
    }
    if (host === "anestesiologia.grupomedcof.com.br") {
      return "https://anestesio.grupomedcof.com.br";
    }
    if (host === "oftalmologia.grupomedcof.com.br") {
      return "https://oftalmo.grupomedcof.com.br";
    }
    if (host === "radiologia.grupomedcof.com.br") {
      return "https://radio.grupomedcof.com.br";
    }
    if (host === "urologia.grupomedcof.com.br") {
      return "https://uro.grupomedcof.com.br";
    }
    if (host === "medicina-intensiva.grupomedcof.com.br") {
      return "https://temi.grupomedcof.com.br";
    }
    if (host === "ginecologia.grupomedcof.com.br" || host === "ginecologia-e-obstetricia.grupomedcof.com.br") {
      return "https://tego.grupomedcof.com.br";
    }

    // 2. Se for rota sob grupomedcof.com.br ou www.grupomedcof.com.br que possui subdomínio próprio
    if (host === "grupomedcof.com.br" || host === "www.grupomedcof.com.br") {
      const pathToSubdomain: Record<string, string> = {
        otorrino: "https://otorrino.grupomedcof.com.br",
        otorrinolaringologia: "https://otorrino.grupomedcof.com.br",
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
        "ginecologia-e-obstetricia": "https://tego.grupomedcof.com.br",
        lifehacks: "https://cursos.grupomedcof.com.br",
        usa: "https://usa.grupomedcof.com.br",
        revalida: "https://revalida.grupomedcof.com.br",
        revaliday: "https://revalida.grupomedcof.com.br",
        hiit: "https://hiit.grupomedcof.com.br",
        "hiit-target": "https://hiit.grupomedcof.com.br",
        concursus: "https://concursus.grupomedcof.com.br",
        derma: "https://medcofderma.com.br",
        dermatologia: "https://medcofderma.com.br",
        endocrino: "https://medcofendocrino.com.br",
        endocrinologia: "https://medcofendocrino.com.br",
        "extensivo-2025": "https://extensivo.grupomedcof.com.br",
        extensivo: "https://extensivo.grupomedcof.com.br",
        enamed: "https://grupomedcof.com.br",
        internato: "https://grupomedcof.com.br",
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
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Não autorizado", { status: 401 });
    }
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
      signal: AbortSignal.timeout(12000),
    });

    if (response.status === 404) {
      return new NextResponse(
        `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;max-width:500px;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;">
            <h2 style="color:#ef4444;margin-top:0;">Página Não Encontrada (404)</h2>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6;">A URL solicitada não existe no servidor de destino: <code>${targetUrl}</code></p>
            <p style="color:#38bdf8;font-size:13px;">Se esta frente possui subdomínio próprio, verifique a URL no painel de LPs.</p>
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

    // 2. Reescrever URLs relativas à raiz para URLs absolutas do domínio original
    // Preserva URLs relativas ao protocolo ("//..."), âncoras ("#..."), dados ("data:...") e javascript:
    html = html.replace(/(href|src|poster)=["']\/([^"']*)["']/gi, (match, attr, path) => {
      if (path.startsWith("#") || path.startsWith("javascript:") || path.startsWith("data:")) return match;
      if (path.startsWith("/")) {
        return `${attr}="https:${path}"`;
      }
      return `${attr}="${origin}/${path}"`;
    });

    // 3. Reescrever srcset de imagens responsivas
    html = html.replace(/srcset=["']([^"']*)["']/gi, (match, srcsetValue) => {
      const rewritten = srcsetValue
        .split(",")
        .map((part: string) => {
          const trimmed = part.trim();
          if (trimmed.startsWith("/")) {
            if (trimmed.startsWith("//")) {
              return `https:${trimmed}`;
            }
            return `${origin}${trimmed}`;
          }
          return trimmed;
        })
        .join(", ");
      return `srcset="${rewritten}"`;
    });

    // 4. Reescrever URLs em blocos de style e CSS inline
    html = html.replace(/url\(\s*["']?\/([^"')]+)["']?\s*\)/gi, (match, path) => {
      if (path.startsWith("data:") || path.startsWith("http")) return match;
      if (path.startsWith("/")) {
        return `url("https:${path}")`;
      }
      return `url("${origin}/${path}")`;
    });

    // 5. Injetar guardião de frame-busting (impede redirecionamento da janela mãe mantendo scripts SSR vivos)
    const frameProtector = `
      <script>
        (function() {
          try {
            window.top = window.self;
            window.parent = window.self;
          } catch (e) {}

          function reportHeight() {
            try {
              var h = Math.max(
                document.body ? document.body.scrollHeight : 0,
                document.documentElement ? document.documentElement.scrollHeight : 0,
                document.body ? document.body.offsetHeight : 0,
                document.documentElement ? document.documentElement.offsetHeight : 0
              );
              if (h > 300 && window.parent && window.parent !== window) {
                window.parent.postMessage({ type: "MEDCOF_PREVIEW_HEIGHT", height: h }, "*");
              }
            } catch (e) {}
          }

          if (document.readyState === "complete" || document.readyState === "interactive") {
            reportHeight();
          } else {
            window.addEventListener("DOMContentLoaded", reportHeight);
            window.addEventListener("load", reportHeight);
          }
          window.addEventListener("resize", reportHeight);
          setTimeout(reportHeight, 500);
          setTimeout(reportHeight, 1500);
          setTimeout(reportHeight, 3000);
        })();
      </script>
    `;

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
      </style>
      ${frameProtector}
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
        "Content-Security-Policy": "frame-ancestors 'self'",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:3rem;color:#475569;text-align:center;background:#0f172a;">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;padding:2rem;border-radius:1rem;border:1px solid #334155;">
          <h3 style="color:#f8fafc;margin-bottom:0.5rem;">Prévia da Landing Page MedCof</h3>
          <p style="color:#94a3b8;font-size:0.875rem;">Não foi possível carregar a prévia direta de ${targetUrl}: ${err?.message || "Erro de conexão"}</p>
          <a href="${targetUrl}" target="_blank" style="display:inline-block;margin-top:1rem;background:#0284c7;color:#fff;padding:0.5rem 1rem;border-radius:0.5rem;text-decoration:none;font-size:0.875rem;font-weight:bold;">Abrir página em nova aba</a>
        </div>
      </body></html>`,
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
