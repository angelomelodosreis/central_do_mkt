"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  FileText,
  Link as LinkIcon,
  MonitorPlay,
  Plus,
  Presentation,
  Trash2,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import {
  createGrowthSessionAction,
  updateGrowthSessionAction,
} from "@/lib/modules/growth-sessions/actions";
import type { GrowthSessionView } from "@/lib/modules/growth-sessions/queries";
import { extractYoutubeId } from "@/lib/modules/growth-sessions/utils";

const CATEGORIES = [
  "Estratégia",
  "Mídia Paga",
  "Analytics",
  "Soft Skills",
  "Automação",
  "Lançamentos",
  "Eventos",
  "Produtividade",
  "BI & Dashboards",
  "Outro",
];

type ExtraLinkItem = {
  id: string;
  label: string;
  url: string;
};

export function GrowthSessionDrawer({
  open,
  onClose,
  sessionToEdit,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  sessionToEdit?: GrowthSessionView | null;
  onSaved?: (sessionId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState("");
  const [category, setCategory] = useState("Estratégia");
  const [customCategory, setCustomCategory] = useState("");
  const [presenter, setPresenter] = useState("");
  const [date, setDate] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}`;
  });
  const [time, setTime] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [summaryUrl, setSummaryUrl] = useState("");
  const [presentationUrl, setPresentationUrl] = useState("");
  const [toolUrl, setToolUrl] = useState("");
  const [description, setDescription] = useState("");
  const [extraLinks, setExtraLinks] = useState<ExtraLinkItem[]>([]);

  // Sincroniza formulário com dados da sessão em edição ou reseta ao abrir para nova
  useEffect(() => {
    if (sessionToEdit && open) {
      setTitle(sessionToEdit.title);
      setTheme(sessionToEdit.theme);
      if (CATEGORIES.includes(sessionToEdit.category)) {
        setCategory(sessionToEdit.category);
        setCustomCategory("");
      } else {
        setCategory("Outro");
        setCustomCategory(sessionToEdit.category);
      }
      setPresenter(sessionToEdit.presenter);
      setDate(sessionToEdit.date);
      setTime(sessionToEdit.time ?? "");
      setVideoUrl(
        sessionToEdit.videoUrl ??
          (sessionToEdit.youtubeId
            ? `https://youtu.be/${sessionToEdit.youtubeId}`
            : ""),
      );
      setSummaryUrl(sessionToEdit.summaryUrl ?? "");
      setPresentationUrl(sessionToEdit.presentationUrl ?? "");
      setToolUrl(sessionToEdit.toolUrl ?? "");
      setDescription(sessionToEdit.description);
      setExtraLinks(
        (sessionToEdit.parsedLinks ?? []).map((l) => ({
          id: Math.random().toString(36).substring(2, 9),
          label: l.label,
          url: l.url,
        })),
      );
    } else if (!sessionToEdit && open) {
      resetForm();
    }
  }, [sessionToEdit, open]);

  const detectedYoutubeId = extractYoutubeId(videoUrl);

  function resetForm() {
    setTitle("");
    setTheme("");
    setCategory("Estratégia");
    setCustomCategory("");
    setPresenter("");
    const today = new Date();
    setDate(
      `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}`,
    );
    setTime("");
    setVideoUrl("");
    setSummaryUrl("");
    setPresentationUrl("");
    setToolUrl("");
    setDescription("");
    setExtraLinks([]);
  }

  function handleAddLink() {
    setExtraLinks((prev) => [
      ...prev,
      { id: Math.random().toString(36).substring(2, 9), label: "", url: "" },
    ]);
  }

  function handleRemoveLink(id: string) {
    setExtraLinks((prev) => prev.filter((l) => l.id !== id));
  }

  function handleUpdateLink(id: string, field: "label" | "url", value: string) {
    setExtraLinks((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l)),
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const finalCategory =
      category === "Outro" && customCategory.trim()
        ? customCategory.trim()
        : category;

    if (!title.trim()) {
      toast.error("Por favor, informe o título da Growth Session.");
      return;
    }
    if (!theme.trim()) {
      toast.error("Por favor, informe o tema ou foco da sessão.");
      return;
    }
    if (!presenter.trim()) {
      toast.error("Por favor, informe o apresentador(a) ou facilitador(a).");
      return;
    }
    if (!description.trim()) {
      toast.error("Por favor, descreva os principais pontos e aprendizados.");
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("theme", theme);
      fd.append("category", finalCategory);
      fd.append("presenter", presenter);
      fd.append("date", date);
      if (time.trim()) fd.append("time", time);
      if (videoUrl.trim()) fd.append("videoUrl", videoUrl);
      if (summaryUrl.trim()) fd.append("summaryUrl", summaryUrl);
      if (presentationUrl.trim()) fd.append("presentationUrl", presentationUrl);
      if (toolUrl.trim()) fd.append("toolUrl", toolUrl);
      fd.append("description", description);

      const validLinks = extraLinks.filter(
        (l) => l.url.trim().length > 0,
      );
      if (validLinks.length > 0) {
        fd.append(
          "linksJson",
          JSON.stringify(
            validLinks.map((l) => ({
              label: l.label.trim() || "Material extra",
              url: l.url.trim(),
            })),
          ),
        );
      }

      const res = sessionToEdit
        ? await updateGrowthSessionAction(sessionToEdit.id, fd)
        : await createGrowthSessionAction(fd);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(
        sessionToEdit
          ? "Growth Session atualizada com sucesso!"
          : "Growth Session cadastrada com sucesso!",
      );
      resetForm();
      onClose();
      if (res.id && onSaved) {
        onSaved(res.id);
      }
    });
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="lg"
      title={sessionToEdit ? "Editar Growth Session" : "Subir Nova Growth Session"}
      description={
        sessionToEdit
          ? "Atualize as informações, gravações, documentos ou links deste treinamento."
          : "Cadastre uma gravação, playbook prático ou sessão de capacitação da equipe."
      }
      footer={
        <div className="flex w-full items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="primary"
            loading={isPending}
            disabled={isPending}
            onClick={handleSubmit}
          >
            {sessionToEdit ? "Salvar Alterações" : "Salvar e Publicar"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-1">
        {/* Informações Básicas */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Identificação da Sessão
          </h3>

          <Field
            label="Título da Growth Session"
            required
            hint="Ex.: GROWTH SESSIONS - Estratégia de Mídia e Playbook"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Treinamento Prático de UTMs"
              disabled={isPending}
              required
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Tema / Foco Principal"
              required
              hint="Assunto central do treinamento"
            >
              <Input
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="Ex.: Mídia Paga & Campanhas"
                disabled={isPending}
                required
              />
            </Field>

            <Field label="Categoria / Área" required>
              <Select
                value={category}
                onValueChange={setCategory}
                options={CATEGORIES.map((cat) => ({
                  value: cat,
                  label: cat,
                }))}
                ariaLabel="Categoria da sessão"
                disabled={isPending}
              />
            </Field>
          </div>

          {category === "Outro" && (
            <Field label="Nome da Categoria Customizada" required>
              <Input
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Ex.: Copywriting, CS, Produto..."
                disabled={isPending}
                required
              />
            </Field>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field
              label="Apresentador(a) / Facilitador(a)"
              required
              hint="Quem ministrou o treinamento"
            >
              <Input
                value={presenter}
                onChange={(e) => setPresenter(e.target.value)}
                placeholder="Ex.: Gustavo, Beatriz Biscalchini..."
                disabled={isPending}
                required
              />
            </Field>

            <Field label="Data da Sessão" required hint="Dia e mês">
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="Ex.: 28/10"
                disabled={isPending}
                required
              />
            </Field>

            <Field label="Horário" hint="Opcional">
              <Input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="Ex.: 16h00"
                disabled={isPending}
              />
            </Field>
          </div>
        </div>

        {/* Vídeo e Gravação */}
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <MonitorPlay className="size-4 text-brand-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vídeo ou Gravação (Opcional)
            </h3>
          </div>

          <Field
            label="Link do Vídeo (YouTube, Loom, Google Drive ou outro)"
            hint="Sessões sem vídeo são aceitas (ex.: playbooks documentais ou estudos de caso)."
          >
            <Input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtu.be/... ou https://loom.com/share/..."
              disabled={isPending}
            />
          </Field>

          {detectedYoutubeId && (
            <div className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <span className="font-semibold">✓ YouTube detectado:</span>
              <span className="font-mono text-emerald-950">ID: {detectedYoutubeId}</span>
              <span className="text-[11px] text-emerald-700">(reprodutor HD embutido ativado)</span>
            </div>
          )}
        </div>

        {/* Materiais Complementares & Documentação */}
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-brand-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Materiais, Atas e Documentos
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Resumo de IA / Ata (Link)"
              hint="Google Docs, Notion, PDF..."
            >
              <div className="relative">
                <FileText className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input
                  value={summaryUrl}
                  onChange={(e) => setSummaryUrl(e.target.value)}
                  placeholder="https://docs.google.com/document/d/..."
                  className="pl-9"
                  disabled={isPending}
                />
              </div>
            </Field>

            <Field
              label="Apresentação / Slides (Link)"
              hint="Google Slides, PDF, PPTX..."
            >
              <div className="relative">
                <Presentation className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
                <Input
                  value={presentationUrl}
                  onChange={(e) => setPresentationUrl(e.target.value)}
                  placeholder="https://assets.grupomedcof.com.br/..."
                  className="pl-9"
                  disabled={isPending}
                />
              </div>
            </Field>
          </div>

          <Field
            label="Ferramenta Utilizada (Link)"
            hint="Data Studio, Meta Ads, Looker, software..."
          >
            <div className="relative">
              <Wrench className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                value={toolUrl}
                onChange={(e) => setToolUrl(e.target.value)}
                placeholder="https://datastudio.google.com/..."
                className="pl-9"
                disabled={isPending}
              />
            </div>
          </Field>

          {/* Links Extras Dinâmicos */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Links Extras & Materiais Complementares (Cases, Drive, etc.)
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAddLink}
                disabled={isPending}
                className="text-xs text-brand-600 hover:text-brand-700"
              >
                <Plus className="mr-1 size-3.5" /> Adicionar Link
              </Button>
            </div>

            {extraLinks.length === 0 ? (
              <p className="text-xs text-slate-500 italic">
                Nenhum link adicional. Clique em &ldquo;Adicionar Link&rdquo; se houver cases ou anexos extras.
              </p>
            ) : (
              <div className="space-y-2.5">
                {extraLinks.map((linkItem, idx) => (
                  <div key={linkItem.id} className="flex items-center gap-2">
                    <Input
                      value={linkItem.label}
                      onChange={(e) =>
                        handleUpdateLink(linkItem.id, "label", e.target.value)
                      }
                      placeholder={`Rótulo (ex.: Case ${idx + 1}, Planilha)`}
                      className="w-1/3"
                      disabled={isPending}
                    />
                    <Input
                      value={linkItem.url}
                      onChange={(e) =>
                        handleUpdateLink(linkItem.id, "url", e.target.value)
                      }
                      placeholder="https://drive.google.com/..."
                      className="flex-1"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLink(linkItem.id)}
                      disabled={isPending}
                      className="text-slate-400 hover:text-rose-600"
                      aria-label="Remover link"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Descrição & Aprendizados */}
        <div className="border-t border-slate-200 pt-5 space-y-4">
          <Field
            label="Descrição e Principais Aprendizados"
            required
            hint="Explique o objetivo da sessão, pontos principais abordados e valor prático para o time."
          >
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resuma o conteúdo da sessão, conceitos chave e diretrizes práticas para a equipe..."
              disabled={isPending}
              required
            />
          </Field>
        </div>
      </form>
    </Drawer>
  );
}
