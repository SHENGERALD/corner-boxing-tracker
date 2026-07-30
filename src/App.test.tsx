import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("Boxing Tracker", () => {
  beforeEach(() => localStorage.clear());

  it("saves checked items and notes, then restores them after remount", async () => {
    const user = userEvent.setup();
    const first = render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    const coachClass = screen.getByRole("checkbox", { name: /一對一教練課/ });
    await user.click(coachClass);
    await user.type(screen.getByLabelText("技術筆記"), "刺拳後立刻回防");

    first.unmount();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    expect(screen.getByRole("checkbox", { name: /一對一教練課/ })).toBeChecked();
    expect(screen.getByLabelText("技術筆記")).toHaveValue("刺拳後立刻回防");
  });


  it("logs expandable sets for a training item and restores them", async () => {
    const user = userEvent.setup();
    const first = render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByText("一對一教練課"));
    await user.click(screen.getByRole("button", { name: "新增一對一教練課一組" }));
    await user.type(screen.getByLabelText("第1組重量"), "70");
    await user.selectOptions(screen.getByLabelText("第1組重量單位"), "lb");
    await user.clear(screen.getByLabelText("第1組次數"));
    await user.type(screen.getByLabelText("第1組次數"), "12");
    await user.selectOptions(screen.getByLabelText("第1組分鐘"), "1");
    await user.selectOptions(screen.getByLabelText("第1組秒數"), "30");
    await user.click(screen.getByRole("button", { name: "完成第1組" }));

    first.unmount();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    await user.click(screen.getByText("一對一教練課"));

    expect(screen.getByLabelText("第1組重量")).toHaveValue(70);
    expect(screen.getByLabelText("第1組重量單位")).toHaveValue("lb");
    expect(screen.getByLabelText("第1組次數")).toHaveValue(12);
    expect(screen.getByLabelText("第1組分鐘")).toHaveValue("1");
    expect(screen.getByLabelText("第1組秒數")).toHaveValue("30");
  });

  it("switches interface and plan labels to English", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "備份" }));
    await user.click(screen.getByRole("button", { name: "English" }));

    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Your data stays on this device.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(screen.getByText("Coaching + Self Training")).toBeInTheDocument();
  });

  it("shows a month calendar history and opens a selected day", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "歷史" }));

    expect(screen.getByRole("heading", { name: "7月" })).toBeInTheDocument();
    expect(screen.getByText("2026")).toBeInTheDocument();
    expect(screen.getByText("月曆歷史")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /7月 27日/ }));

    expect(screen.getByText("低強度技術")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /跳繩/ })).toBeInTheDocument();
  });

  it("searches the boxing database and adds a drill to today", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    await user.click(screen.getByRole("button", { name: "動作庫" }));
    expect(screen.getByText("拳擊資料庫")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "進攻" })[0]);
    await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
    await user.click(screen.getByRole("button", { name: "加入 刺拳" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));

    expect(screen.getByText("刺拳")).toBeInTheDocument();
  });
  it("switches to the strength database and adds a strength drill", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.click(screen.getByRole("button", { name: "重訓" }));
    expect(screen.getByText("重訓資料庫")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "加入 槓鈴臥推" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));

    expect(screen.getByText("槓鈴臥推")).toBeInTheDocument();
  });

  it("adds a custom action to the boxing library", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.click(screen.getByRole("button", { name: "新增動作" }));
    await user.type(screen.getByLabelText("動作名稱"), "雙刺拳接側移");
    await user.selectOptions(screen.getByLabelText("分類"), "footwork");
    await user.click(screen.getByRole("button", { name: "儲存動作" }));

    expect(screen.getByRole("heading", { name: "雙刺拳接側移" })).toBeInTheDocument();
  });

  it("removes an added drill from the training progress", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
    await user.click(screen.getByRole("button", { name: "加入 刺拳" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));
    await user.click(screen.getByRole("button", { name: "取消 刺拳" }));

    expect(screen.queryByRole("button", { name: "取消 刺拳" })).not.toBeInTheDocument();
  });

  it("cancels a saved day from the calendar detail", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("checkbox", { name: /一對一教練課/ }));
    await user.click(screen.getByRole("button", { name: "歷史" }));
    expect(screen.getByLabelText("選取日期紀錄")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消紀錄" }));

    expect(screen.queryByLabelText("選取日期紀錄")).not.toBeInTheDocument();
    confirmSpy.mockRestore();
  });

});
