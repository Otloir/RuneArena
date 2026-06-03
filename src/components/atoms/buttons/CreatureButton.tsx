import { useState } from "react";
import type { ReactElement } from "react";
import { useAsyncData } from "../../../hooks/useCreature";
import { getCreatureById } from "../../../database/creature.database";
import type { Creature } from "../../../types/creature.types";
import CreatureInfoPage from "../../views/CreatureInfo/CreatureInfoPage";
import IconButton from "./IconButton";
import styles from "./CreatureButton.module.css";
import defenseIcon from "./../../../assets/icons/defence_icon.svg";
import healthIcon from "./../../../assets/icons/health_icon.svg";
import speedIcon from "./../../../assets/icons/speed_icon.svg";
import evadeIcon from "./../../../assets/icons/evade_icon.svg";
import swordIcon from "./../../../assets/icons/sword_icon.svg";
import informationIcon from "./../../../assets/icons/information_icon.svg";

interface CreatureButtonProps {
  readonly creatureId: Creature["id"];
  readonly onSelect: (creature: Creature) => void;
  /** The logged-in user's ID — needed to fetch level for the info modal. */
  readonly userId: string | number;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  readonly shape?: "rounded" | "pill";
  readonly shadow?: boolean;
}

function CreatureButton({
  creatureId,
  onSelect,
  userId,
  selected = false,
  disabled = false,
  shape = "rounded",
  shadow = false,
}: CreatureButtonProps): ReactElement {
  const [infoOpen, setInfoOpen] = useState<boolean>(false);

  const {
    data: creature,
    loading,
    error,
  } = useAsyncData(() => getCreatureById(String(creatureId)), true);

  if (loading)
    return (
      <div className={styles.cardWrapper}>
        <button
          type="button"
          className={[
            styles.card,
            styles[shape],
            styles.loadingPlaceholder,
            shadow ? styles.withShadow : "",
          ].join(" ")}
          disabled
          aria-busy="true"
          aria-label="Loading creature"
        />
      </div>
    );

  if (error)
    return (
      <div className={styles.cardWrapper}>
        <button
          type="button"
          className={[styles.card, styles[shape], shadow ? styles.withShadow : ""].join(" ")}
          disabled
          aria-label={error}
        >
          {error}
        </button>
      </div>
    );

  if (!creature)
    return (
      <div className={styles.cardWrapper}>
        <button
          type="button"
          className={[styles.card, styles[shape], shadow ? styles.withShadow : ""].join(" ")}
          disabled
          aria-label="Creature unavailable"
        >
          Creature unavailable.
        </button>
      </div>
    );

  return (
    <>
      <CreatureInfoPage
        creatureId={creatureId}
        userId={userId}
        isOpen={infoOpen}
        onClose={(): void => setInfoOpen(false)}
        isBattleView={false}
      />

      <div className={styles.cardWrapper}>
        <button
          type="button"
          className={[
            styles.card,
            styles[shape],
            selected ? styles.selected : "",
            shadow ? styles.withShadow : "",
          ].join(" ")}
          onClick={(): void => onSelect(creature)}
          disabled={disabled}
          aria-pressed={selected}
          aria-label={`${selected ? "Selected: " : "Select "}${creature.name}, HP ${creature.hp}, Evade ${creature.evade}, Defense ${creature.defense}, Speed ${creature.speed}`}
        >
          {selected && (
            <div className={styles.selectedBadge} aria-hidden="true">
              Selected
            </div>
          )}
          <img
            src={creature.front_img}
            alt={creature.name}
            className={styles.sprite}
          />
          <h3 className={styles.name}>{creature.name}</h3>
          <div className={styles.hpRow}>
            <span className={styles.hpLabel}>
              <span
                className={styles.propertieIcon}
                aria-hidden="true"
                style={{
                  WebkitMaskImage: `url(${healthIcon})`,
                  maskImage: `url(${healthIcon})`,
                  backgroundColor: "var(--health)",
                }}
              />{" "}
              Health
            </span>
            <span className={styles.hpValue}>{creature.hp}/{creature.hp}</span>
          </div>
          <div
            className={styles.hpBar}
            role="progressbar"
            aria-valuenow={creature.hp}
            aria-valuemin={0}
            aria-valuemax={creature.hp}
            aria-label="HP bar"
          >
            <div className={styles.hpFill} style={{ width: "100%" }} />
          </div>
          <div className={styles.stats} aria-label="Creature stats">
            <span className={styles.stat}>
              <span
                className={styles.propertieIcon}
                aria-hidden="true"
                style={{
                  WebkitMaskImage: `url(${defenseIcon})`,
                  maskImage: `url(${defenseIcon})`,
                  backgroundColor: "var(--defense)",
                }}
              />{" "}
              {creature.defense}
            </span>
            <span className={styles.stat}>
              <span
                className={styles.propertieIcon}
                aria-hidden="true"
                style={{
                  WebkitMaskImage: `url(${speedIcon})`,
                  maskImage: `url(${speedIcon})`,
                  backgroundColor: "var(--speed)",
                }}
              />{" "}
              {creature.speed}
            </span>
            <span className={styles.stat}>
              <span
                className={styles.propertieIcon}
                aria-hidden="true"
                style={{
                  WebkitMaskImage: `url(${evadeIcon})`,
                  maskImage: `url(${evadeIcon})`,
                  backgroundColor: "var(--evade)",
                }}
              />{" "}
              {creature.evade}
            </span>
          </div>
        </button>

        {/* SC 2.5.5: min 44×44px | SC 3.3.5: descriptive aria-label */}
        <div
          className={styles.infoButtonWrapper}
          onClick={(e): void => e.stopPropagation()}
        >
          <IconButton
            iconSrc={informationIcon}
            label={`View detailed information for ${creature.name}`}
            onClick={(): void => setInfoOpen(true)}
            aria-haspopup="dialog"
            variant="neutral"
            shape="circle"
            size="md"
            className={styles.infoButton}
          />
        </div>
      </div>
    </>
  );
}

export default CreatureButton;