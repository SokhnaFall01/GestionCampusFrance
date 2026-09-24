import { getSessionId } from "@/lib/auth";
import { NewStudentForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewStudentPage() {
  const sid = (await getSessionId()) ?? "";
  return <NewStudentForm sid={sid} />;
}
