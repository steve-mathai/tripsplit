import { Suspense } from "react";
import { CardSkeleton } from "@/components/skeletons";
import { ExpenseFormLoader } from "../expense-form-loader";

export const metadata = { title: "Add expense" };

export default function NewExpensePage({ params }: PageProps<"/t/[slug]/expenses/new">) {
  return (
    <Suspense fallback={<CardSkeleton count={3} height="h-40" />}>
      <ExpenseFormLoader params={params} />
    </Suspense>
  );
}
