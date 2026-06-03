import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import Item from "../../atoms/Item/Item";
import {
  getItems,
  getUserItems,
  buyItem,
} from "../../../database/item.database";
import type { BuyResult } from "../../../database/item.database";
import type { Item as ItemType } from "../../../types/item.types";
import styles from "./ItemList.module.css";
import PurchaseModal from "../PurchaseModal/PurchaseModal";
import type { PurchaseStatus } from "../PurchaseModal/PurchaseModal";

interface ListProps {
  readonly type?: "store" | "inventory";
  readonly variant: "card" | "row";
  readonly userId?: string;
  readonly onUseItem?: (item: ItemType) => Promise<boolean>;
  readonly refreshToggle?: boolean;
  readonly balance?: number;
  readonly onBalanceChange?: () => void;
  readonly isInBattle?: boolean;
}

interface ActivePurchase {
  readonly itemName: string;
  readonly status: BuyResult;
}

type InventoryConsumptionWindow = Window & {
  __consumingItems?: Set<string>;
};

function getInventoryConsumptionWindow(): InventoryConsumptionWindow {
  return window as InventoryConsumptionWindow;
}

export default function ItemList({
  type,
  variant,
  userId,
  onUseItem,
  refreshToggle,
  balance,
  onBalanceChange,
  isInBattle = false,
}: ListProps): ReactElement {
  const [items, setItems] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<ActivePurchase | null>(
    null,
  );
  const [inProgressIds, setInProgressIds] = useState<number[]>([]);

  const handleBuy = async (item: ItemType): Promise<void> => {
    if (!userId) return;
    const result: BuyResult = await buyItem(userId, item.id);
    setPurchaseStatus({ itemName: item.name, status: result });
    if (result === "success") {
      onBalanceChange?.();
    }
  };

  const closePurchaseModal = (): void => {
    setPurchaseStatus(null);
  };

  useEffect((): (() => void) => {
    let isComponentMounted = true;

    async function loadItems(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const data: ItemType[] | null =
          type === "inventory" && userId != null
            ? await getUserItems(userId)
            : await getItems();
        if (!isComponentMounted) return;
        if (data) {
          setItems(Array.isArray(data) ? data : []);
        } else {
          setError("Failed to load items");
        }
      } catch {
        if (!isComponentMounted) return;
        setError("Failed to load items");
      } finally {
        if (isComponentMounted) setLoading(false);
      }
    }

    loadItems();

    const inventoryChangeHandler = (event: Event): void => {
      try {
        const inventoryChangeEvent = event as CustomEvent;
        if (!userId) return;
        const changedUserId = String(inventoryChangeEvent.detail?.userId ?? "");
        if (changedUserId === String(userId)) {
          loadItems();
        }
      } catch {
        console.error("Malformed inventory event", error);
      }
    };

    window.addEventListener(
      "inventory:changed",
      inventoryChangeHandler as EventListener,
    );

    return (): void => {
      isComponentMounted = false;
      window.removeEventListener(
        "inventory:changed",
        inventoryChangeHandler as EventListener,
      );
    };
  }, [userId, type, refreshToggle]);

  const handleUse = async (item: ItemType): Promise<void> => {
    if (!onUseItem) return;

    if (inProgressIds.includes(item.id)) return;

    const consumptionWindow = getInventoryConsumptionWindow();
    consumptionWindow.__consumingItems ??= new Set<string>();
    const consumptionKey = `${userId}:${item.id}`;
    const activeConsumptionSet = consumptionWindow.__consumingItems;
    if (activeConsumptionSet?.has(consumptionKey)) return;
    activeConsumptionSet?.add(consumptionKey);

    setInProgressIds((p) => [...p, item.id]);

    const previousItems = items;

    const itemIndex = items.findIndex(
      (currentItem) => currentItem.id === item.id,
    );
    if (itemIndex !== -1) {
      const updatedItems = items
        .map((i) =>
          i.id === item.id ? { ...i, quantity: (i.quantity ?? 1) - 1 } : i,
        )
        .filter((i) => (i.quantity ?? 1) > 0);
      setItems(updatedItems);
    }

    try {
      const wasItemUsed = await onUseItem(item);
      if (!wasItemUsed) {
        setItems(previousItems);
      } else {
        if (userId) {
          const refreshedItems = await getUserItems(userId);
          if (refreshedItems) setItems(refreshedItems);
        }
      }
    } catch {
      console.error("Failed to use item", error);
      setItems(previousItems);
    } finally {
      setInProgressIds((p) => p.filter((id) => id !== item.id));
      consumptionWindow.__consumingItems?.delete(consumptionKey);
    }
  };

  if (loading) return <div className="pageLoadingState">Loading items...</div>;
  if (error) return <div>{error}</div>;

  if (items.length === 0 && type === "inventory") {
    return (
      <div className={styles.emptyState}>
        <p>Your inventory is empty</p>
        <p>Visit the store to get started!</p>
      </div>
    );
  }

  if (items.length === 0 && type === "store") {
    return (
      <div className={styles.emptyState}>
        <p>No items available in the store</p>
      </div>
    );
  }

  const modalStatus: PurchaseStatus = purchaseStatus?.status ?? null;

  return (
    <div
      className={
        type === "store" ? styles.shopItemList : styles.inventoryItemList
      }
    >
      <PurchaseModal
        itemName={purchaseStatus?.itemName ?? ""}
        status={modalStatus}
        isOpen={purchaseStatus !== null}
        onClose={closePurchaseModal}
      />
      {items.map((item: ItemType) => (
        <Item
          key={item.id}
          item={item}
          variant={variant}
          type={type}
          onBuy={
            type === "store" ? (): Promise<void> => handleBuy(item) : undefined
          }
          onUse={
            type === "inventory" && onUseItem
              ? (): Promise<void> => handleUse(item)
              : undefined
          }
          canAfford={balance == null || item.price <= balance}
          isInBattle={isInBattle}
        />
      ))}
    </div>
  );
}
