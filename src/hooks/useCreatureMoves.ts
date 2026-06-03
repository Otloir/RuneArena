// hooks/useCreatureMoves.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function useCreatureMoves(
  creatureId: number,
  creatureLevel?: number,
): {
  moveIds: number[] | undefined;
  loading: boolean;
  error: string | null;
} {
  const [moveIds, setMoveIds] = useState<number[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    if (creatureId <= 0) {
      setMoveIds(undefined);
      setLoading(false);
      setError(null);
      return () => {
        isActive = false;
      };
    }

    const fetchMoves = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("Creature_Moves")
          .select("move_id, level_id")
          .eq("creature_id", creatureId)
          .order("level_id", { ascending: true });

        if (creatureLevel !== undefined) {
          query = query.lte("level_id", creatureLevel);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (isActive) {
          setMoveIds(data?.map((entry) => entry.move_id).slice(0, 4) ?? []);
        }
      } catch (err) {
        if (isActive) {
          setError(err instanceof Error ? err.message : "Failed to load moves");
          setMoveIds(undefined);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchMoves();

    return () => {
      isActive = false;
    };
  }, [creatureId, creatureLevel]);

  return { moveIds, loading, error };
}