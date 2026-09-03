import { describe, it, expect } from "vitest";
import {
  paginateBook,
  hasEnoughContentToOrder,
  MAX_BOOK_PHOTOS,
  MAX_PHOTO_PAGES,
  MIN_FILLED_PAGES_TO_ORDER,
} from "./book-pages";

const empty = {
  storyCount: 0,
  orphanPhotoCount: 0,
  milestoneCount: 0,
  hasDedication: false,
  hasTributes: false,
};

describe("paginateBook", () => {
  it("enforces the 28-page printer minimum", () => {
    expect(paginateBook(empty).declaredPages).toBe(28);
    expect(paginateBook({ ...empty, storyCount: 10 }).declaredPages).toBe(28);
  });

  it("declares a multiple of four", () => {
    for (const storyCount of [0, 7, 29, 30, 31, 100]) {
      expect(paginateBook({ ...empty, storyCount }).declaredPages % 4).toBe(0);
    }
  });

  it("treats a book with no chapter as holding one placeholder page", () => {
    expect(paginateBook(empty).chapterPages).toBe(1);
    expect(paginateBook({ ...empty, storyCount: 1 }).chapterPages).toBe(1);
  });

  it("lays photos out two to a page", () => {
    expect(paginateBook({ ...empty, orphanPhotoCount: 2 }).photoPages).toBe(1);
    expect(paginateBook({ ...empty, orphanPhotoCount: 3 }).photoPages).toBe(2);
    expect(paginateBook({ ...empty, orphanPhotoCount: 40 }).photoPages).toBe(20);
  });

  it("lays milestones out eight to a page", () => {
    expect(paginateBook({ ...empty, milestoneCount: 8 }).milestonePages).toBe(1);
    expect(paginateBook({ ...empty, milestoneCount: 9 }).milestonePages).toBe(2);
    expect(paginateBook({ ...empty, milestoneCount: 12 }).milestonePages).toBe(2);
  });

  it("caps the photo pages, so a thousand photos cannot order a hundred-page book", () => {
    const huge = paginateBook({ ...empty, orphanPhotoCount: 1000 });

    expect(huge.photoPages).toBe(MAX_PHOTO_PAGES);
    expect(huge.photosUsed).toBe(MAX_BOOK_PHOTOS);
  });

  it("fills the book the spec asks for: 3 chapters, 40 photos, 12 milestones", () => {
    // The acceptance criterion of P1-3: 28 pages, at most three of them blank.
    const page = paginateBook({ ...empty, storyCount: 3, orphanPhotoCount: 40, milestoneCount: 12 });

    expect(page.contentPages).toBe(25);
    expect(page.declaredPages).toBe(28);
    expect(page.blankPages).toBe(3);
  });

  it("keeps blank pages as tail padding only", () => {
    const page = paginateBook({ ...empty, storyCount: 40 });

    expect(page.contentPages).toBe(40);
    expect(page.declaredPages).toBe(40);
    expect(page.blankPages).toBe(0);
  });

  it("counts the dedication and the tributes as pages of their own", () => {
    const bare = paginateBook({ ...empty, storyCount: 40 });
    const full = paginateBook({ ...empty, storyCount: 40, hasDedication: true, hasTributes: true });

    expect(full.contentPages).toBe(bare.contentPages + 2);
    expect(full.declaredPages).toBe(44);
  });

  it("never declares fewer pages when content grows, which is what lets checkout price a worst case", () => {
    const base = paginateBook({ storyCount: 3, orphanPhotoCount: 10, milestoneCount: 4, hasDedication: false, hasTributes: false });
    const more = paginateBook({ storyCount: 4, orphanPhotoCount: 11, milestoneCount: 5, hasDedication: true, hasTributes: true });

    expect(more.declaredPages).toBeGreaterThanOrEqual(base.declaredPages);
    expect(more.contentPages).toBeGreaterThan(base.contentPages);
  });

  it("ignores negative counts rather than shrinking the book", () => {
    const page = paginateBook({ ...empty, orphanPhotoCount: -5, milestoneCount: -3 });

    expect(page.photoPages).toBe(0);
    expect(page.milestonePages).toBe(0);
    expect(page.declaredPages).toBe(28);
  });
});

describe("hasEnoughContentToOrder", () => {
  it("refuses a book of mostly blank paper", () => {
    // Three chapters and nothing else: 3 filled pages out of 28.
    expect(hasEnoughContentToOrder(paginateBook({ ...empty, storyCount: 3 }))).toBe(false);
  });

  it("accepts a book once its filled pages reach the threshold", () => {
    const page = paginateBook({ ...empty, storyCount: 4, orphanPhotoCount: 20 });

    expect(page.contentPages).toBe(MIN_FILLED_PAGES_TO_ORDER);
    expect(hasEnoughContentToOrder(page)).toBe(true);
  });

  it("counts photos and milestones towards the threshold, not just chapters", () => {
    // The old rule asked for seven chapters and ignored everything else.
    const page = paginateBook({ ...empty, storyCount: 2, orphanPhotoCount: 40, milestoneCount: 8 });

    expect(page.chapterPages).toBe(2);
    expect(hasEnoughContentToOrder(page)).toBe(true);
  });
});
