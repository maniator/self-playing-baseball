import { random } from "./rng";

export default function getRandomInt(max: number) {
  return Math.floor(random() * Math.floor(max));
}
