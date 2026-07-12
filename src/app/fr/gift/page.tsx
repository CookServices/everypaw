import { Suspense } from "react";
import GiftContent from "../../gift/gift-client";

export const dynamic = "force-dynamic";

export default function FrGiftPage() {
  return (
    <Suspense>
      <GiftContent locale="fr" />
    </Suspense>
  );
}
