// src/providers/boot-state.ts
// Tiny in-memory flag that lives as long as the browser tab does (soft navigations keep it,
// a hard reload resets it). Only ever written from the browser, in an effect, never on the server.
export const bootState = {
  /** true once the corporate section has been shown in this tab */
  visitedCorporate: false,
};
