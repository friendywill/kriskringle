import { afterEach, describe, expect, it, vi } from "vitest";
import type { Couple } from "../types/couples";
import type { HistoryEntry } from "../types/history";
import {
	loadCouples,
	loadHistory,
	loadParticipants,
	STORAGE_KEYS,
	saveCouples,
	saveHistory,
	saveParticipants,
} from "./storage";

const HISTORY: HistoryEntry[] = [
	{ year: 2025, giver: "Alice", receiver: "Bob" },
	{ year: 2025, giver: "Bob", receiver: "Alice" },
];

const originalLocalStorage = Object.getOwnPropertyDescriptor(
	globalThis,
	"localStorage",
);

/** Makes merely touching `localStorage` throw, as blocked site data does. */
function blockLocalStorage(): void {
	Object.defineProperty(globalThis, "localStorage", {
		configurable: true,
		get() {
			throw new DOMException("Access is denied", "SecurityError");
		},
	});
}

afterEach(() => {
	if (originalLocalStorage) {
		Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
	}
});

describe("storage keys", () => {
	it("are namespaced and versioned", () => {
		for (const key of Object.values(STORAGE_KEYS)) {
			expect(key).toMatch(/^kk:v\d+:/);
		}
	});
});

describe("history", () => {
	it("round-trips through real localStorage", () => {
		expect(saveHistory(HISTORY)).toBe(true);

		expect(loadHistory()).toEqual(HISTORY);
		expect(localStorage.getItem(STORAGE_KEYS.history)).toBe(
			JSON.stringify(HISTORY),
		);
	});

	it("returns an empty history when nothing is stored", () => {
		expect(loadHistory()).toEqual([]);
	});

	it("returns an empty history for malformed JSON", () => {
		localStorage.setItem(STORAGE_KEYS.history, "{not json");

		expect(loadHistory()).toEqual([]);
	});

	it.each([
		["a non-array", { year: 2025 }],
		["a missing field", [{ year: 2025, giver: "Alice" }]],
		["a year stored as text", [{ year: "2025", giver: "A", receiver: "B" }]],
		["an out-of-range year", [{ year: 25, giver: "A", receiver: "B" }]],
		["a blank name", [{ year: 2025, giver: " ", receiver: "B" }]],
		["null", null],
	])("returns an empty history for %s", (_, stored) => {
		localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(stored));

		expect(loadHistory()).toEqual([]);
	});

	it("does not modify a bad stored value when reading it", () => {
		localStorage.setItem(STORAGE_KEYS.history, "{not json");

		loadHistory();

		expect(localStorage.getItem(STORAGE_KEYS.history)).toBe("{not json");
	});

	it("returns an empty history when localStorage throws", () => {
		blockLocalStorage();

		expect(loadHistory()).toEqual([]);
	});

	it("reports failure instead of throwing when localStorage throws", () => {
		const logged = vi.spyOn(console, "error").mockImplementation(() => {});
		blockLocalStorage();

		expect(saveHistory(HISTORY)).toBe(false);
		expect(logged).toHaveBeenCalledOnce();
	});

	it("reports failure when the quota is exceeded", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new DOMException("Quota exceeded", "QuotaExceededError");
		});

		expect(saveHistory(HISTORY)).toBe(false);
		expect(loadHistory()).toEqual([]);
	});

	it("refuses to write data that fails validation", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		const invalid = [{ year: 2025, giver: "", receiver: "Bob" }];

		expect(saveHistory(invalid)).toBe(false);
		expect(localStorage.getItem(STORAGE_KEYS.history)).toBeNull();
	});
});

describe("participants", () => {
	it("round-trips through real localStorage", () => {
		expect(saveParticipants(["Alice", "Bob"])).toBe(true);

		expect(loadParticipants()).toEqual(["Alice", "Bob"]);
	});

	it("returns nobody when nothing is stored", () => {
		expect(loadParticipants()).toEqual([]);
	});

	it("returns nobody for malformed JSON", () => {
		localStorage.setItem(STORAGE_KEYS.participants, "][");

		expect(loadParticipants()).toEqual([]);
	});

	it.each([
		["a non-array", "Alice"],
		["non-text names", ["Alice", 7]],
		["a blank name", ["Alice", ""]],
	])("returns nobody for %s", (_, stored) => {
		localStorage.setItem(STORAGE_KEYS.participants, JSON.stringify(stored));

		expect(loadParticipants()).toEqual([]);
	});

	it("returns nobody when localStorage throws", () => {
		blockLocalStorage();

		expect(loadParticipants()).toEqual([]);
	});

	it("reports failure instead of throwing when localStorage throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		blockLocalStorage();

		expect(saveParticipants(["Alice"])).toBe(false);
	});

	it("keeps history and participants under separate keys", () => {
		saveParticipants(["Alice"]);
		saveHistory(HISTORY);

		expect(loadParticipants()).toEqual(["Alice"]);
		expect(loadHistory()).toEqual(HISTORY);
	});
});

describe("couples", () => {
	const COUPLES: Couple[] = [
		["Alice", "Bob"],
		["Carol", "Dan"],
	];

	it("round-trips through real localStorage", () => {
		expect(saveCouples(COUPLES)).toBe(true);

		expect(loadCouples()).toEqual(COUPLES);
		expect(localStorage.getItem(STORAGE_KEYS.couples)).toBe(
			JSON.stringify(COUPLES),
		);
	});

	it("returns no couples when nothing is stored", () => {
		expect(loadCouples()).toEqual([]);
	});

	it("returns no couples for malformed JSON", () => {
		localStorage.setItem(STORAGE_KEYS.couples, "[[");

		expect(loadCouples()).toEqual([]);
	});

	it.each([
		["a non-array", { first: "Alice", second: "Bob" }],
		["a couple of one", [["Alice"]]],
		["a couple of three", [["Alice", "Bob", "Carol"]]],
		["a blank partner", [["Alice", " "]]],
		["non-text partners", [["Alice", 7]]],
	])("returns no couples for %s", (_, stored) => {
		localStorage.setItem(STORAGE_KEYS.couples, JSON.stringify(stored));

		expect(loadCouples()).toEqual([]);
	});

	it("returns no couples when localStorage throws", () => {
		blockLocalStorage();

		expect(loadCouples()).toEqual([]);
	});

	it("reports failure instead of throwing when localStorage throws", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		blockLocalStorage();

		expect(saveCouples(COUPLES)).toBe(false);
	});
});
