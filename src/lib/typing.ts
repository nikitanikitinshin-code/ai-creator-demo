/** Скорость «печати» ответа наставника; Typewriter и сценарий используют одну формулу. */
export const typeDuration = (len: number) => Math.min(1800, len * 11)
