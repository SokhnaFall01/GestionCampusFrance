import { prisma } from "./prisma";

type EventType =
  | "STAGE"
  | "DOCUMENT"
  | "TASK"
  | "ASSESSMENT"
  | "DECISION"
  | "NOTE"
  | "SYSTEM";

type Author = "ADMIN" | "CANDIDATE" | "SYSTEM";

// Ajoute une ligne au journal de suivi d'un candidat.
export async function logEvent(
  candidateId: string,
  type: EventType,
  message: string,
  author: Author = "SYSTEM",
) {
  await prisma.timelineEvent.create({
    data: { candidateId, type, message, author },
  });
}
