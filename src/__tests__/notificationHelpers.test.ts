import { describe, it, expect, vi, beforeEach } from "vitest";
import { getNotificationBody, getNotificationActions, showManagerNotification, closeManagerNotification } from "../DecisionPanel/notificationHelpers";
import type { DecisionType } from "../Context";

// appLog is a module-level singleton; mock it so tests don't emit console output.
vi.mock("../utilities/logger", () => ({
  appLog: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
  createLogger: vi.fn(() => ({ log: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

describe("getNotificationBody", () => {
  it("returns steal message with 1st base", () => {
    const d: DecisionType = { kind: "steal", base: 0, successPct: 65 };
    expect(getNotificationBody(d)).toBe("Steal from 1st base? (65% success)");
  });

  it("returns steal message with 2nd base", () => {
    const d: DecisionType = { kind: "steal", base: 1, successPct: 40 };
    expect(getNotificationBody(d)).toBe("Steal from 2nd base? (40% success)");
  });

  it("returns bunt message", () => {
    expect(getNotificationBody({ kind: "bunt" })).toBe("Sacrifice bunt opportunity");
  });

  it("returns count30 message", () => {
    expect(getNotificationBody({ kind: "count30" })).toBe("Count is 3-0 — Take or swing?");
  });

  it("returns count02 message", () => {
    expect(getNotificationBody({ kind: "count02" })).toBe("Count is 0-2 — Protect or swing?");
  });

  it("returns ibb message", () => {
    expect(getNotificationBody({ kind: "ibb" })).toBe("Intentional walk opportunity");
  });
});

describe("getNotificationActions", () => {
  it("returns steal actions", () => {
    const actions = getNotificationActions({ kind: "steal", base: 0, successPct: 50 });
    expect(actions).toEqual([
      { action: "steal", title: "⚾ Yes, steal!" },
      { action: "skip",  title: "⏭ Skip" },
    ]);
  });

  it("returns bunt actions", () => {
    const actions = getNotificationActions({ kind: "bunt" });
    expect(actions).toEqual([
      { action: "bunt", title: "✅ Bunt!" },
      { action: "skip", title: "⏭ Skip" },
    ]);
  });

  it("returns count30 actions", () => {
    const actions = getNotificationActions({ kind: "count30" });
    expect(actions).toEqual([
      { action: "take",  title: "🤚 Take" },
      { action: "swing", title: "⚾ Swing" },
    ]);
  });

  it("returns count02 actions", () => {
    const actions = getNotificationActions({ kind: "count02" });
    expect(actions).toEqual([
      { action: "protect", title: "🛡 Protect" },
      { action: "normal",  title: "⚾ Normal" },
    ]);
  });

  it("returns ibb actions", () => {
    const actions = getNotificationActions({ kind: "ibb" });
    expect(actions).toEqual([
      { action: "ibb",  title: "✅ Yes, IBB" },
      { action: "skip", title: "⏭ Skip" },
    ]);
  });
});

describe("showManagerNotification", () => {
  beforeEach(() => {
    (Notification as unknown as { permission: NotificationPermission }).permission = "granted";
  });

  it("skips when Notification permission is not granted", () => {
    (Notification as unknown as { permission: NotificationPermission }).permission = "denied";
    const swReadySpy = vi.fn();
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: { then: swReadySpy } },
      configurable: true,
    });
    showManagerNotification({ kind: "bunt" });
    expect(swReadySpy).not.toHaveBeenCalled();
  });

  it("calls serviceWorker.ready when SW is available and permission is granted", async () => {
    (Notification as unknown as { permission: NotificationPermission }).permission = "granted";
    const showNotification = vi.fn().mockResolvedValue(undefined);
    const mockReg = { showNotification };
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve(mockReg) },
      configurable: true,
    });
    showManagerNotification({ kind: "bunt" });
    await new Promise(r => setTimeout(r, 10));
    expect(showNotification).toHaveBeenCalledWith(
      "⚾ Your turn, Manager!",
      expect.objectContaining({ body: "Sacrifice bunt opportunity", tag: "manager-decision" })
    );
  });
});

describe("closeManagerNotification", () => {
  it("calls getNotifications and closes each notification", async () => {
    const mockClose = vi.fn();
    const mockNotif = { close: mockClose };
    const getNotifications = vi.fn().mockResolvedValue([mockNotif]);
    const mockReg = { getNotifications };
    Object.defineProperty(navigator, "serviceWorker", {
      value: { ready: Promise.resolve(mockReg) },
      configurable: true,
    });
    closeManagerNotification();
    await new Promise(r => setTimeout(r, 10));
    expect(getNotifications).toHaveBeenCalledWith({ tag: "manager-decision" });
    expect(mockClose).toHaveBeenCalled();
  });
});
