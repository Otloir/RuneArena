import { useItem } from "./../../../hooks/useItem";
import type { Item as ItemType } from "./../../../types/item.types";
import type { ReactElement } from "react";
import styles from "./Item.module.css";
interface ItemProps {
  readonly item?: ItemType;
  readonly itemId?: number;
  readonly variant?: "row" | "card";
  readonly type?: "store" | "inventory";
  readonly onBuy?: () => void | Promise<void>;
  readonly onUse?: () => void | Promise<void>;
  readonly canAfford?: boolean;
  readonly isInBattle?: boolean;
}
function Item({
  item,
  itemId,
  variant = "row",
  type,
  onBuy,
  onUse,
  canAfford = true,
  isInBattle = false,
}: ItemProps): ReactElement | null {
  const {
    item: fetchedItem,
    loading,
    error,
  } = useItem(itemId && !item ? itemId : undefined);
  const displayItem: ItemType | undefined = item ?? fetchedItem ?? undefined;
  if (!item) {
    if (loading) return <div aria-busy="true">Loading item...</div>;
    if (error) return <div role="alert">{error}</div>;
  }
  if (!displayItem) return <div role="status">No item found.</div>;
  const quantity = displayItem.quantity ?? 1;
  const inventoryLabel = `${displayItem.name}. ${displayItem.description}. Effect: ${displayItem.property} ${displayItem.propvalue}. Quantity: ${quantity}.`;
  const affordabilityHelpId = `affordability-help-${displayItem.id}`;
  if (variant === "card") {
    return (
      <article
        className={styles.card}
        tabIndex={0}
        aria-label={
          `${displayItem.name}. ` +
          `${displayItem.description}. ` +
          `Effect: ${displayItem.property} ${displayItem.propvalue}. ` +
          `Price: ${displayItem.price} RC. ` +
          `${canAfford ? "Can afford." : "Cannot afford."}`
        }
      >
        {displayItem.img && (
          <img
            src={displayItem.img}
            alt={displayItem.name}
            className={styles.cardImg}
          />
        )}
        <h3 className={styles.cardName}>{displayItem.name}</h3>
        <p className={styles.cardProperty}>
          {displayItem.property} {displayItem.propvalue}
        </p>
        {!isInBattle && (
          <p className={styles.cardDescription}>{displayItem.description}</p>
        )}
        <>
        <div className={styles.cardFooter}>
          <span className={styles.price}>
            {displayItem.price}
              <span aria-hidden="true" className={styles.coinIcon}>
                RC
              </span>
          </span>

          {type === "store" && onBuy && (
            <button
              className={`${styles.buyBtn}${!canAfford ? ` ${styles.buyBtnDisabled}` : ""}`}
              onClick={onBuy}
              disabled={!canAfford}
              aria-label={
                !canAfford
                  ? `Cannot buy ${displayItem.name}. Insufficient RuneCoins.`
                  : `Buy ${displayItem.name} for ${displayItem.price} RuneCoins`
              }
              aria-describedby={
                !canAfford ? affordabilityHelpId : undefined
              }
            >
              Buy
            </button>
          )}
        </div>

      </>
      {!canAfford && (
          <span
            id={affordabilityHelpId}
            className="visuallyHidden"
          >
            Insufficient RuneCoins to purchase this item. Earn more RC by winning
            battles.
          </span>
        )}
      </article>
    );
  }
  return (
    <article className={styles.row} tabIndex={0} aria-label={inventoryLabel}>
      {displayItem.img && (
        <img
          src={displayItem.img}
          alt={displayItem.name}
          className={styles.rowImg}
        />
      )}
      <div className={styles.rowBody}>
        <div className={styles.rowTitleRow}>
          <span className={styles.rowName}>{displayItem.name}</span>
          <span className={styles.rowQuantity}>× {quantity}</span>
        </div>
        <p className={styles.rowProperty}>
          {displayItem.property} {displayItem.propvalue}
        </p>
        {!isInBattle && (
          <p className={styles.rowDescription}>{displayItem.description}</p>
        )}
      </div>
      {type === "inventory" && onUse && (
        <div className={styles.rowActions}>
          <button
            className={styles.useBtn}
            onClick={onUse}
            aria-label={`Use ${displayItem.name}`}
          >
            Use
          </button>
        </div>
      )}
    </article>
  );
}
export default Item;
