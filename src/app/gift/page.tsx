import { Suspense } from "react";
import GiftContent from "./gift-client";

export const dynamic = "force-dynamic";

export default function GiftPage() {
  return (
    <Suspense>
      <GiftContent locale="en" />
    </Suspense>
  );
}
