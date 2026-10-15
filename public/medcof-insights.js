/**
 * ============================================================================
 * MEDCOF INSIGHTS & HEATMAP GLOBAL COLLECTOR
 * ============================================================================
 * Coletor cliente leve (< 4KB), não-bloqueante, assíncrono e anônimo.
 * Rastreia comportamento em LPs: page_views, cliques, CTAs, scroll depth e forms.
 *
 * Em conformidade rigorosa com a LGPD:
 * - Não coleta NENHUM dado pessoal (sem e-mail, telefone, CPF, nome, IP ou texto digitado).
 * - Coordenadas (x, y) são normalizadas de 0 a 1000 em relação à página.
 * - Envio em lote via navigator.sendBeacon ou fetch(keepalive).
 */
(function (window, document) {
  "use strict";

  try {
    // 1. Identificar configuração do script
    var currentScript =
      document.currentScript ||
      document.querySelector("script[data-page-id]") ||
      document.querySelector("script[src*='medcof-insights']");

    var pageId =
      (currentScript && currentScript.getAttribute("data-page-id")) ||
      window.location.hostname.replace(/\./g, "-");

    var pageVersion =
      (currentScript && currentScript.getAttribute("data-version")) || "v1";

    var customEndpoint =
      currentScript && currentScript.getAttribute("data-endpoint");

    var collectorEndpoint =
      customEndpoint ||
      (currentScript && currentScript.src
        ? new URL(currentScript.src).origin + "/api/insights/collect"
        : "/api/insights/collect");

    // 2. Verificação de Consentimento LGPD
    function hasConsent() {
      if (typeof window.medcofConsent !== "undefined") {
        return window.medcofConsent.analytics !== false;
      }
      try {
        var lgpd = localStorage.getItem("medcof_lgpd_consent");
        if (lgpd === "declined" || lgpd === "false") return false;
      } catch (e) {}
      return true;
    }

    if (!hasConsent()) {
      window.addEventListener("medcof-consent-updated", function (e) {
        if (e && e.detail && e.detail.analytics) {
          initCollector();
        }
      });
      return;
    }

    initCollector();

    function initCollector() {
      // 3. ID de Sessão Efêmero e Anônimo (sem persistência entre abas/dias)
      var sessionId = "";
      try {
        sessionId = sessionStorage.getItem("medcof_ins_sid") || "";
        if (!sessionId) {
          sessionId =
            "s_" +
            Math.random().toString(36).substring(2, 10) +
            "_" +
            Date.now().toString(36);
          sessionStorage.setItem("medcof_ins_sid", sessionId);
        }
      } catch (e) {
        sessionId = "s_" + Math.random().toString(36).substring(2, 10);
      }

      // 4. Parâmetros de Campanha e Contexto
      var urlParams = new URLSearchParams(window.location.search);
      var utmSource = urlParams.get("utm_source") || null;
      var utmMedium = urlParams.get("utm_medium") || null;
      var utmCampaign = urlParams.get("utm_campaign") || null;
      var referrer = document.referrer ? document.referrer.slice(0, 255) : null;

      function getViewport() {
        return window.innerWidth <= 768 ? "mobile" : "desktop";
      }

      // Fila de eventos e despachador
      var eventQueue = [];
      var flushTimer = null;

      function enqueueEvent(eventData) {
        if (!eventData.event_type) return;

        var fullEvent = {
          event_type: eventData.event_type,
          page_url: window.location.href.split("#")[0],
          page_path: window.location.pathname,
          page_id: pageId,
          page_version: pageVersion,
          element_id: eventData.element_id || null,
          element_label: eventData.element_label ? String(eventData.element_label).slice(0, 100) : null,
          section_id: eventData.section_id || null,
          viewport: getViewport(),
          x: typeof eventData.x === "number" ? Math.min(1000, Math.max(0, Math.round(eventData.x))) : null,
          y: typeof eventData.y === "number" ? Math.min(1000, Math.max(0, Math.round(eventData.y))) : null,
          scroll_percent: typeof eventData.scroll_percent === "number" ? Math.round(eventData.scroll_percent) : null,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          referrer: referrer,
          session_id: sessionId,
          timestamp: Date.now(),
        };

        eventQueue.push(fullEvent);

        if (eventQueue.length >= 10) {
          flushEvents();
        } else if (!flushTimer) {
          flushTimer = setTimeout(flushEvents, 3000);
        }
      }

      function flushEvents() {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }

        if (eventQueue.length === 0) return;

        var payload = JSON.stringify({ events: eventQueue.splice(0, eventQueue.length) });

        if (typeof navigator.sendBeacon === "function") {
          var blob = new Blob([payload], { type: "application/json" });
          var sent = navigator.sendBeacon(collectorEndpoint, blob);
          if (sent) return;
        }

        try {
          fetch(collectorEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: payload,
            keepalive: true,
          }).catch(function () {});
        } catch (e) {}
      }

      // Descarrega fila ao sair da página
      window.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") flushEvents();
      });
      window.addEventListener("pagehide", flushEvents);

      // 5. Page View Inicial
      enqueueEvent({
        event_type: "page_view",
        scroll_percent: 0,
      });

      // 6. Rastreamento de Cliques e Heatmap
      document.addEventListener(
        "click",
        function (event) {
          try {
            var target = event.target;
            if (!target || target.nodeType !== 1) return;

            // Coordenadas absolutas na página
            var pageX = event.pageX;
            var pageY = event.pageY;
            if (typeof pageX !== "number") {
              var doc = document.documentElement;
              var body = document.body;
              pageX =
                event.clientX +
                ((doc && doc.scrollLeft) || (body && body.scrollLeft) || 0);
              pageY =
                event.clientY +
                ((doc && doc.scrollTop) || (body && body.scrollTop) || 0);
            }

            var docWidth = Math.max(
              document.documentElement.scrollWidth,
              document.body.scrollWidth,
              window.innerWidth,
              1
            );
            var docHeight = Math.max(
              document.documentElement.scrollHeight,
              document.body.scrollHeight,
              window.innerHeight,
              1
            );

            // Coordenadas normalizadas de 0 a 1000
            var normX = (pageX / docWidth) * 1000;
            var normY = (pageY / docHeight) * 1000;

            // Identificar elemento relevante clicado
            var trackedEl = target.closest(
              "[data-insight-id], button, a, [role='button'], input[type='submit']"
            );

            var elementId = null;
            var elementLabel = null;
            var sectionId = null;
            var isCta = false;

            if (trackedEl) {
              elementId = trackedEl.getAttribute("data-insight-id");
              elementLabel = trackedEl.getAttribute("data-insight-label");
              sectionId = trackedEl.getAttribute("data-insight-section");

              if (!elementId) {
                elementId =
                  trackedEl.id ||
                  (trackedEl.tagName === "A"
                    ? "link-" + (trackedEl.getAttribute("href") || "").slice(0, 30)
                    : "btn-" + trackedEl.tagName.toLowerCase());
              }

              if (!elementLabel) {
                elementLabel = (
                  trackedEl.getAttribute("aria-label") ||
                  trackedEl.innerText ||
                  trackedEl.getAttribute("title") ||
                  ""
                )
                  .replace(/\s+/g, " ")
                  .trim()
                  .slice(0, 80);
              }

              if (!sectionId) {
                var sectionEl = trackedEl.closest("section, [id], header, footer");
                if (sectionEl) {
                  sectionId =
                    sectionEl.getAttribute("data-insight-section") ||
                    sectionEl.id ||
                    sectionEl.tagName.toLowerCase();
                }
              }

              // Se possui data-insight-id ou é botão/link com texto, é tratado como cta_click
              isCta =
                !!trackedEl.getAttribute("data-insight-id") ||
                trackedEl.tagName === "BUTTON" ||
                trackedEl.tagName === "A";
            }

            enqueueEvent({
              event_type: isCta ? "cta_click" : "click",
              element_id: elementId,
              element_label: elementLabel,
              section_id: sectionId,
              x: normX,
              y: normY,
            });
          } catch (e) {}
        },
        true
      );

      // 7. Rastreamento de Scroll Depth (25%, 50%, 75%, 90%, 100%)
      var scrollMilestones = { 25: false, 50: false, 75: false, 90: false, 100: false };
      var scrollTimeout = null;

      function checkScrollDepth() {
        var scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
        var winHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        var docHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight,
          1
        );

        var currentPercent = Math.min(100, Math.round(((scrollTop + winHeight) / docHeight) * 100));

        [25, 50, 75, 90, 100].forEach(function (threshold) {
          if (currentPercent >= threshold && !scrollMilestones[threshold]) {
            scrollMilestones[threshold] = true;
            enqueueEvent({
              event_type: "scroll_depth",
              scroll_percent: threshold,
            });
          }
        });
      }

      window.addEventListener(
        "scroll",
        function () {
          if (!scrollTimeout) {
            scrollTimeout = setTimeout(function () {
              scrollTimeout = null;
              checkScrollDepth();
            }, 250);
          }
        },
        { passive: true }
      );

      // 8. Rastreamento de Formulários (Standard & HubSpot)
      var formsStarted = {};

      document.addEventListener(
        "focusin",
        function (e) {
          try {
            var input = e.target;
            if (
              input &&
              (input.tagName === "INPUT" || input.tagName === "TEXTAREA" || input.tagName === "SELECT")
            ) {
              var form = input.closest("form");
              var formId = (form && form.getAttribute("data-insight-id")) || (form && form.id) || "lead-form";

              if (!formsStarted[formId]) {
                formsStarted[formId] = true;
                enqueueEvent({
                  event_type: "form_start",
                  element_id: formId,
                  element_label: "Início do Formulário",
                });
              }
            }
          } catch (e) {}
        },
        true
      );

      document.addEventListener(
        "submit",
        function (e) {
          try {
            var form = e.target;
            if (form && form.tagName === "FORM") {
              var formId = form.getAttribute("data-insight-id") || form.id || "lead-form";
              enqueueEvent({
                event_type: "form_submit",
                element_id: formId,
                element_label: "Envio de Formulário",
              });
            }
          } catch (e) {}
        },
        true
      );

      // Listener de eventos HubSpot (via postMessage)
      window.addEventListener("message", function (event) {
        try {
          var data = event.data;
          if (data && typeof data === "object") {
            if (data.type === "hsFormCallback") {
              var hsFormId = "hubspot-" + (data.id || "form");

              if (data.eventName === "onFormReady" || data.eventName === "onFormInit") {
                // Form HubSpot carregou
              } else if (data.eventName === "onFormInput" || data.eventName === "onFormStarted") {
                if (!formsStarted[hsFormId]) {
                  formsStarted[hsFormId] = true;
                  enqueueEvent({
                    event_type: "form_start",
                    element_id: hsFormId,
                    element_label: "Início Form HubSpot",
                  });
                }
              } else if (data.eventName === "onFormSubmitted") {
                enqueueEvent({
                  event_type: "form_submit",
                  element_id: hsFormId,
                  element_label: "Envio Confirmado HubSpot",
                });
              }
            }
          }
        } catch (e) {}
      });
    }
  } catch (err) {
    // Falha silenciosa absoluta para garantir estabilidade da LP
  }
})(window, document);
