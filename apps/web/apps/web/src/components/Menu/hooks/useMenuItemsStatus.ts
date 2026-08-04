// Ifo / competition / voting / trading-reward badges are no longer surfaced —
// the corresponding menu entries and pages were removed (Task 11), so the
// status hooks that unconditionally queried lottery/prediction/ifo/voting/
// trading-reward endpoints are no longer invoked here.
export const useMenuItemsStatus = (): Record<string, string> => {
  return {}
}
