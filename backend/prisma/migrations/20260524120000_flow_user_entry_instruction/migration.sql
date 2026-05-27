-- Fluxos pertencem à conta; agente opcional; disparo por instrução (IA).

ALTER TABLE "flow" ADD COLUMN "user_id" TEXT;
ALTER TABLE "flow" ADD COLUMN "entry_instruction" TEXT;

UPDATE "flow" f
SET "user_id" = a."user_id"
FROM "agent" a
WHERE f."agent_id" = a."id" AND f."user_id" IS NULL;

UPDATE "flow"
SET "entry_instruction" = COALESCE(
  NULLIF(TRIM("name"), ''),
  'Fluxo legado — revise a instrução de início.'
)
WHERE "entry_instruction" IS NULL OR TRIM("entry_instruction") = '';

UPDATE "flow" SET "entry_mode" = 'instruction' WHERE "entry_mode" IN ('trigger', 'always_idle');

ALTER TABLE "flow" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "flow" ALTER COLUMN "entry_mode" SET DEFAULT 'instruction';

ALTER TABLE "flow" ALTER COLUMN "agent_id" DROP NOT NULL;

ALTER TABLE "flow" ADD CONSTRAINT "flow_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "flow_user_id_idx" ON "flow"("user_id");
