import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CONSENT_KEY, CONSENT_EVENT, readConsent, writeConsent, clearConsent } from "./consent";

// The lib runs in the browser, the suite runs in node (vitest environment is
// "node" project-wide). A minimal fake window is enough: EventTarget gives real
// addEventListener/dispatchEvent semantics, so the event contract is exercised
// for real rather than through a spy.
function installWindow(storage: Partial<Storage>) {
  const w = Object.assign(new EventTarget(), { localStorage: storage });
  (globalThis as unknown as { window: unknown }).window = w;
  return w as EventTarget & { localStorage: Partial<Storage> };
}

function makeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    removeItem: (k: string) => { delete data[k]; },
    _data: data,
  } as unknown as Storage & { _data: Record<string, string> };
}

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

describe("readConsent", () => {
  it("returns null when nothing has been stored yet", () => {
    installWindow(makeStorage());
    expect(readConsent()).toBeNull();
  });

  it("reads back both decisions", () => {
    installWindow(makeStorage({ [CONSENT_KEY]: "accepted" }));
    expect(readConsent()).toBe("accepted");

    installWindow(makeStorage({ [CONSENT_KEY]: "refused" }));
    expect(readConsent()).toBe("refused");
  });

  it("treats an unrecognised stored value as no decision", () => {
    // Guards against an older or hand-edited value silently counting as consent.
    installWindow(makeStorage({ [CONSENT_KEY]: "yes" }));
    expect(readConsent()).toBeNull();
  });

  it("returns null when localStorage throws", () => {
    // Private browsing and blocked-cookie settings make the accessor throw.
    installWindow({ getItem: () => { throw new Error("denied"); } });
    expect(readConsent()).toBeNull();
  });

  it("returns null when there is no window at all", () => {
    expect(readConsent()).toBeNull();
  });
});

describe("writeConsent", () => {
  it("stores the decision", () => {
    const storage = makeStorage();
    installWindow(storage);
    writeConsent("accepted");
    expect(storage._data[CONSENT_KEY]).toBe("accepted");
  });

  it("notifies listeners in the same tab", () => {
    // The native storage event does not fire in the tab that writes, so the
    // trackers would otherwise stay dark until the next page load.
    const w = installWindow(makeStorage());
    const seen = vi.fn();
    w.addEventListener(CONSENT_EVENT, seen);

    writeConsent("accepted");

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("still notifies when the write itself fails", () => {
    // Consent was given; the UI must react even if it could not be persisted.
    const w = installWindow({ setItem: () => { throw new Error("denied"); } });
    const seen = vi.fn();
    w.addEventListener(CONSENT_EVENT, seen);

    expect(() => writeConsent("refused")).not.toThrow();
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("does nothing when there is no window at all", () => {
    expect(() => writeConsent("accepted")).not.toThrow();
  });
});

describe("clearConsent", () => {
  it("puts the user back to no decision, which reopens the banner", () => {
    const storage = makeStorage({ [CONSENT_KEY]: "accepted" });
    installWindow(storage);

    clearConsent();

    expect(readConsent()).toBeNull();
  });

  it("notifies listeners so the banner reappears without a reload", () => {
    const w = installWindow(makeStorage({ [CONSENT_KEY]: "refused" }));
    const seen = vi.fn();
    w.addEventListener(CONSENT_EVENT, seen);

    clearConsent();

    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("survives a storage that throws", () => {
    installWindow({ removeItem: () => { throw new Error("denied"); } });
    expect(() => clearConsent()).not.toThrow();
  });
});
