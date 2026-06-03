import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import StatusPanel from "../../molecules/StatusPanel/StatusPanel";
import Creature from "../../molecules/Creature/Creature";
import styles from "./BattleArena.module.css";
import PlayerPanel from "../../molecules/PlayerPanel/PlayerPanel";
import InventoryPage from "../../views/Inventory/InventoryPage";
import { useCreatureById, useCreatureBase } from "../../../hooks/useCreature";
import { useBattle } from "../../../hooks/useBattle";
import { startBattle, endBattle } from "../../../database/battle.database";
import type { BattleError } from "../../../database/battle.database";
import { formatStamp } from "../../../api/centralbank.api";
import type { TransactionResponse } from "../../../types/api.types";
import { consumeUserItem } from "../../../database/item.database";
import { getMaxLevel } from "../../../database/creature.database";

interface BattleArenaProps {
  readonly playerOneId: string | number;
  readonly playerTwoId: string | number;
  readonly playerOneCreatureId: string | number;
  readonly playerTwoCreatureId: string | number;
  readonly transaction: TransactionResponse | null;
  readonly isGuest: boolean;
}

export default function BattleArena({
  playerOneId,
  playerTwoId,
  playerOneCreatureId,
  playerTwoCreatureId,
  transaction,
  isGuest,
}: BattleArenaProps): ReactElement {
  const {
    creature: playerOneCreature,
    level: playerOneLevel,
    levelId: playerOneLevelId,
    loading: playerOneLoading,
    error: playerOneError,
  } = useCreatureById(playerOneId, playerOneCreatureId);

  const {
    creature: playerTwoCreature,
    loading: playerTwoLoading,
    error: playerTwoError,
  } = useCreatureBase(playerTwoCreatureId);

  const maxLevelRef = useRef<number>(Infinity);

  useEffect((): void => {
    getMaxLevel().then((max) => {
      maxLevelRef.current = max;
    });
  }, []);

  const randomizedOpponentLevelRef = useRef<number | null>(null);
  if (
    randomizedOpponentLevelRef.current === null &&
    playerOneLevelId !== null
  ) {
      const roll = Math.floor(Math.random() * 3);
      const rawLevel =
        roll === 0
          ? Math.max(1, playerOneLevel - 1)
          : roll === 2
            ? playerOneLevel + 1
            : playerOneLevel;

  randomizedOpponentLevelRef.current = Math.min(rawLevel, maxLevelRef.current);

  }
  const randomizedOpponentLevel = randomizedOpponentLevelRef.current ?? 1;

  const {
    playerHp,
    opponentHp,
    turnOwner,
    isProcessing,
    battleLog,
    handlePlayerMove,
    xpGained,
    handlePlayerUseItem,
    playerStatBoosts,
  } = useBattle({
    playerCreature: playerOneCreature,
    opponentCreature: playerTwoCreature,
    opponentCreatureId: playerTwoCreatureId,
    opponentLevel: randomizedOpponentLevel,
    playerUserId: playerOneId,
    playerCreatureId: playerOneCreatureId,
  });

  const navigate = useNavigate();

  // ── Battle session refs ──────────────────────────────────────────────────
  const battleIdRef = useRef<number | null>(null);
  const battleStartedRef = useRef<boolean>(false);
  const battleConcludedRef = useRef<boolean>(false);

  // Prevents the battle-end effect from calling endBattle when startBattle failed
  const sessionInvalidRef = useRef<boolean>(false);

  // ── Hit animation state ──────────────────────────────────────────────────
  const [prevPlayerHp, setPrevPlayerHp] = useState<number | null>(null);
  const [prevOpponentHp, setPrevOpponentHp] = useState<number | null>(null);
  const [playerIsHit, setPlayerIsHit] = useState<boolean>(false);
  const [opponentIsHit, setOpponentIsHit] = useState<boolean>(false);

  const [opponentIsAttacking, setOpponentIsAttacking] = useState(false);

  // ── Inventory overlay ────────────────────────────────────────────────────
  const [isInventoryOpen, setIsInventoryOpen] = useState<boolean>(false);
  const [isUsingItem, setIsUsingItem] = useState<boolean>(false);

  const battleOver: boolean = playerHp <= 0 || opponentHp <= 0;

  const creatureLoadFailed: boolean =
    (!playerOneLoading && playerOneError !== null) ||
    (!playerTwoLoading && playerTwoError !== null);

  // ── Hit animations ───────────────────────────────────────────────────────

  useEffect((): (() => void) | void => {
    if (prevPlayerHp !== null && playerHp < prevPlayerHp) {
      setPlayerIsHit(true);

      const timer = setTimeout((): void => {
        setPlayerIsHit(false);
      }, 400);

      return (): void => clearTimeout(timer);
    }

    setPrevPlayerHp(playerHp);
  }, [playerHp, prevPlayerHp]);

  useEffect((): (() => void) | void => {
    if (prevOpponentHp !== null && opponentHp < prevOpponentHp) {
      setOpponentIsHit(true);

      const timer = setTimeout((): void => {
        setOpponentIsHit(false);
      }, 400);

      return (): void => clearTimeout(timer);
    }

    setPrevOpponentHp(opponentHp);
  }, [opponentHp, prevOpponentHp]);

  // ── Opponent attack animation delay ─────────────────────────────────────
  useEffect(() => {
    if (turnOwner !== "opponent" || !isProcessing) {
      setOpponentIsAttacking(false);
      return;
    }

    const timer = setTimeout(() => {
      setOpponentIsAttacking(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [turnOwner, isProcessing]);

  // ── Creature load failure → navigate away immediately ────────────────────

  useEffect((): void => {
    if (!creatureLoadFailed) return;

    sessionInvalidRef.current = true;
    battleConcludedRef.current = true;

    navigate("/result", {
      replace: true,
      state: {
        sessionError: "unknown",
        winner: undefined,
        playerCreatureName: undefined,
        opponentCreatureName: undefined,
        xpGained: 0,
        stamp: null,
      },
    });
  }, [creatureLoadFailed, navigate]);

  // ── Register battle server-side when both creatures load ─────────────────

  useEffect((): void => {
    if (!playerOneCreature || !playerTwoCreature) return;
    if (battleStartedRef.current) return;

    battleStartedRef.current = true;

    if (isGuest) return;

    startBattle({
      playerId: Number(playerOneId),
      opponentId: Number(playerTwoId),
      playerCreatureId: Number(playerOneCreatureId),
      enemyCreatureId: Number(playerTwoCreatureId),
    })
      .then((battleId: number): void => {
        battleIdRef.current = battleId;
      })
      .catch((reason: BattleError): void => {
        sessionInvalidRef.current = true;
        battleConcludedRef.current = true;

        navigate("/result", {
          replace: true,
          state: {
            sessionError: reason,
            winner: undefined,
            playerCreatureName: undefined,
            opponentCreatureName: undefined,
            xpGained: 0,
            stamp: null,
          },
        });
      });
  }, [
    playerOneCreature,
    playerTwoCreature,
    playerOneId,
    playerTwoId,
    playerOneCreatureId,
    playerTwoCreatureId,
    navigate,
    isGuest,
  ]);

  // ── Forfeit on unmount if battle hasn't concluded normally ───────────────

  useEffect((): (() => void) => {
    return (): void => {
      if (battleConcludedRef.current) return;

      const battleId = battleIdRef.current;

      if (battleId === null) return;

      endBattle(battleId, 0).catch((reason: unknown): void => {
        console.warn(
          "[BattleArena] Forfeit endBattle failed silently:",
          reason,
        );
      });
    };
  }, []);

  // ── Battle end → close server-side → navigate to result ─────────────────

  useEffect((): (() => void) | void => {
    if (!playerOneCreature || !playerTwoCreature) return;
    if (playerHp > 0 && opponentHp > 0) return;
    if (sessionInvalidRef.current) return;

    const winner: "player" | "opponent" =
      opponentHp <= 0 ? "player" : "opponent";

    const timer = setTimeout(async (): Promise<void> => {
      battleConcludedRef.current = true;

      const stamp = transaction?.stamp
        ? {
            name: formatStamp(transaction.stamp),
            imageUrl: transaction.stamp.image_url,
          }
        : null;

      // ── Guest: award RC locally then navigate to result ───────────────
      if (isGuest) {
        try {
          const { addRunecoins } =
            await import("../../../database/user.database");
          await addRunecoins(Number(playerOneId), 5);
        } catch (err) {
          console.warn("[BattleArena] Failed to award guest RC:", err);
        }

        navigate("/result", {
          replace: true,
          state: {
            winner,
            playerCreatureName: playerOneCreature.name,
            opponentCreatureName: playerTwoCreature.name,
            xpGained,
            stamp: null,
            isGuest: true,
            userId: Number(playerOneId),
          },
        });
        return;
      }

      // ── Authenticated user: close battle server-side ──────────────────
      const battleId = battleIdRef.current;

      if (battleId === null) {
        console.warn(
          "[BattleArena] Battle ended but no battleId recorded — reward not granted.",
        );
        navigate("/result", {
          replace: true,
          state: {
            sessionError: "battle_not_found" as BattleError,
            winner: undefined,
            playerCreatureName: undefined,
            opponentCreatureName: undefined,
            xpGained,
            stamp,
          },
        });
        return;
      }

      const winnerUserId = winner === "player" ? Number(playerOneId) : 0;

      try {
        await endBattle(battleId, winnerUserId);
        navigate("/result", {
          replace: true,
          state: {
            winner,
            playerCreatureName: playerOneCreature.name,
            opponentCreatureName: playerTwoCreature.name,
            xpGained,
            stamp,
            isGuest: false,
          },
        });
      } catch (reason: unknown) {
        navigate("/result", {
          replace: true,
          state: {
            sessionError: reason as BattleError,
            winner: undefined,
            playerCreatureName: undefined,
            opponentCreatureName: undefined,
            xpGained,
            stamp,
          },
        });
      }
    }, 1200);

    return (): void => clearTimeout(timer);
  }, [
    playerHp,
    opponentHp,
    playerOneCreature,
    playerTwoCreature,
    playerOneId,
    navigate,
    xpGained,
    transaction,
    isGuest,
  ]);

  // ── Loading state ────────────────────────────────────────────────────────

  if (
    playerOneLoading ||
    playerTwoLoading ||
    creatureLoadFailed ||
    !playerOneCreature ||
    !playerTwoCreature
  ) {
    return (
      <section className={styles.arena}>
        <div
          className="pageLoadingState loadingState"
          role="status"
          aria-live="polite"
          aria-label="Loading battle..."
        >
          Loading battle...
        </div>
      </section>
    );
  }

  // ── Arena ────────────────────────────────────────────────────────────────

  return (
    <section className={styles.arena}>
      <InventoryPage
        isOpen={isInventoryOpen}
        onClose={(): void => setIsInventoryOpen(false)}
        userId={String(playerOneId)}
        isInBattle={true}
        onUseItem={async (item): Promise<boolean> => {
          try {
            setIsInventoryOpen(false);
            setIsUsingItem(true);

            await handlePlayerUseItem(item);

            const removed = await consumeUserItem(String(playerOneId), item.id);

            return removed;
          } catch (err) {
            console.error("Error using item:", err);
            return false;
          } finally {
            setIsUsingItem(false);
          }
        }}
      />

      <div className={styles.arenaContainer}>
        <div className={styles.battleView}>
          {/* Opponent */}
          <div className={styles.opponentContainer}>
            <div className={styles.opponent}>
              <StatusPanel
                userId={playerTwoId}
                creatureId={playerTwoCreatureId}
                currentHp={opponentHp}
                side="opponent"
                overrideLevel={randomizedOpponentLevel}
              />

              <Creature
                userId={playerTwoId}
                creatureId={playerTwoCreatureId}
                side="opponent"
                isAttacking={opponentIsAttacking}
                isHit={opponentIsHit}
              />
            </div>
          </div>

          {/* Player */}
          <div className={styles.playerContainer}>
            <div className={styles.player}>
              <StatusPanel
                userId={playerOneId}
                creatureId={playerOneCreatureId}
                currentHp={playerHp}
                side="player"
              />

              <Creature
                userId={playerOneId}
                creatureId={playerOneCreatureId}
                side="player"
                isAttacking={
                  turnOwner === "player" && isProcessing && !isUsingItem
                }
                isHit={playerIsHit}
              />
            </div>
          </div>
        </div>

        {/* Bottom controls panel */}
        <div className={styles.controlsWrapper}>
          <PlayerPanel
            creatureId={Number(playerOneCreatureId)}
            creatureLevel={playerOneLevel}
            creatureLevelId={playerOneLevelId}
            onMoveSelect={handlePlayerMove}
            disabled={turnOwner !== "player" || isProcessing || battleOver}
            battleLog={battleLog}
            playerCreature={playerOneCreature}
            onOpenInventory={(): void => setIsInventoryOpen(true)}
            currentHp={playerHp}
            maxHp={playerOneCreature.hp}
            userId={playerOneId}
            statBoosts={playerStatBoosts}
          />
        </div>
      </div>
    </section>
  );
}
