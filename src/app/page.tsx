import React from "react";
import { TranscriptProvider } from "./contexts/TranscriptContext";
import { EventProvider } from "./contexts/EventContext";
import App from "./App";

export default function Page() {
  return (
    <TranscriptProvider>
      <EventProvider>
        <App />
      </EventProvider>
    </TranscriptProvider>
  );
}
