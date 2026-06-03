import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import type { ReactElement } from "react";
import styles from "./ResultPage.module.css";
import Button from "../../atoms/buttons/Button";
import type { BattleError } from "../../../database/battle.database";

interface StampReward {
  readonly name: string;
  readonly imageUrl: string | null;
}

interface ResultState {
  readonly winner?: "player" | "opponent";
  readonly playerCreatureName?: string;
  readonly opponentCreatureName?: string;
  readonly xpGained?: number;
  readonly stamp: StampReward | null;
  readonly sessionError?: BattleError;
  readonly userId?: number;
  readonly isGuest: boolean;
}

const SESSION_ERROR_MESSAGES: Record<BattleError, string> = {
  already_in_battle:
    "This session is invalid — a battle is already in progress in another tab. " +
    "Please close the other tab and start a new battle.",
  battle_not_found: "Battle session not found. Please start a new battle.",
  battle_already_ended:
    "This battle session was overridden by a newer battle in another tab. " +
    "No RuneCoins were awarded. Please close duplicate tabs and start a new battle.",
  reward_already_claimed:
    "The reward for this battle has already been claimed.",
  unknown:
    "Failed to load battle data. This can happen with duplicate tabs or a connection issue. " +
    "Please start a new battle.",
};

export default function ResultPage(): ReactElement {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as ResultState | null;

  const sessionError: BattleError | undefined = state?.sessionError;
  const playerWon: boolean = state?.winner === "player";
  const playerName: string = state?.playerCreatureName ?? "Your creature";
  const opponentName: string = state?.opponentCreatureName ?? "The opponent";
  const xpGained: number = state?.xpGained ?? 0;
  const stamp: StampReward | null = state?.stamp ?? null;
  const isGuest: boolean = state?.isGuest ?? true;
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const handleBack = (): void => {
    if (isGuest) {
      void navigate("/");
    } else {
      window.parent.postMessage({ type: "AMUSEMENT_CLOSE" }, "");
    }
  };

  useEffect((): void => {
    if (stamp === null) {
      console.log("ResultPage: no stamp awarded (guest)");
    }
  }, [stamp]);

  useEffect((): void => {
    const userId: number | undefined = state?.userId;
    if (!playerWon || userId == null || sessionError != null) return;
  }, []);

  // ── Invalid session screen ───────────────────────────────────────────────

  if (sessionError) {
    return (
      <main className={styles.resultPage}>
        <section className={styles.content} aria-labelledby="result-title">
          <h1 className={`${styles.title} ${styles.defeat}`}>
            Invalid Session
          </h1>
          <p className={styles.subtitle}>
            {SESSION_ERROR_MESSAGES[sessionError]}
          </p>
          <Button
            type="button"
            variant="neutral"
            onClick={(): void => void navigate("/")}
            aria-label="Return to main arena"
            className={styles.secondaryButton}
          >
            Back to Arena
          </Button>
        </section>
      </main>
    );
  }

  // ── Normal result screen ─────────────────────────────────────────────────

  return (
    <main className={styles.resultPage}>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="visuallyHidden"
      >
        {playerWon
          ? `${playerName} defeated ${opponentName}. You gained ${xpGained} experience points.`
          : `${playerName} was defeated by ${opponentName}.`}
      </div>
      <section className={styles.content}>
        <h1
          ref={headingRef}
          id="result-title"
          tabIndex={-1}
          className={`${styles.title} ${playerWon ? styles.victory : styles.defeat}`}
        >
          {playerWon ? "Victory!" : "Defeated!"}
        </h1>

        <p className={styles.subtitle}>
          {playerWon
            ? `${playerName} defeated ${opponentName}!`
            : `${playerName} was defeated by ${opponentName}...`}
        </p>

        {stamp !== null && (
          <section
            className={styles.rewardSection}
            aria-labelledby="reward-heading"
          >
            <p id="reward-heading" className={styles.rewardLabel}>
              You earned a stamp:
            </p>
            <article className={styles.rewardCard} aria-label="Stamp details">
              <div className={styles.rewardImageContainer}>
                {stamp.imageUrl ? (
                  <img
                    src={stamp.imageUrl}
                    alt={`${stamp.name} stamp`}
                    className={styles.rewardImage}
                  />
                ) : (
                  <span className={styles.rewardFallback}>🪲</span>
                )}
              </div>
              <p className={styles.rewardName}>{stamp.name}</p>
            </article>
          </section>
        )}

        <p
          className={styles.xpGained}
          aria-label={`You gained ${xpGained} experience points`}
        >
          +{xpGained} XP
        </p>

        {playerWon && <p className={styles.rcGained}>+5 RC </p>}

        <Button
          type="button"
          variant="neutral"
          onClick={
            isGuest
              ? handleBack
              : () =>
                  window.parent.postMessage({ type: "AMUSEMENT_CLOSE" }, "*")
          }
          aria-label={isGuest ? "Return to lobby" : "Return to Tivoli"}
          className={styles.secondaryButton}
        >
          {isGuest ? "Back to Lobby" : "Back to Tivoli"}
        </Button>
      </section>
    </main>
  );
}
