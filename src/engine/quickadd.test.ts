import { describe, expect, it } from "vitest";
import { parseQuickAdd } from "./quickadd";

const T = "2026-09-30"; // Thứ Tư

describe("thêm nhanh 1 dòng", () => {
  it("hiểu thời lượng, thứ và ưu tiên", () => {
    const r = parseQuickAdd("Ôn thi Vĩ mô 2h thứ 6 !", T);
    expect(r.title).toBe("Ôn thi Vĩ mô");
    expect(r.estimate).toBe(120);
    expect(r.deadlineDate).toBe("2026-10-02");
    expect(r.priority).toBe("high");
  });
  it("hiểu 'mai lúc 17h' và phút", () => {
    const r = parseQuickAdd("Nộp bài 30p mai lúc 17h", T);
    expect(r).toMatchObject({ title: "Nộp bài", estimate: 30, deadlineDate: "2026-10-01", deadlineTime: "17:00" });
  });
  it("hiểu 1h30, hôm nay, 23:00, gấp", () => {
    const r = parseQuickAdd("Viết báo cáo 1h30 hôm nay 23:00 gấp", T);
    expect(r).toMatchObject({ title: "Viết báo cáo", estimate: 90, deadlineDate: T, deadlineTime: "23:00", priority: "high" });
  });
  it("hiểu ngày dd/mm và 'tuần sau', CN", () => {
    expect(parseQuickAdd("Thuyết trình 5/10", T).deadlineDate).toBe("2026-10-05");
    expect(parseQuickAdd("Đọc sách tuần sau", T).deadlineDate).toBe("2026-10-07");
    expect(parseQuickAdd("Dọn phòng CN", T).deadlineDate).toBe("2026-10-04");
    expect(parseQuickAdd("Họp nhóm thứ 4", T).deadlineDate).toBe(T); // hôm nay là thứ 4
  });
  it("không đoán bừa khi không có thông tin", () => {
    const r = parseQuickAdd("Mua quà sinh nhật", T);
    expect(r).toMatchObject({ title: "Mua quà sinh nhật", chips: [] });
    expect(r.estimate).toBeUndefined();
    expect(r.deadlineDate).toBeUndefined();
  });
  it("không nhầm số trong tên task", () => {
    const r = parseQuickAdd("Làm bài tập chương 3", T);
    expect(r.title).toBe("Làm bài tập chương 3");
  });
});

describe("tên người không bị hiểu nhầm", () => {
  it("'chị Mai' không phải ngày mai", () => {
    const r = parseQuickAdd("Gặp chị Mai bàn đồ án", T);
    expect(r.deadlineDate).toBeUndefined();
    expect(r.title).toBe("Gặp chị Mai bàn đồ án");
  });
});
