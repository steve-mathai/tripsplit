import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeletons";
import { ExpenseFormLoader } from "../expense-form-loader";

export const metadata = { title: "Edit expense" };

export default function EditExpensePage({ params }: PageProps<"/t/[slug]/expenses/[id]">) {
  return (
    <Suspense fallback={<CardSkeleton count={3} height="h-40" />}>
      <ExpenseFormLoader params={params} expenseId={params.then((p) => p.id)} />
    </Suspense>
  );
}
