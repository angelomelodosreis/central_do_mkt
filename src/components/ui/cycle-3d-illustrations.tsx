"use client";

import React from "react";

/**
 * Ilustração 3D Pastel de Alvo com Dardo/Flecha (Objetivo do Ciclo)
 * Inspirada fielmente no estilo 3D pastel da referência visual MedCof.
 */
export function Target3DIllustration({ className = "w-44 h-36" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Sombra base suave */}
          <radialGradient
            id="targetFloorShadow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(120 175) scale(80 20)"
          >
            <stop stopColor="#f43f5e" stopOpacity="0.22" />
            <stop offset="1" stopColor="#f43f5e" stopOpacity="0" />
          </radialGradient>

          {/* Anel Externo 3D Pastel */}
          <radialGradient
            id="outerRingGrad"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(105 85) rotate(45) scale(85)"
          >
            <stop stopColor="#ffe4e6" />
            <stop offset="0.6" stopColor="#fecdd3" />
            <stop offset="1" stopColor="#fda4af" />
          </radialGradient>

          {/* Anel Médio 3D Branco Suave */}
          <radialGradient
            id="middleRingGrad"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(110 90) rotate(45) scale(60)"
          >
            <stop stopColor="#ffffff" />
            <stop offset="0.7" stopColor="#fff1f2" />
            <stop offset="1" stopColor="#fecdd3" />
          </radialGradient>

          {/* Centro/Bullseye Rosa Vibrante */}
          <radialGradient
            id="bullseyeGrad"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(115 95) rotate(45) scale(40)"
          >
            <stop stopColor="#fb7185" />
            <stop offset="0.75" stopColor="#e11d48" />
            <stop offset="1" stopColor="#be123c" />
          </radialGradient>

          {/* Haste do Dardo 3D */}
          <linearGradient id="dartShaftGrad" x1="160" y1="35" x2="128" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f43f5e" />
            <stop offset="0.45" stopColor="#fb7185" />
            <stop offset="1" stopColor="#fda4af" />
          </linearGradient>

          {/* Penas do Dardo */}
          <linearGradient id="featherGrad1" x1="165" y1="20" x2="195" y2="55" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fb7185" />
            <stop offset="1" stopColor="#e11d48" />
          </linearGradient>
          <linearGradient id="featherGrad2" x1="150" y1="20" x2="180" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#fda4af" />
            <stop offset="1" stopColor="#f43f5e" />
          </linearGradient>

          {/* Filtro de relevo suave */}
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#f43f5e" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Sombra no chão */}
        <ellipse cx="120" cy="175" rx="75" ry="16" fill="url(#targetFloorShadow)" />

        {/* Chassi do Alvo (Perspectiva 3D inclinada) */}
        <g filter="url(#softGlow)">
          {/* Anel Externo - Relevo Traseiro 3D */}
          <ellipse cx="122" cy="107" rx="68" ry="60" fill="#fb7185" opacity="0.35" />
          <ellipse cx="120" cy="104" rx="68" ry="60" fill="url(#outerRingGrad)" />

          {/* Anel Branco Intermediário */}
          <ellipse cx="121" cy="105" rx="50" ry="44" fill="#fda4af" opacity="0.4" />
          <ellipse cx="120" cy="104" rx="49" ry="43" fill="url(#middleRingGrad)" />

          {/* Anel Vermelho/Rosa Intermediário */}
          <ellipse cx="120.5" cy="104.5" rx="34" ry="30" fill="#f43f5e" opacity="0.25" />
          <ellipse cx="120" cy="104" rx="33" ry="29" fill="url(#outerRingGrad)" />

          {/* Centro / Bullseye */}
          <ellipse cx="120" cy="104.5" rx="19" ry="17" fill="#9f1239" opacity="0.3" />
          <ellipse cx="120" cy="104" rx="18" ry="16" fill="url(#bullseyeGrad)" />
          {/* Brilho especular no centro */}
          <ellipse cx="117" cy="101" rx="6" ry="4.5" fill="#ffffff" opacity="0.65" />
        </g>

        {/* Flecha/Dardo cravada no centro */}
        <g>
          {/* Sombra da haste sobre o alvo */}
          <line
            x1="120"
            y1="104"
            x2="175"
            y2="52"
            stroke="#9f1239"
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.3"
          />

          {/* Haste metálica/acrílica do dardo */}
          <line
            x1="121"
            y1="102"
            x2="178"
            y2="46"
            stroke="url(#dartShaftGrad)"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          {/* Brilho da haste */}
          <line
            x1="122"
            y1="101"
            x2="177"
            y2="45"
            stroke="#ffffff"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.8"
          />

          {/* Penas do Dardo (Fins 3D) */}
          {/* Pena Superior */}
          <path
            d="M 166 43 L 188 20 C 193 25 197 32 196 39 L 175 51 Z"
            fill="url(#featherGrad1)"
          />
          {/* Pena Direita */}
          <path
            d="M 172 49 L 202 46 C 204 53 203 61 198 67 L 178 55 Z"
            fill="url(#featherGrad2)"
          />
          {/* Pena Esquerda/Posterior */}
          <path
            d="M 168 38 L 180 18 C 174 16 167 17 160 20 L 163 36 Z"
            fill="#e11d48"
            opacity="0.9"
          />

          {/* Anel de fixação das penas */}
          <circle cx="172" cy="48" r="3.5" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Ilustração 3D Pastel de Barras de Crescimento com Seta Curva (Metas do Ciclo)
 * Inspirada fielmente no estilo 3D pastel da referência visual MedCof.
 */
export function GrowthChart3DIllustration({ className = "w-44 h-36" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          {/* Sombra base das barras */}
          <radialGradient
            id="barsFloorShadow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(130 178) scale(85 20)"
          >
            <stop stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>

          {/* Barra 1 (Esquerda - Menor) */}
          <linearGradient id="bar1Top" x1="75" y1="120" x2="95" y2="132" gradientUnits="userSpaceOnUse">
            <stop stopColor="#d8b4fe" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="bar1Front" x1="75" y1="130" x2="75" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c084fc" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="bar1Right" x1="95" y1="130" x2="105" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333ea" />
            <stop offset="1" stopColor="#7e22ce" />
          </linearGradient>

          {/* Barra 2 (Centro - Média) */}
          <linearGradient id="bar2Top" x1="110" y1="92" x2="135" y2="106" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c084fc" />
            <stop offset="1" stopColor="#a855f7" />
          </linearGradient>
          <linearGradient id="bar2Front" x1="110" y1="104" x2="110" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#9333ea" />
          </linearGradient>
          <linearGradient id="bar2Right" x1="135" y1="104" x2="148" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7e22ce" />
            <stop offset="1" stopColor="#6b21a8" />
          </linearGradient>

          {/* Barra 3 (Direita - Alta) */}
          <linearGradient id="bar3Top" x1="150" y1="62" x2="178" y2="78" gradientUnits="userSpaceOnUse">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#9333ea" />
          </linearGradient>
          <linearGradient id="bar3Front" x1="150" y1="76" x2="150" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9333ea" />
            <stop offset="1" stopColor="#7e22ce" />
          </linearGradient>
          <linearGradient id="bar3Right" x1="178" y1="76" x2="192" y2="170" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6b21a8" />
            <stop offset="1" stopColor="#581c87" />
          </linearGradient>

          {/* Gradiente da Seta Curva 3D */}
          <linearGradient id="arrowGrad" x1="60" y1="140" x2="185" y2="35" gradientUnits="userSpaceOnUse">
            <stop stopColor="#c084fc" />
            <stop offset="0.5" stopColor="#9333ea" />
            <stop offset="1" stopColor="#7c3aed" />
          </linearGradient>
        </defs>

        {/* Sombra no chão */}
        <ellipse cx="130" cy="178" rx="80" ry="18" fill="url(#barsFloorShadow)" />

        {/* Barra 1 (Pequena) */}
        <g>
          {/* Topo */}
          <polygon points="75,130 95,118 110,126 90,138" fill="url(#bar1Top)" />
          {/* Frente */}
          <polygon points="75,130 90,138 90,172 75,164" fill="url(#bar1Front)" />
          {/* Lado Direito */}
          <polygon points="90,138 110,126 110,160 90,172" fill="url(#bar1Right)" />
        </g>

        {/* Barra 2 (Média) */}
        <g>
          {/* Topo */}
          <polygon points="112,102 134,88 152,98 130,112" fill="url(#bar2Top)" />
          {/* Frente */}
          <polygon points="112,102 130,112 130,174 112,164" fill="url(#bar2Front)" />
          {/* Lado Direito */}
          <polygon points="130,112 152,98 152,160 130,174" fill="url(#bar2Right)" />
        </g>

        {/* Barra 3 (Alta) */}
        <g>
          {/* Topo */}
          <polygon points="152,72 176,56 195,68 171,84" fill="url(#bar3Top)" />
          {/* Frente */}
          <polygon points="152,72 171,84 171,174 152,162" fill="url(#bar3Front)" />
          {/* Lado Direito */}
          <polygon points="171,84 195,68 195,158 171,174" fill="url(#bar3Right)" />
        </g>

        {/* Seta 3D Dinâmica Ascendente */}
        <g>
          {/* Sombra projetada da seta */}
          <path
            d="M 64 150 C 95 142 125 110 162 62"
            stroke="#581c87"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.22"
          />

          {/* Corpo curvo da seta */}
          <path
            d="M 66 142 C 96 132 128 100 168 48"
            stroke="url(#arrowGrad)"
            strokeWidth="9"
            strokeLinecap="round"
          />
          {/* Brilho superior da seta */}
          <path
            d="M 67 140 C 97 130 128 98 167 46"
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.65"
          />

          {/* Ponta da Seta 3D */}
          <polygon points="158,34 186,40 174,68" fill="#7c3aed" />
          <polygon points="158,34 186,40 180,48" fill="#c084fc" />
          {/* Brilho da ponta */}
          <circle cx="184" cy="41" r="2.5" fill="#ffffff" opacity="0.9" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Ilustração 3D Pastel de Diagnóstico Estratégico (Radar / Prisão de Dados / Prancheta)
 */
export function DiagnosticRadar3DIllustration({ className = "w-44 h-36" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <radialGradient
            id="diagFloorShadow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(120 178) scale(80 20)"
          >
            <stop stopColor="#0284c7" stopOpacity="0.22" />
            <stop offset="1" stopColor="#0284c7" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="boardGrad" x1="70" y1="50" x2="160" y2="160" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e0f2fe" />
            <stop offset="1" stopColor="#bae6fd" />
          </linearGradient>

          <linearGradient id="lensGrad" x1="120" y1="80" x2="160" y2="130" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" />
            <stop offset="1" stopColor="#0284c7" />
          </linearGradient>
        </defs>

        <ellipse cx="120" cy="178" rx="75" ry="17" fill="url(#diagFloorShadow)" />

        {/* Prancheta 3D Inclinada */}
        <g>
          {/* Espessura base */}
          <polygon points="80,166 160,166 172,60 92,60" fill="#0369a1" opacity="0.3" />
          <polygon points="78,162 158,162 170,56 90,56" fill="url(#boardGrad)" stroke="#7dd3fc" strokeWidth="2" />

          {/* Linhas da Prancheta (dados) */}
          <line x1="100" y1="80" x2="148" y2="80" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
          <line x1="100" y1="96" x2="138" y2="96" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
          <line x1="100" y1="112" x2="144" y2="112" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" opacity="0.4" />
          <line x1="100" y1="128" x2="128" y2="128" stroke="#0284c7" strokeWidth="4" strokeLinecap="round" opacity="0.4" />

          {/* Marcador de Check */}
          <circle cx="94" cy="80" r="3.5" fill="#0284c7" />
          <circle cx="94" cy="96" r="3.5" fill="#0284c7" />
          <circle cx="94" cy="112" r="3.5" fill="#38bdf8" />
        </g>

        {/* Lupa 3D com Lente Glossy */}
        <g>
          {/* Sombra da Lupa */}
          <circle cx="148" cy="118" r="32" fill="#0369a1" opacity="0.25" />

          {/* Cabo da Lupa 3D */}
          <line x1="168" y1="138" x2="200" y2="170" stroke="#0284c7" strokeWidth="11" strokeLinecap="round" />
          <line x1="169" y1="137" x2="199" y2="167" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />

          {/* Anel Externo da Lente */}
          <circle cx="145" cy="112" r="32" fill="#f0f9ff" stroke="#0284c7" strokeWidth="6" />
          {/* Vidro da Lente */}
          <circle cx="145" cy="112" r="26" fill="url(#lensGrad)" opacity="0.4" />

          {/* Brilho Curvo na Lente */}
          <path d="M 130 102 C 135 96 148 95 158 100" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
          <circle cx="156" cy="122" r="3" fill="#ffffff" opacity="0.75" />
        </g>
      </svg>
    </div>
  );
}

/**
 * Ilustração 3D Pastel de Revisão Contínua / Calendário de Trimestre (Revisões do Ciclo)
 */
export function ReviewLoop3DIllustration({ className = "w-44 h-36" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 select-none ${className}`}>
      <svg
        viewBox="0 0 240 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        <defs>
          <radialGradient
            id="reviewFloorShadow"
            cx="0"
            cy="0"
            r="1"
            gradientUnits="userSpaceOnUse"
            gradientTransform="translate(120 178) scale(80 20)"
          >
            <stop stopColor="#059669" stopOpacity="0.25" />
            <stop offset="1" stopColor="#059669" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="calendarTopGrad" x1="80" y1="60" x2="160" y2="75" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="calendarBodyGrad" x1="80" y1="75" x2="160" y2="165" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ecfdf5" />
            <stop offset="1" stopColor="#d1fae5" />
          </linearGradient>

          <linearGradient id="loopArrowGrad" x1="130" y1="70" x2="195" y2="135" gradientUnits="userSpaceOnUse">
            <stop stopColor="#34d399" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>

        <ellipse cx="120" cy="178" rx="75" ry="17" fill="url(#reviewFloorShadow)" />

        {/* Calendário 3D em Perspectiva */}
        <g>
          {/* Base / Folhas Traseiras */}
          <rect x="74" y="66" width="90" height="92" rx="14" fill="#047857" opacity="0.3" />
          {/* Corpo do Calendário */}
          <rect x="72" y="62" width="90" height="92" rx="14" fill="url(#calendarBodyGrad)" stroke="#6ee7b7" strokeWidth="2" />
          {/* Faixa Superior Vermelho/Verde */}
          <rect x="72" y="62" width="90" height="26" rx="14" fill="url(#calendarTopGrad)" />
          <rect x="72" y="74" width="90" height="14" fill="url(#calendarTopGrad)" />

          {/* Espirais do Calendário */}
          <rect x="88" y="55" width="6" height="14" rx="3" fill="#ffffff" />
          <rect x="114" y="55" width="6" height="14" rx="3" fill="#ffffff" />
          <rect x="140" y="55" width="6" height="14" rx="3" fill="#ffffff" />

          {/* Destaque "Q1 / Q2" ou Checkmark no centro do calendário */}
          <circle cx="117" cy="116" r="18" fill="#10b981" opacity="0.2" />
          <path d="M 108 116 L 115 123 L 128 108" stroke="#059669" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Arco de Loop 3D de Feedback / Revisão Contínua */}
        <g>
          {/* Sombra projetada do arco */}
          <path
            d="M 155 70 C 190 85 200 135 170 160"
            stroke="#065f46"
            strokeWidth="9"
            strokeLinecap="round"
            opacity="0.22"
          />

          {/* Arco Verde Esmeralda */}
          <path
            d="M 152 66 C 188 80 198 130 168 154"
            stroke="url(#loopArrowGrad)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Brilho no arco */}
          <path
            d="M 153 65 C 187 79 197 127 167 152"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Ponta da Seta de Retorno */}
          <polygon points="144,66 162,56 160,76" fill="#059669" />
          <polygon points="144,66 162,56 156,66" fill="#6ee7b7" />
        </g>
      </svg>
    </div>
  );
}
