import { useState, useEffect, useCallback } from "react";
import type { MoveWithType } from "../types/move.types";
import type { Creature } from "../types/creature.types";
import type { Item } from "../types/item.types";
import type { StatBoosts } from "../types/battleEffects.types";
import { getMoveById } from "../database/move.database";
import { supabase } from "../lib/supabase";
import { awardXpToCreature } from "../database/creature.database";

export type TurnOwner = "player" | "opponent";

// Add to UseBattleProps:
interface UseBattleProps {
  playerCreature: Creature | null;
  opponentCreature: Creature | null;
  opponentCreatureId: number | string;
  opponentLevel?: number;
  playerUserId: number | string;
  playerCreatureId: number | string;
}

// =========================
// HELPERS
// =========================

async function fetchCreatureMoveIds(
  creatureId: number,
  creatureLevel?: number,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("Creature_Moves")
    .select("move_id, level:level_id(level)")
    .eq("creature_id", creatureId);

  if (error || !data) return [];

  type Row = { move_id: number; level: { level: number } | { level: number }[] };
  let moves = data as Row[];

  if (creatureLevel !== undefined) {
    moves = moves.filter((row) => {
      const lvl = Array.isArray(row.level) ? row.level[0]?.level : row.level?.level;
      return lvl !== undefined && lvl <= creatureLevel;
    });
  }

  return moves
    .map((row) => row.move_id)
    .slice(0, 4);
}

async function fetchCreatureTypeIds(creatureId: number): Promise<number[]> {
  const { data, error } = await supabase
    .from("Creature_Types")
    .select("type_id")
    .eq("creature_id", creatureId);

  if (error || !data) return [];
  return data.map((e) => e.type_id);
}

async function fetchAllTypeEffectiveness(): Promise<Map<
  number,
  Map<number, number>
> | null> {
  const { data, error } = await supabase
    .from("Type_Effectiveness")
    .select("attacker_id, defender_id, effectiveness");

  if (error || !data) return null;

  const map = new Map<number, Map<number, number>>();

  for (const row of data) {
    if (!map.has(row.attacker_id)) {
      map.set(row.attacker_id, new Map());
    }
    map.get(row.attacker_id)!.set(row.defender_id, Number(row.effectiveness));
  }

  return map;
}

// =========================
// TYPE EFFECTIVENESS
// =========================

function getTypeMultiplier(
  map: Map<number, Map<number, number>>,
  attackerTypeId: number,
  defenderTypeIds: number[],
): number {
  let multiplier = 1;

  const attackerMap = map.get(attackerTypeId);
  if (!attackerMap) return 1;

  for (const defId of defenderTypeIds) {
    const value = attackerMap.get(defId);
    if (value !== undefined) {
      multiplier *= value;
    }
  }

  return multiplier;
}

// =========================
// BATTLE LOGIC
// =========================

function attackHits(moveChance = 100, evade = 0): boolean {
  const final = Math.max(5, Math.min(100, moveChance - evade));
  return Math.random() * 100 < final;
}

function applyDefense(damage: number, defense = 0): number {
  const mult = Math.max(0, 1 - defense / 100);
  return Math.max(1, Math.floor(damage * mult));
}

type DamageResult = {
  damage: number;
  message: string | null;
};

async function calculateDamage(
  move: MoveWithType,
  defenderTypes: number[],
  map: Map<number, Map<number, number>>,
): Promise<DamageResult> {
  let dmg = move.damage;
 
  const multiplier = getTypeMultiplier(map, move.move_type_id, defenderTypes);
 
  let message: string | null = null;
 
  if (multiplier > 1) message = "It's super effective!";
  else if (multiplier < 1) message = "It's not very effective...";
 
  dmg = Math.max(1, Math.floor(dmg * multiplier));
 
  return { damage: dmg, message };
}

// =========================
// HOOK
// =========================

export function useBattle({
  playerCreature,
  opponentCreature,
  opponentCreatureId,
  opponentLevel,
  playerUserId,
  playerCreatureId,
}: UseBattleProps): {
  playerHp: number;
  opponentHp: number;
  turnOwner: TurnOwner | null;
  isProcessing: boolean;
  battleLog: string[];
  battleError: string | null;
  xpGained: number;
  playerStatBoosts: StatBoosts;
  handlePlayerMove: (move: MoveWithType) => Promise<void>;
  handlePlayerUseItem: (item: Item) => Promise<void>;
} {
  const [xpGained, setXpGained] = useState(0);
  const [playerHp, setPlayerHp] = useState<number | null>(null);
  const [opponentHp, setOpponentHp] = useState<number | null>(null);
  const [turnOwner, setTurnOwner] = useState<TurnOwner | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  const [opponentMoveIds, setOpponentMoveIds] = useState<number[]>([]);
  const [playerTypeIds, setPlayerTypeIds] = useState<number[]>([]);
  const [opponentTypeIds, setOpponentTypeIds] = useState<number[]>([]);
  const [effectivenessMap, setEffectivenessMap] = useState<Map<
    number,
    Map<number, number>
  > | null>(null);
  const [battleError, setBattleError] = useState<string | null>(null);
  const [playerStatBoosts, setPlayerStatBoosts] = useState<StatBoosts>({
    evadeBoost: 0,
    speedBoost: 0,
    defenseBoost: 0,
  });

  // =========================
  // READY STATE
  // =========================

  const isReady =
    !!playerCreature && !!opponentCreature && effectivenessMap !== null && opponentMoveIds.length > 0;

  const log = useCallback((msg: string) => {
    setBattleLog((p) => [...p, msg]);
  }, []);

  // =========================
  // INIT BATTLE
  // =========================

  useEffect(() => {
    if (!playerCreature || !opponentCreature) return;

    setPlayerHp(playerCreature.hp);
    setOpponentHp(opponentCreature.hp);

    const first =
      opponentCreature.speed > playerCreature.speed ? "opponent" : "player";

    setTurnOwner(first);

    setBattleLog([
      `${first === "player" ? playerCreature.name : opponentCreature.name} goes first!`,
    ]);
  }, [playerCreature, opponentCreature]);

  // =========================
  // LOAD EFFECTIVENESS
  // =========================

  useEffect(() => {
    async function load(): Promise<void> {
      const map = await fetchAllTypeEffectiveness();

      if (map === null) {
        console.error("[useBattle] Failed to load Type_Effectiveness table.");
        setBattleError(
          "Could not load battle data. Please check your connection and try again.",
        );
        return;
      }

      setEffectivenessMap(map);
    }
    load();
  }, []);

  // =========================
  // LOAD TYPES
  // =========================

  useEffect(() => {
    if (playerCreature?.id) {
      fetchCreatureTypeIds(Number(playerCreature.id)).then((ids) => {
        if (ids.length === 0) {
          console.warn(
            `[useBattle] Player creature "${playerCreature.name}" (id: ${playerCreature.id}) ` +
              `has no types in the database. Damage multipliers will default to ×1.`,
          );
        }
        setPlayerTypeIds(ids);
      });
    }

    if (opponentCreature?.id) {
      fetchCreatureTypeIds(Number(opponentCreature.id)).then((ids) => {
        if (ids.length === 0) {
          console.warn(
            `[useBattle] Opponent creature "${opponentCreature.name}" (id: ${opponentCreature.id}) ` +
              `has no types in the database. Damage multipliers will default to ×1.`,
          );
        }
        setOpponentTypeIds(ids);
      });
    }
  }, [playerCreature, opponentCreature]);

  // =========================
  // LOAD OPPONENT MOVES
  // =========================

  useEffect(() => {
    if (!opponentCreatureId) return;
    let cancelled = false;

    fetchCreatureMoveIds(Number(opponentCreatureId), opponentLevel).then(
      (ids) => {
        if (!cancelled) setOpponentMoveIds(ids);
      }
    );

    return () => { cancelled = true; };
  }, [opponentCreatureId, opponentLevel]);

  // =========================
  // PLAYER DAMAGE
  // =========================

  const damageOpponent = useCallback(
    async (move: MoveWithType): Promise<boolean> => {
      if (!isReady || !opponentCreature || !effectivenessMap) return false;
  
      const attackerName = playerCreature?.name ?? "Your creature";
      const moveName = move.name;
  
      if (!attackHits(move.chance ?? 100, opponentCreature.evade ?? 0)) {
        log(`${attackerName} used ${moveName}, but it missed!`);
        return true;
      }
  
      const result = await calculateDamage(
        move,
        opponentTypeIds,
        effectivenessMap,
      );
  
      const finalDamage = applyDefense(result.damage, opponentCreature.defense ?? 0);
  
      const currentHp = opponentHp ?? opponentCreature.hp;
      const newHp = Math.max(0, currentHp - finalDamage);
  
      setOpponentHp(newHp);
      log(`${attackerName} used ${moveName} for ${finalDamage} damage!`);
      if (result.message) log(result.message);
  
      if (newHp <= 0) {
        const awarded = await awardXpToCreature(playerUserId, playerCreatureId, 100);
        if (awarded) {
          setXpGained(100);
          log(`${attackerName} gained 100 XP!`);
        }
        return false;
      }
  
      return true;
    },
    [
      isReady,
      playerCreature,
      opponentCreature,
      opponentHp,
      opponentTypeIds,
      effectivenessMap,
      playerUserId,
      playerCreatureId,
      log,
    ],
  );

  // =========================
  // OPPONENT DAMAGE
  // =========================

  const damagePlayer = useCallback(
    async (move: MoveWithType): Promise<void> => {
      if (!isReady || !playerCreature || !effectivenessMap) return;
  
      const attackerName = opponentCreature?.name ?? "The opponent";
      const moveName = move.name;
  
      const effectiveEvade =
        (playerCreature.evade ?? 0) + playerStatBoosts.evadeBoost;
  
      if (!attackHits(move.chance ?? 100, effectiveEvade)) {
        log(`${attackerName} used ${moveName}, but it missed!`);
        return;
      }
  
      const result = await calculateDamage(
        move,
        playerTypeIds,
        effectivenessMap,
      );
  
      const baseDefense = playerCreature.defense ?? 0;
      const defenseBoostAmount = Math.floor(
        (baseDefense * playerStatBoosts.defenseBoost) / 100,
      );
      const effectiveDefense = baseDefense + defenseBoostAmount;
      const finalDamage = applyDefense(result.damage, effectiveDefense);
  
      setPlayerHp((p) => Math.max(0, (p ?? playerCreature.hp) - finalDamage));
      log(`${attackerName} used ${moveName} for ${finalDamage} damage!`);
      if (result.message) log(result.message);
    },
    [
      isReady,
      playerCreature,
      opponentCreature,
      playerTypeIds,
      effectivenessMap,
      playerStatBoosts,
      log,
    ],
  );

  // =========================
  // NPC TURN
  // =========================

  const executeOpponentTurn = useCallback(
    async (ids: number[]): Promise<void> => {
      if (!ids.length) {
        log(`${opponentCreature?.name ?? "The opponent"} has no moves!`);
        setTurnOwner("player");
        return;
      }

      const move = await getMoveById(
        ids[Math.floor(Math.random() * ids.length)],
      );

      if (!move) {
        log("Opponent move failed.");
        setTurnOwner("player");
        return;
      }

      await damagePlayer(move);
      setTurnOwner("player");
    },
    [damagePlayer, opponentCreature, log],
  );

  // =========================
  // PLAYER MOVE
  // =========================

  
  const applyItemEffect = useCallback(
    (item: Item): StatBoosts => {
      const { property, propvalue } = item;
      const propLower = property.toLowerCase().trim();
  
      if (
        propLower === "hp" ||
        propLower === "health" ||
        propLower === "healing"
      ) {
        const currentHp = playerHp ?? playerCreature?.hp ?? 0;
        const maxHp = playerCreature?.hp ?? 0;
        const healed = Math.min(propvalue, maxHp - currentHp);
        setPlayerHp(currentHp + healed);
        log(
          `${playerCreature?.name ?? "Your creature"} recovered ${healed} HP!`,
        );
        // HP items don't affect stat boosts — return current boosts unchanged
        return playerStatBoosts;
      }
  
      if (propLower === "evade") {
        const next: StatBoosts = {
          ...playerStatBoosts,
          evadeBoost: playerStatBoosts.evadeBoost + propvalue,
        };
        setPlayerStatBoosts(next);
        log(
          `${playerCreature?.name ?? "Your creature"}'s evade increased by ${propvalue}!`,
        );
        return next;
      }
  
      const boostMap: Record<string, keyof StatBoosts> = {
        defense: "defenseBoost",
        speed: "speedBoost",
      };
  
      const boostKey = boostMap[propLower];
      if (boostKey) {
        const next: StatBoosts = {
          ...playerStatBoosts,
          [boostKey]: playerStatBoosts[boostKey] + propvalue,
        };
        setPlayerStatBoosts(next);
        log(
          `${playerCreature?.name ?? "Your creature"}'s ${property} increased by ${propvalue}%!`,
        );
        return next;
      }
  
      log(`Used ${item.name}... (effect unknown)`);
      return playerStatBoosts;
    },
    [playerHp, playerCreature, playerStatBoosts, log],
  );

  // =========================
  // PLAYER MOVE
  // =========================

  const handlePlayerMove = useCallback(
    async (move: MoveWithType): Promise<void> => {
      if (turnOwner !== "player" || isProcessing) return;

      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 1200));
      const opponentAlive = await damageOpponent(move);

      if (opponentAlive) {
        setTurnOwner("opponent");
      }
      setIsProcessing(false);
    },
    [turnOwner, isProcessing, damageOpponent],
  );

  const handlePlayerUseItem = useCallback(
    async (item: Item): Promise<void> => {
      if (turnOwner !== "player" || isProcessing) return;
  
      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 1500));
  
      const baseSpeed = playerCreature?.speed ?? 0;
      const opponentSpeed = opponentCreature?.speed ?? 0;
      const speedBeforeItem =
        baseSpeed + Math.floor((baseSpeed * playerStatBoosts.speedBoost) / 100);
      const wasAlreadyFaster = speedBeforeItem > opponentSpeed;
  
      const newBoosts = applyItemEffect(item);
  
      const speedAfterItem =
        baseSpeed + Math.floor((baseSpeed * newBoosts.speedBoost) / 100);
      const isNowFaster = speedAfterItem > opponentSpeed;
  
      await new Promise((r) => setTimeout(r, 1200));
  
      if (isNowFaster && !wasAlreadyFaster) {
        log(
          `${playerCreature?.name ?? "Your creature"} is now faster and goes first!`,
        );
      }
  
      if (isNowFaster) {
        setTurnOwner("player");
      } else {
        setTurnOwner("opponent");
      }
  
      setIsProcessing(false);
    },
    [turnOwner, isProcessing, applyItemEffect, playerCreature, opponentCreature, playerStatBoosts, log],
  );

  // =========================
  // AUTO NPC TURN
  // =========================

  useEffect(() => {
    if (
      turnOwner !== "opponent" ||
      isProcessing ||
      !opponentMoveIds.length ||
      !isReady
    )
      return;

    const run = async (): Promise<void> => {
      setIsProcessing(true);
      await new Promise((r) => setTimeout(r, 2200));
      await executeOpponentTurn(opponentMoveIds);
      setIsProcessing(false);
    };

    run();
  }, [turnOwner, isProcessing, opponentMoveIds, executeOpponentTurn, isReady]);
  

  // =========================
  // RETURN
  // =========================

  return {
    playerHp: playerHp ?? playerCreature?.hp ?? 0,
    opponentHp: opponentHp ?? opponentCreature?.hp ?? 0,
    turnOwner,
    isProcessing,
    battleLog,
    battleError,
    xpGained,
    playerStatBoosts,
    handlePlayerMove,
    handlePlayerUseItem,
  };
}
