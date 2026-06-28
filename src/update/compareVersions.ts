import { Array, Option, Order } from "effect";

const stripLeadingV = (value: string) =>
  value.startsWith("v") ? value.slice(1) : value;

const parseVersion = (value: string) =>
  Array.map(
    stripLeadingV(value).split("-")[0]?.split(".") ?? [],
    (part) => Number.parseInt(part, 10) || 0,
  );

const padTo = (parts: readonly number[], length: number) =>
  Array.appendAll(
    parts,
    Array.makeBy(Math.max(0, length - parts.length), () => 0),
  );

export const normalizeVersion = (value: string) => stripLeadingV(value);

export const isNewer = (latest: string, current: string) => {
  const latestParts = parseVersion(latest);
  const currentParts = parseVersion(current);
  const length = Math.max(latestParts.length, currentParts.length);
  const comparisons = Array.zipWith(
    padTo(latestParts, length),
    padTo(currentParts, length),
    (a, b) => Order.Number(a, b),
  );

  return Option.match(
    Array.findFirst(comparisons, (comparison) => comparison !== 0),
    {
      onNone: () => false,
      onSome: (comparison) => comparison > 0,
    },
  );
};
