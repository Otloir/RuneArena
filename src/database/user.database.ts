import { supabase } from "../lib/supabase";

export interface UserBalance {
  readonly runecoins: number;
}

export type PurchaseError =
  | "insufficient_funds"
  | "item_not_found"
  | "unknown";


export async function getUserBalance(userId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from("Users")
    .select("runecoins")
    .eq("id", userId)
    .single<UserBalance>();

  if (error) {
    console.error("[getUserBalance]", error.message);
    return null;
  }

  return data.runecoins;
}

export async function addRunecoins(
  userId: number,
  amount: number,
): Promise<number | null> {
  try {
    const current = await getUserBalance(userId);
    if (current === null) return null;
    const newValue = current + amount;

    const { data, error } = await supabase
      .from("Users")
      .update({ runecoins: newValue })
      .eq("id", userId)
      .select("runecoins")
      .single();

    if (error || !data) {
      console.error("[addRunecoins] Failed to update runecoins:", error?.message);
      return null;
    }

    return data.runecoins;
  } catch (err) {
    console.error("[addRunecoins] Error:", err);
    return null;
  }
}


export async function purchaseItem(
  userId: number,
  itemId: number,
): Promise<number> {
  const { data, error } = await supabase.rpc("purchase_item", {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) {
    const reason: PurchaseError = parsePurchaseError(error.message);
    if (reason === "unknown") {
      console.error("[purchaseItem]", reason, error.message);
    }
    throw reason;
  }

  return data as number;
}

function parsePurchaseError(message: string): PurchaseError {
  if (message.includes("insufficient_funds")) return "insufficient_funds";
  if (message.includes("item_not_found")) return "item_not_found";
  return "unknown";
}