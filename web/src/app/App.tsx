import { useEffect, useState } from "react";
import { loadWasmAdapter } from "../bridge/wasmAdapter";

export function App() {
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    let ignore = false;
    loadWasmAdapter().then(
      () => !ignore && setStatus("ready"),
      () => !ignore && setStatus("failed"),
    );
    return () => {
      ignore = true;
    };
  }, []);
  return <p>{status}</p>;
}
