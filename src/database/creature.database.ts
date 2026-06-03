import { supabase } from "../lib/supabase";
import type { Creature, Level, Type, Move, CreatureMoveEntry } from "../types/creature.types";

export type JoinedCreatureLevel = Pick<Level, "id" | "level" | "xp_required">;

export type UserCreatureRow = {
  readonly current_xp: number;
  readonly creature: Creature | Creature[];
  readonly level: JoinedCreatureLevel | JoinedCreatureLevel[];
};

const CREATURE_COLUMNS =
  "id, name, front_img, back_img, evade, speed, defense, hp, description";

export async function getCreatures(): Promise<Creature[] | null> {
  const { data, error } = await supabase
    .from("Creatures")
    .select(CREATURE_COLUMNS);
  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }
  return data;
}

export async function getCreatureById(
  creatureId: string | number,
): Promise<Creature | null> {
  const { data, error } = await supabase
    .from("Creatures")
    .select(CREATURE_COLUMNS)
    .eq("id", creatureId)
    .single();
  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }
  return data;
}

export async function getMoveIdsByCreatureId(
  creatureId: string | number,
): Promise<CreatureMoveEntry[] | null> {
  const { data, error } = await supabase
    .from("Creature_Moves")
    .select("move_id, level_id")
    .eq("creature_id", creatureId)
    .order("level_id", { ascending: true });

  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }

  return (data ?? []).map(
    (row: { move_id: number; level_id: number }): CreatureMoveEntry => ({
      moveId: row.move_id,
      requiredLevelId: row.level_id,
    }),
  );
}

export async function getLevelById(
  levelId: number,
): Promise<Level | null> {
  const { data, error } = await supabase
    .from("Levels")
    .select("id, level, xp_required")
    .eq("id", levelId)
    .single();

  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }

  return data;
}

export async function getUserCreature(
  userId: string | number,
): Promise<UserCreatureRow | null> {
  const { data, error } = await supabase
    .from("User_Creature_Levels")
    .select(
      `
      current_xp,
      creature:creature_id ( ${CREATURE_COLUMNS} ),
      level:level_id ( id, level, xp_required )
    `,
    )
    .eq("user_id", userId)
    .single();
  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }
  return data;
}

export async function getUserCreatureById(
  userId: string,
  creatureId: string,
): Promise<UserCreatureRow | null> {
  const { data, error } = await supabase
    .from("User_Creature_Levels")
    .select(
      `
      current_xp,
      creature:creature_id ( ${CREATURE_COLUMNS} ),
      level:level_id ( id, level, xp_required )
    `,
    )
    .eq("user_id", userId)
    .eq("creature_id", creatureId)
    .limit(1);

  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }

  if (!data || data.length === 0) return null;

  return data[0] as UserCreatureRow;
}

export async function getTypes(): Promise<Type[] | null> {
  const { data, error } = await supabase.from("Types").select("id, name");
  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }
  return data;
}

export async function getTypesByCreatureId(
  creatureId: string | number,
): Promise<Type[] | null> {
  const { data, error } = await supabase
    .from("Creature_Types")
    .select("type:type_id ( id, name )")
    .eq("creature_id", creatureId);

  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }

  return (data ?? [])
    .map((row: { type: Type | Type[] }) =>
      Array.isArray(row.type) ? row.type[0] : row.type,
    )
    .filter((t): t is Type => t !== null && t !== undefined);
}

export async function getMoves(): Promise<Move[] | null> {
  const { data, error } = await supabase
    .from("Moves")
    .select("id, name, damage, chance, move_type_id");
  if (error) {
    console.error("Supabase error:", error.message);
    return null;
  }
  return data;
}

export async function awardXpToCreature(
  userId: string | number,
  creatureId: string | number,
  xpAmount: number,
): Promise<{ newXp: number; newLevelId: number } | null> {
  const { data: rows, error: fetchError } = await supabase
    .from("User_Creature_Levels")
    .select("current_xp, level_id")
    .eq("user_id", userId)
    .eq("creature_id", creatureId)
    .limit(1);

  if (fetchError || !rows || rows.length === 0) {
    console.error(
      "[awardXpToCreature] Failed to fetch creature row:",
      fetchError?.message,
    );
    return null;
  }

  const row = rows[0] as { current_xp: number; level_id: number };

  const { data: levels, error: levelsError } = await supabase
    .from("Levels")
    .select("id, level, xp_required")
    .order("level", { ascending: true });

  if (levelsError || !levels) {
    console.error(
      "[awardXpToCreature] Failed to fetch levels:",
      levelsError?.message,
    );
    return null;
  }

  const currentLevel = levels.find((l) => l.id === row.level_id);

  if (!currentLevel) {
    console.error("[awardXpToCreature] Current level not found");
    return null;
  }

  const nextLevel = levels.find((l) => l.level === currentLevel.level + 1);

  const tentativeXp = row.current_xp + xpAmount;

  let newXp = tentativeXp;
  let newLevelId = row.level_id;

  if (nextLevel && tentativeXp >= currentLevel.xp_required) {
    newLevelId = nextLevel.id;
    newXp = tentativeXp - currentLevel.xp_required;
  }

  const { error: updateError } = await supabase
    .from("User_Creature_Levels")
    .update({ current_xp: newXp, level_id: newLevelId })
    .eq("user_id", userId)
    .eq("creature_id", creatureId);

  if (updateError) {
    console.error(
      "[awardXpToCreature] Failed to update XP:",
      updateError.message,
    );
    return null;
  }

  return { newXp, newLevelId };
}

export async function initUserCreatures(userId: number): Promise<void> {
  const creatures = await getCreatures();
  if (!creatures) {
    console.error("[initUserCreatures] Failed to fetch creatures.");
    return;
  }

  const { data: levelOne, error: levelError } = await supabase
    .from("Levels")
    .select("id")
    .eq("level", 1)
    .single();

  if (levelError || !levelOne) {
    console.error(
      "[initUserCreatures] Failed to fetch level 1:",
      levelError?.message,
    );
    return;
  }

  const rows = creatures.map((creature) => ({
    user_id: userId,
    creature_id: creature.id,
    level_id: levelOne.id,
    current_xp: 0,
  }));

  const { error } = await supabase
    .from("User_Creature_Levels")
    .upsert(rows, {
      onConflict: "user_id, creature_id",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error(
      "[initUserCreatures] Failed to insert creature rows:",
      error.message,
    );
  }
}

export async function getMaxLevel(): Promise<number> {
  const { data, error } = await supabase
    .from("Levels")
    .select("level")
    .order("level", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    console.error("[getMaxLevel]", error?.message);
    return 1;
  }

  return data.level;
}