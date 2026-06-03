import type { ReactElement } from "react";
import { Navigate, useLocation } from "react-router-dom";
import BattleArena from "./../../organisms/BattleArena/BattleArena";
import type { TransactionResponse } from "../../../types/api.types";
import { getCreatures } from "../../../database/creature.database";
import { useEffect, useState } from "react";

interface ArenaState {
  readonly playerOneUserId: string;
  readonly playerOneCreatureId: string;
  readonly transaction: TransactionResponse | null;
}

export default function ArenaPage(): ReactElement {
  const location = useLocation();
  const state = location.state as ArenaState | undefined;

  const playerOneUserId: string | undefined = state?.playerOneUserId;
  const playerOneCreatureId: string | undefined = state?.playerOneCreatureId;
  const transaction: TransactionResponse | null = state?.transaction ?? null;

  const [playerTwoCreatureId, setPlayerTwoCreatureId] = useState<
    number | null
  >(null);

  /*
   * Hook must be called before any conditional returns to satisfy
   * the Rules of Hooks. We guard inside the effect instead.
   */
  useEffect((): void => {
    async function pickRandomCreature(): Promise<void> {
      const creatures = await getCreatures();
      if (!creatures || creatures.length === 0) return;

      const randomIndex = Math.floor(Math.random() * creatures.length);
      const randomCreature = creatures[randomIndex];
      setPlayerTwoCreatureId(Number(randomCreature.id));
    }

    pickRandomCreature();
  }, []);

  // Guard moved after all hooks
  if (!playerOneUserId || !playerOneCreatureId) {
    return <Navigate to="/" replace />;
  }

  if (playerTwoCreatureId === null) {
    return <div>Loading arena...</div>;
  }

  return (
    <BattleArena
      playerOneId={playerOneUserId}
      playerTwoId="1"
      playerOneCreatureId={playerOneCreatureId}
      playerTwoCreatureId={playerTwoCreatureId}
      transaction={transaction}
      isGuest={transaction === null}
    />
  );
}