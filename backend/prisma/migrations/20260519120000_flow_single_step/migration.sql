-- Fluxo = uma ação; encadeamento via next_flow_id; remove flow_step.

ALTER TABLE "flow" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'interpret';
ALTER TABLE "flow" ADD COLUMN "content" TEXT;
ALTER TABLE "flow" ADD COLUMN "metadata" JSONB;
ALTER TABLE "flow" ADD COLUMN "next_flow_id" TEXT;

-- Copia a etapa de entrada (ou a primeira) para o registo do fluxo.
UPDATE "flow" AS f
SET
  "type" = COALESCE(es."type", 'interpret'),
  "content" = es."content",
  "metadata" = es."metadata"
FROM (
  SELECT
    fs."flow_id",
    fs."type",
    fs."content",
    fs."metadata",
    ROW_NUMBER() OVER (
      PARTITION BY fs."flow_id"
      ORDER BY
        CASE WHEN fs."key" = fl."entry_step_key" THEN 0 ELSE 1 END,
        fs."created_at" ASC
    ) AS rn
  FROM "flow_step" AS fs
  INNER JOIN "flow" AS fl ON fl."id" = fs."flow_id"
  WHERE fs."deleted_at" IS NULL
) AS es
WHERE es."flow_id" = f."id" AND es.rn = 1;

ALTER TABLE "flow" DROP COLUMN "entry_step_key";

ALTER TABLE "conversation" DROP COLUMN IF EXISTS "current_step";

DROP TABLE IF EXISTS "flow_step";

CREATE INDEX "flow_next_flow_id_idx" ON "flow"("next_flow_id");

ALTER TABLE "flow"
  ADD CONSTRAINT "flow_next_flow_id_fkey"
  FOREIGN KEY ("next_flow_id") REFERENCES "flow"("id") ON DELETE SET NULL ON UPDATE CASCADE;
