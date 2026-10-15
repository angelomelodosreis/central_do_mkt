import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { isOriginAllowed } from "@/lib/modules/insights/collector";

export const runtime = "nodejs";

/**
 * Proxy de renderização para iframe de Landing Pages no visualizador de Heatmap.
 * Remove cabeçalhos de bloqueio de frame (X-Frame-Options, frame-ancestors)
 * e injeta a tag base para resolução perfeita de assets relativos (CSS, imagens, fontes).
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
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 MedCofInsightsBot/1.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

    // Injetar <base href="..."> no <head> para resolver CSS e imagens relativas da página original
    const baseTag = `<base href="${parsedTarget.origin}${parsedTarget.pathname}" />`;
    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${baseTag}`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // Injetar script listener para scroll sincronizado se necessário
    const injectScript = `
      <script>
        (function() {
          window.addEventListener('message', function(e) {
            if (e.data && e.data.type === 'MEDCOF_SCROLL_TO') {
              window.scrollTo({ top: e.data.scrollTop, behavior: 'smooth' });
            }
          });
        })();
      </script>
    `;
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${injectScript}</body>`);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Libera para iframe dentro da própria aplicação
        "X-Frame-Options": "SAMEORIGIN",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (err: any) {
    return new NextResponse(
      `<html><body style="font-family:sans-serif;padding:2rem;color:#64748b;text-align:center;">
        <h3>Não foi possível carregar a prévia direta desta página</h3>
        <p>${err?.message || "Erro de conexão com o servidor remoto."}</p>
        <p><a href="${targetUrl}" target="_blank" style="color:#0284c7;">Clique aqui para abrir em uma nova aba</a></p>
      </body></html>`,
      {
        status: 502,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }
    );
  }
}
