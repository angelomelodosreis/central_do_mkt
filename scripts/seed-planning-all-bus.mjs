import { createClient } from "@libsql/client";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local", quiet: true });

export async function seedPlanningAllBus(client) {
  // 1. Obter todas as BUs ativas
  const resBus = await client.execute("SELECT id, slug, label FROM business_unit WHERE is_active = 1");
  const bus = resBus.rows;
  console.log(`[seed-planning] Encontradas ${bus.length} Business Units ativas.`);

  let cyclesCreated = 0;
  let roundsCreated = 0;
  let goalsCreated = 0;

  for (const bu of bus) {
    const buId = bu.id;
    const buSlug = bu.slug;
    const buLabel = bu.label;

    // Verificar se já tem ciclo
    const resCycles = await client.execute({
      sql: "SELECT id, name, slug FROM strategy_cycle WHERE business_unit_id = ? ORDER BY starts_at ASC",
      args: [buId],
    });

    let cycleId;
    if (resCycles.rows.length === 0) {
      cycleId = `cyc_${buSlug}_2026`;
      const cycleSlug = "ciclo-2026-2027";
      const cycleName = `${buLabel} · 2026 / 2027`;
      const startsAt = new Date("2026-01-01T00:00:00.000Z").getTime();
      const endsAt = new Date("2027-12-31T23:59:59.999Z").getTime();
      const now = Date.now();

      await client.execute({
        sql: `INSERT INTO strategy_cycle (id, business_unit_id, name, slug, starts_at, ends_at, is_current, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [cycleId, buId, cycleName, cycleSlug, startsAt, endsAt, now, now],
      });
      cyclesCreated++;
    } else {
      cycleId = resCycles.rows[0].id;
    }

    // Verificar se já tem rodada no ciclo
    const resRounds = await client.execute({
      sql: "SELECT id FROM strategy_round WHERE cycle_id = ?",
      args: [cycleId],
    });

    let roundId;
    if (resRounds.rows.length === 0) {
      roundId = `rnd_${cycleId}_1`;
      const now = Date.now();
      await client.execute({
        sql: `INSERT INTO strategy_round (id, cycle_id, sequence, reference_date, is_open, summary, cycle_period, created_at, updated_at)
              VALUES (?, ?, 1, ?, 1, '1ª Rodada de Diagnóstico Semestral (Leitura dos 5 Pilares)', 'Jan - Jun/2027', ?, ?)`,
        args: [roundId, cycleId, now, now, now],
      });
      roundsCreated++;
    } else {
      roundId = resRounds.rows[0].id;
    }

    // Verificar se já tem metas 2.0
    const resGoals = await client.execute({
      sql: "SELECT id FROM strategy_kpi_goal WHERE business_unit_id = ? AND cycle_id = ?",
      args: [buId, cycleId],
    });

    if (resGoals.rows.length === 0) {
      const now = Date.now();
      const defaultGoals = [
        {
          id: `kpi_${buSlug}_1`,
          title: "Captura de Demanda e Penetração de Mercado no Ciclo",
          diagnosisBaseline: "🔗 Demanda não capturada · Mercado em crescimento",
          primaryKpiName: "Faturamento Bruto (R$)",
          primaryKpiTarget: "R$ 1.500.000",
          secondaryKpiName: "Volume de Vendas / Novos Alunos",
          secondaryKpiTarget: "350 matrículas",
          sortOrder: 1,
        },
        {
          id: `kpi_${buSlug}_2`,
          title: "Otimização de Eficiência de Aquisição e Funil",
          diagnosisBaseline: "🔗 Oportunidade de ganho de eficiência · Conversão abaixo do histórico",
          primaryKpiName: "CAC (Custo de Aquisição por Cliente)",
          primaryKpiTarget: "R$ 450,00",
          secondaryKpiName: "Taxa de Conversão da LP",
          secondaryKpiTarget: "3,8%",
          sortOrder: 2,
        },
        {
          id: `kpi_${buSlug}_3`,
          title: "Consolidação de Marca e Engajamento da Base de Clientes",
          diagnosisBaseline: "🔗 Crescimento da base · Potencial de crescimento do produto",
          primaryKpiName: "NPS e Satisfação do Aluno",
          primaryKpiTarget: "85+",
          secondaryKpiName: "Taxa de Renovação / LTV",
          secondaryKpiTarget: "R$ 2.400",
          sortOrder: 3,
        },
      ];

      for (const g of defaultGoals) {
        await client.execute({
          sql: `INSERT INTO strategy_kpi_goal (id, business_unit_id, cycle_id, title, diagnosis_baseline, primary_kpi_name, primary_kpi_target, secondary_kpi_name, secondary_kpi_target, sort_order, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            g.id,
            buId,
            cycleId,
            g.title,
            g.diagnosisBaseline,
            g.primaryKpiName,
            g.primaryKpiTarget,
            g.secondaryKpiName,
            g.secondaryKpiTarget,
            g.sortOrder,
            now,
            now,
          ],
        });
      }
      goalsCreated += defaultGoals.length;
    }
  }

  console.log(`[seed-planning] Concluído: ${cyclesCreated} ciclos, ${roundsCreated} rodadas, ${goalsCreated} metas 2.0 criadas.`);
}

// Se chamado diretamente via CLI
if (process.argv[1]?.endsWith("seed-planning-all-bus.mjs")) {
  const url = process.env.TURSO_DATABASE_URL ?? "file:./.data/local.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const isLocalFile = url.startsWith("file:");

  console.log(`Conectando ao banco: ${url}`);
  const client = createClient(isLocalFile ? { url } : { url, authToken });
  try {
    await seedPlanningAllBus(client);
  } catch (err) {
    console.error("Erro no seed:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}
