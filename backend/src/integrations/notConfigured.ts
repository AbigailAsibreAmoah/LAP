/** Thrown when a live provider is selected before its adapter exists. */
export function liveAdapterNotImplemented(service: string): never {
  throw new Error(
    `${service}: live adapter is not implemented yet. Set the provider to "mock" or implement the live adapter (see docs/integrations.md).`,
  );
}
