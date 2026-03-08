import { random } from "@shared/utils/rng";

export default function getRandomInt(max: number): number {
  return Math.floor(random() * Math.floor(max));
}
