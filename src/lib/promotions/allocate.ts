/**
 * Distributes an order-level discount across line items.
 *
 * Why this matters: a discount must live on the *items*, not just the order
 * total. Refunds, per-dish reporting and tax all depend on knowing how much of
 * the discount belongs to each line. Doing it by simple percentage introduces
 * paise drift, so we use the largest-remainder method: every line gets its
 * floored share, then the leftover paise go to the lines with the biggest
 * fractional parts. The sum always equals the discount exactly, and no line can
 * go negative.
 */

export interface AllocatableLine {
  menuItemId: string;
  /** Line total in paise (price * quantity) - NOT the unit price. */
  amountPaise: number;
}

export function allocateDiscount(
  discountPaise: number,
  lines: AllocatableLine[]
): Record<string, number> {
  const allocation: Record<string, number> = {};
  for (const line of lines) allocation[line.menuItemId] = 0;

  const totalPaise = lines.reduce((sum, line) => sum + Math.max(0, line.amountPaise), 0);
  if (discountPaise <= 0 || totalPaise <= 0) return allocation;

  const capped = Math.min(discountPaise, totalPaise);

  const shares = lines.map((line) => {
    const amount = Math.max(0, line.amountPaise);
    const exact = (capped * amount) / totalPaise;
    const floor = Math.floor(exact);
    return { id: line.menuItemId, amount, exact, floor, fraction: exact - floor };
  });

  let assigned = 0;
  for (const share of shares) {
    allocation[share.id] = share.floor;
    assigned += share.floor;
  }

  // Hand out the remaining paise, biggest fractional part first (deterministic
  // tie-break on the item id so the result is reproducible).
  const ranked = [...shares].sort(
    (a, b) => b.fraction - a.fraction || a.id.localeCompare(b.id)
  );

  let remainder = capped - assigned;
  for (const share of ranked) {
    if (remainder <= 0) break;
    if (allocation[share.id] < share.amount) {
      allocation[share.id] += 1;
      remainder -= 1;
    }
  }

  // Pathological fallback (many tiny lines): fill any remaining paise in order.
  let guard = 0;
  while (remainder > 0 && guard < 10_000) {
    for (const share of shares) {
      if (remainder <= 0) break;
      if (allocation[share.id] < share.amount) {
        allocation[share.id] += 1;
        remainder -= 1;
      }
    }
    guard += 1;
  }

  return allocation;
}
