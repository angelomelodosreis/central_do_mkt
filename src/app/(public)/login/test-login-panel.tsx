import { signInAsTestAccount } from "./test-login-actions";
import { TEST_ACCOUNTS, type TestAccountKey } from "@/lib/auth/test-login";

const ORDER: TestAccountKey[] = ["admin", "leader", "editor", "member"];

/**
 * Painel de entrada de teste, exibido apenas em desenvolvimento com
 * `ALLOW_TEST_LOGIN="true"`. Serve para explorar a plataforma antes de
 * configurar o login do Google.
 */
export function TestLoginPanel() {
  return (
    <div className="mt-6 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-4">
      <p className="text-sm font-semibold text-amber-900">
        🧪 Modo de teste local
      </p>
      <p className="mt-1 text-xs text-amber-800">
        Entre sem o Google para conhecer a plataforma. Estas contas são
        fictícias e só existem na sua máquina.
      </p>

      <div className="mt-4 space-y-2">
        {ORDER.map((key) => {
          const account = TEST_ACCOUNTS[key];
          return (
            <form key={key} action={signInAsTestAccount}>
              <input type="hidden" name="conta" value={key} />
              <button
                type="submit"
                className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2.5 text-left transition-colors hover:border-amber-400 hover:bg-amber-50"
              >
                <span className="block text-sm font-medium text-slate-900">
                  Entrar como {account.label}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {account.description}
                </span>
              </button>
            </form>
          );
        })}
      </div>

      <p className="mt-4 text-xs text-amber-800">
        Para desligar, apague a linha <code className="font-mono">ALLOW_TEST_LOGIN</code>{" "}
        do arquivo <code className="font-mono">.env.local</code>. Este painel
        nunca aparece na versão publicada.
      </p>
    </div>
  );
}
