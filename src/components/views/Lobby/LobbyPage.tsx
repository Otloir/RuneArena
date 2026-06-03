import { useState, useEffect, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "./../../../hooks/usePlayer";
import { startTransaction } from "./../../../api/centralbank.api";
import type { TransactionResponse } from "./../../../types/api.types";
import Button from "../../atoms/buttons/Button";
import CreatureButton from "../../atoms/buttons/CreatureButton";
import InventoryPage from "../Inventory/InventoryPage";
import Tutorial from "../Tutorial/Tutorial";
import styles from "./LobbyPage.module.css";
import IconButton from "../../atoms/buttons/IconButton";
import informationIcon from "../../../assets/icons/information_icon.svg";
import bagIcon from "../../../assets/icons/bag_icon.svg";
import shopIcon from "../../../assets/icons/shop_icon.svg";
import swordIcon from "../../../assets/icons/sword_icon.svg";

const ENTRY_FEE = 2;

export default function LobbyPage(): ReactElement {
  const playerState = usePlayer();
  const navigate = useNavigate();

  const [selectedCreatureId, setSelectedCreatureId] = useState<string | null>(
    null,
  );
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);

  useEffect(() => {
    if (!isInventoryOpen && !isInfoOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isInventoryOpen, isInfoOpen]);

  if (playerState.status === "loading") {
    return <p className="pageLoadingState">Loading...</p>;
  }

  if (playerState.status === "error") {
    return <p>Something went wrong: {playerState.message}</p>;
  }

  const { player, identityToken } = playerState;
  const userId = String(player.id);
  const isGuest = player.isGuest;

  const handleCreatureSelect = (creatureId: string): void => {
    setSelectedCreatureId(creatureId);
    setChargeError(null);
  };

  const goToArena = (transaction: TransactionResponse | null): void => {
    navigate("/arena", {
      state: {
        playerOneUserId: userId,
        playerOneCreatureId: selectedCreatureId,
        transaction,
      },
    });
  };

  const handleStartArena = async (): Promise<void> => {
    if (!selectedCreatureId) return;

    // Guests play for free — skip payment
    if (isGuest || !identityToken) {
      goToArena(null);
      return;
    }

    // Charge the real user the entry fee before starting
    setIsCharging(true);
    setChargeError(null);

    const result = await startTransaction(identityToken, ENTRY_FEE);

    setIsCharging(false);

    if (!result.success) {
      // 401 = token expired, 402 = insufficient funds
      setChargeError(result.error);
      return;
    }

    goToArena(result.data);
  };

  const startButtonLabel = isCharging
    ? "Processing payment..."
    : isGuest
      ? "Start"
      : `Start (€${ENTRY_FEE})`;

  return (
    <>
      <Tutorial isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      <InventoryPage
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        userId={userId}
      />
      <section className={styles.lobbyPage}>
        <section>
          <div>
            <h1>RuneArena</h1>
            <p>Choose your fighter and dominate the arena!</p>
            {isGuest && (
              <p className={styles.guestText}>
                <span>Playing as </span>
                <span className={styles.guestTextGuest}>guest</span>
                <span> — progress won't be saved to your account.</span>
              </p>
            )}
          </div>
          <IconButton
            iconSrc={informationIcon}
            onClick={() => setIsInfoOpen(true)}
            label="Open information"
            className={styles.iconButton}
          />
          <div className={styles.inventoryShopComtainer}>
            <nav>
              <Button
                onClick={() => navigate("/store", { state: { userId } })}
                textColor="#155DFC"
              >
                <span className={styles.buttonLabel}>
                  <span
                    className={styles.buttonIcon}
                    aria-hidden="true"
                    style={{
                      WebkitMaskImage: `url(${shopIcon})`,
                      maskImage: `url(${shopIcon})`,
                    }}
                  />
                  <span>Store</span>
                </span>
              </Button>
            </nav>
            <Button
              onClick={() => setIsInventoryOpen(true)}
              backgroundColor="#DCB8A0"
              textColor="#955D38"
            >
              <span className={styles.buttonLabel}>
                <span
                  className={styles.buttonIcon}
                  aria-hidden="true"
                  style={{
                    WebkitMaskImage: `url(${bagIcon})`,
                    maskImage: `url(${bagIcon})`,
                  }}
                />
                <span>Bag</span>
              </span>
            </Button>
          </div>
        </section>

        <section>
          <section className={styles.creatureSelectContainer}>
            <h2>Select Your Creature</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleStartArena();
              }}
            >
              <div className={styles.creatureSelectButtons}>
                <CreatureButton
                  creatureId="1"
                  userId={userId}
                  onSelect={() => handleCreatureSelect("1")}
                  selected={selectedCreatureId === "1"}
                />
                <CreatureButton
                  creatureId="2"
                  userId={userId}
                  onSelect={() => handleCreatureSelect("2")}
                  selected={selectedCreatureId === "2"}
                />
                <CreatureButton
                  creatureId="3"
                  userId={userId}
                  onSelect={() => handleCreatureSelect("3")}
                  selected={selectedCreatureId === "3"}
                />
              </div>
              {chargeError && <p>Payment failed: {chargeError}</p>}
              <Button
                className={styles.startButton}
                type="submit"
                disabled={!selectedCreatureId || isCharging}
                backgroundColor="#b23131"
                size="lg"
              >
                <span className={styles.buttonLabel}>
                  <span
                    className={styles.buttonIcon}
                    aria-hidden="true"
                    style={{
                      WebkitMaskImage: `url(${swordIcon})`,
                      maskImage: `url(${swordIcon})`,
                    }}
                  />
                  <span>{startButtonLabel}</span>
                </span>
              </Button>
            </form>
          </section>
        </section>
      </section>
    </>
  );
}
