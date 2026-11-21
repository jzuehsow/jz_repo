import { useEffect, useState } from "react";

import { maritimeService, type MaritimeServiceStatus } from "@/maritime/services/maritimeService";

export function useMaritimeStatus(): MaritimeServiceStatus {
  const [status, setStatus] = useState<MaritimeServiceStatus>(() => maritimeService.status());
  useEffect(() => maritimeService.subscribe(setStatus), []);
  return status;
}
