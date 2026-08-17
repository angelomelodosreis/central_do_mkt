import { isTestLoginEnabled } from "@/lib/auth/test-login";

/**
 * Faixa de aviso exibida no topo quando o modo de teste local está ligado.
 * Existe para nunca haver dúvida se o que está na tela é teste ou uso real.
 */
export async function TestModeBanner() {
  if (!(await isTestLoginEnabled())) return null;

  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
      🧪 Modo de teste local — dados fictícios, apenas na sua máquina
    </div>
  );
}
