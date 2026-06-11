import { describe, expect, it } from "vitest";

import { getLegalDoc, legalDocs, legalDocSlugs } from "@/lib/content/legal";

describe("legal content", () => {
  it("publishes the required product-visible legal documents", () => {
    expect(legalDocs.map((doc) => doc.slug)).toEqual(legalDocSlugs);

    for (const doc of legalDocs) {
      expect(doc.title).toBeTruthy();
      expect(doc.description).toBeTruthy();
      expect(doc.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(doc.sections.length).toBeGreaterThan(0);
    }
  });

  it("covers privacy, terms, and non-medical health boundaries", () => {
    expect(getLegalDoc("privacy")?.title).toBe("隐私保护指引");
    expect(getLegalDoc("terms")?.title).toBe("用户协议");
    expect(getLegalDoc("health-disclaimer")?.title).toBe("健康免责声明");
    expect(getLegalDoc("missing")).toBeNull();
  });
});
