/**
 * Popula a tabela planning_review_item e planning_review_comment com os dados reais
 * exibidos na aba do Slack "#marketing-planejamento -> Revisão de Planejamento - Ingrid"
 */
export async function seedPlanningReviewFeed(client) {
  const existingRes = await client.execute("SELECT count(*) as total FROM planning_review_item");
  const count = Number(existingRes.rows[0]?.total ?? 0);
  if (count > 0) {
    console.log(`[seed-reviews] planning_review_item já possui ${count} itens registrados.`);
    return;
  }

  console.log("[seed-reviews] Populando dados iniciais da Revisão de Planejamento...");

  const items = [
    {
      id: "rev_cirurgia_1",
      businessUnitId: "bu_cirurgia",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-08-24T14:00:00Z").getTime(),
      followUpDate: new Date("2026-09-08T18:00:00Z").getTime(),
      details: "• Revisar precificação e oferta do Extensivo Cirurgia\n• Alinhar calendário de postagens de Black November com Social Media\n• Subir novos criativos de conversão no Meta Ads",
      assigneeName: "Mariana Vasconcelos",
      assigneeEmail: "mariana.vasconcelos@grupomedcof.com.br",
      status: "concluido",
      priority: "alta",
      tags: JSON.stringify(["Black November", "Extensivo", "Tráfego Pago"]),
      comments: [
        {
          id: "com_cirurgia_1_1",
          authorName: "Ingrid Silva",
          authorRole: "Coordenadora de Marketing",
          authorEmail: "ingrid.silva@grupomedcof.com.br",
          content: "Reunião finalizada. Mariana, favor priorizar os criativos de Black November até quarta-feira para validação com o supervisor.",
          createdAt: new Date("2026-08-24T15:30:00Z").getTime(),
        },
        {
          id: "com_cirurgia_1_2",
          authorName: "Mariana Vasconcelos",
          authorRole: "Analista de Marketing",
          authorEmail: "mariana.vasconcelos@grupomedcof.com.br",
          content: "Perfeito, Ingrid! Já alinhei com o designer e o copywriter. Subi a prévia na pasta do Drive e os testes A/B estão rodando.",
          createdAt: new Date("2026-08-25T11:20:00Z").getTime(),
        },
        {
          id: "com_cirurgia_1_3",
          authorName: "Carlos Henrique",
          authorRole: "Social Media",
          authorEmail: "carlos.henrique@grupomedcof.com.br",
          content: "Grade de postagens alinhada com os anúncios e Stories agendados para a próxima semana.",
          createdAt: new Date("2026-08-26T16:45:00Z").getTime(),
        },
      ],
    },
    {
      id: "rev_med_intensiva_1",
      businessUnitId: "bu_medicina_intensiva",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-08-31T15:00:00Z").getTime(),
      followUpDate: new Date("2026-09-14T18:00:00Z").getTime(),
      details: "• Definir metas de leads para o intensivão de provas práticas\n• Mapear objeções de compra da última turma\n• Validar copy do e-mail marketing com o coordenador pedagógico",
      assigneeName: "João Fontes",
      assigneeEmail: "joao.fontes@grupomedcof.com.br",
      status: "em_andamento",
      priority: "alta",
      tags: JSON.stringify(["Provas Práticas", "CRM / E-mail", "Metas"]),
      comments: [
        {
          id: "com_med_intensiva_1_1",
          authorName: "João Fontes",
          authorRole: "Analista de Marketing",
          authorEmail: "joao.fontes@grupomedcof.com.br",
          content: "O coordenador pedagógico aprovou a copy hoje pela manhã. Disparo agendado para quinta-feira.",
          createdAt: new Date("2026-09-01T10:15:00Z").getTime(),
        },
      ],
    },
    {
      id: "rev_pediatria_1",
      businessUnitId: "bu_pediatria",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-09-08T14:30:00Z").getTime(),
      followUpDate: new Date("2026-09-22T18:00:00Z").getTime(),
      details: "• Estruturar régua de CRM para a campanha de R3/Pediatria Geral\n• Gravar novos depoimentos de aprovados nos grandes hospitais\n• Ajustar budget diário no Google Search",
      assigneeName: "Beatriz Calixto",
      assigneeEmail: "beatriz.calixto@grupomedcof.com.br",
      status: "em_andamento",
      priority: "normal",
      tags: JSON.stringify(["CRM", "Depoimentos", "Google Ads"]),
      comments: [
        {
          id: "com_pediatria_1_1",
          authorName: "Beatriz Calixto",
          authorRole: "Analista de Marketing",
          authorEmail: "beatriz.calixto@grupomedcof.com.br",
          content: "3 depoimentos gravados e editados. Régua configurada na ActiveCampaign.",
          createdAt: new Date("2026-09-10T14:00:00Z").getTime(),
        },
      ],
    },
    {
      id: "rev_oftalmo_1",
      businessUnitId: "bu_oftalmologia",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-09-15T16:00:00Z").getTime(),
      followUpDate: new Date("2026-09-29T18:00:00Z").getTime(),
      details: "• Lançamento da imersão em retina e cirurgia de catarata\n• Planejar live tira-dúvidas com Dr. Oftalmo no YouTube\n• Coordenar disparos de WhatsApp com time de SDR",
      assigneeName: "Andressa Danielut",
      assigneeEmail: "andressa.danielut@grupomedcof.com.br",
      status: "novo",
      priority: "alta",
      tags: JSON.stringify(["Lançamento", "Live YouTube", "WhatsApp"]),
      comments: [
        {
          id: "com_oftalmo_1_1",
          authorName: "Ingrid Silva",
          authorRole: "Coordenadora de Marketing",
          authorEmail: "ingrid.silva@grupomedcof.com.br",
          content: "Convidem o supervisor e o social media para a live de alinhamento na próxima segunda.",
          createdAt: new Date("2026-09-15T17:00:00Z").getTime(),
        },
      ],
    },
    {
      id: "rev_concursus_1",
      businessUnitId: "bu_concursus",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-09-22T11:00:00Z").getTime(),
      followUpDate: new Date("2026-10-05T18:00:00Z").getTime(),
      details: "• Auditoria de páginas de captura para o concurso unificado e Forças Armadas\n• Criar banco de questões temáticas no blog\n• Ajustar oferta de combo R1 + Concursus",
      assigneeName: "Ricardo Machado",
      assigneeEmail: "ricardo.machado@grupomedcof.com.br",
      status: "pendente",
      priority: "urgente",
      tags: JSON.stringify(["Concurso Nacional", "Combo R1", "Landing Page"]),
      comments: [],
    },
    {
      id: "rev_radiologia_1",
      businessUnitId: "bu_radiologia",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-09-22T14:00:00Z").getTime(),
      followUpDate: new Date("2026-10-05T18:00:00Z").getTime(),
      details: "• Campanha de casos clínicos interativos no feed e stories\n• Fechar cronograma de aulas abertas para Outubro\n• Revisão do ticket médio e cupons de afiliados",
      assigneeName: "Mariana Vasconcelos",
      assigneeEmail: "mariana.vasconcelos@grupomedcof.com.br",
      status: "novo",
      priority: "normal",
      tags: JSON.stringify(["Social Media", "Aulas Abertas", "Ticket Médio"]),
      comments: [],
    },
    {
      id: "rev_clinica_medica_1",
      businessUnitId: "bu_clinica_medica",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-09-29T10:00:00Z").getTime(),
      followUpDate: new Date("2026-10-12T18:00:00Z").getTime(),
      details: "• Alinhar com o time de Social Media a semana de Clínica Médica\n• Análise da taxa de conversão do checkout e teste A/B da landing page\n• Ajustar automações de abandono de carrinho",
      assigneeName: "João Fontes",
      assigneeEmail: "joao.fontes@grupomedcof.com.br",
      status: "em_andamento",
      priority: "urgente",
      tags: JSON.stringify(["Semana Especial", "Teste A/B", "Checkout"]),
      comments: [
        {
          id: "com_clinica_medica_1_1",
          authorName: "João Fontes",
          authorRole: "Analista de Marketing",
          authorEmail: "joao.fontes@grupomedcof.com.br",
          content: "A taxa de conversão subiu de 1.8% para 2.4% com a nova página. Automação de WhatsApp para abandono já está ativa.",
          createdAt: new Date("2026-09-30T15:20:00Z").getTime(),
        },
      ],
    },
    {
      id: "rev_urologia_1",
      businessUnitId: "bu_urologia",
      coordinatorName: "Ingrid Silva",
      coordinatorEmail: "ingrid.silva@grupomedcof.com.br",
      meetingDate: new Date("2026-09-29T14:30:00Z").getTime(),
      followUpDate: new Date("2026-10-12T18:00:00Z").getTime(),
      details: "• Revisão das dúvidas frequentes enviadas pelos alunos\n• Atualizar criativos estáticos e vídeos curtos no TikTok/Reels\n• Preparar antecipação de Black Friday com lista VIP",
      assigneeName: "Beatriz Calixto",
      assigneeEmail: "beatriz.calixto@grupomedcof.com.br",
      status: "pendente",
      priority: "normal",
      tags: JSON.stringify(["FAQ", "Reels/TikTok", "Lista VIP"]),
      comments: [],
    },
  ];

  const now = Date.now();

  for (const item of items) {
    await client.execute({
      sql: `INSERT INTO planning_review_item (
        id, business_unit_id, coordinator_name, coordinator_email,
        meeting_date, follow_up_date, details, assignee_name, assignee_email,
        status, priority, tags, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'seed', 'seed', ?, ?)`,
      args: [
        item.id,
        item.businessUnitId,
        item.coordinatorName,
        item.coordinatorEmail,
        item.meetingDate,
        item.followUpDate,
        item.details,
        item.assigneeName,
        item.assigneeEmail,
        item.status,
        item.priority,
        item.tags,
        now,
        now,
      ],
    });

    for (const comment of item.comments) {
      await client.execute({
        sql: `INSERT INTO planning_review_comment (
          id, review_item_id, author_name, author_email, author_role, content, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          comment.id,
          item.id,
          comment.authorName,
          comment.authorEmail,
          comment.authorRole,
          comment.content,
          comment.createdAt,
        ],
      });
    }
  }

  console.log(`[seed-reviews] Sucesso: ${items.length} itens de revisão inseridos com comentários.`);
}
