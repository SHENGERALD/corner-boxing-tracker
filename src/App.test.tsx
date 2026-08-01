import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("Boxing Tracker", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("renders the isolated quick log preview from its query parameter", () => {
    window.history.replaceState({}, "", "/?preview=quick-log");
    render(<App />);

    expect(screen.getByRole("heading", { name: "快速記錄原型" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "今天" })).not.toBeInTheDocument();
  });

  it("records boxing in one tap and copies the previous strength set", async () => {
    window.history.replaceState({}, "", "/?preview=quick-log");
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "完成 影子拳擊" }));
    expect(screen.getByText("已完成")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "新增一組 深蹲" }));
    expect(screen.getByLabelText("第2組重量")).toHaveValue(60);
    expect(screen.getByLabelText("第2組次數")).toHaveValue(8);
  });

  it("reveals inline quantity and notes from a compact More control", async () => {
    window.history.replaceState({}, "", "/?preview=quick-log");
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "更多" })[0]);
    const quantity = screen.getByLabelText("影子拳擊數量");
    expect(quantity).toHaveValue(3);
    await user.clear(quantity);
    await user.type(quantity, "4");
    expect(screen.getByText("4 回合")).toBeInTheDocument();
    expect(screen.getByLabelText("影子拳擊備註")).toBeInTheDocument();
  });

  it("closes the optional details sheet with Escape, backdrop, and close button", async () => {
    window.history.replaceState({}, "", "/?preview=quick-log");
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "查看細節" }));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "訓練細節" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看細節" }));
    await user.click(screen.getByRole("button", { name: "關閉" }));
    expect(screen.queryByRole("dialog", { name: "訓練細節" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "查看細節" }));
    await user.click(screen.getByTestId("details-backdrop"));
    expect(screen.queryByRole("dialog", { name: "訓練細節" })).not.toBeInTheDocument();
  });

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
  it("reorders Today session progress items by drag and persists the order", () => {
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    const first = screen.getByText("一對一教練課").closest("summary");
    const second = screen.getByText("影子拳擊").closest("summary");
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    const dataTransfer = { effectAllowed: "", setData: () => undefined, getData: () => "coach-class" };
    fireEvent.dragStart(first!, { dataTransfer });
    fireEvent.drop(second!, { dataTransfer });
    const titles = Array.from(document.querySelectorAll(".training-entry .item-copy strong"), (node) => node.textContent);
    expect(titles.slice(0, 2)).toEqual(["影子拳擊", "一對一教練課"]);
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
    await user.click(screen.getByLabelText("第1組時間"));
    expect(screen.getByRole("dialog").closest("label")).toBeNull();
    expect(screen.getByLabelText("第1組時間 分鐘")).not.toHaveAttribute("size");
    await user.selectOptions(screen.getByLabelText("第1組時間 分鐘"), "1");
    await user.selectOptions(screen.getByLabelText("第1組時間 秒數"), "30");
    await user.click(screen.getByRole("button", { name: "確認時間" }));
    await user.click(screen.getByRole("button", { name: "完成第1組" }));

    first.unmount();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    await user.click(screen.getByText("一對一教練課"));

    expect(screen.getByLabelText("第1組重量")).toHaveValue(70);
    expect(screen.getByLabelText("第1組重量單位")).toHaveValue("lb");
    expect(screen.getByLabelText("第1組次數")).toHaveValue(12);
    await user.click(screen.getByLabelText("第1組時間"));
    expect(screen.getByLabelText("第1組時間 分鐘")).toHaveValue("1");
    expect(screen.getByLabelText("第1組時間 秒數")).toHaveValue("30");
  });

  it("keeps completed set progress in sync with calendar history", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByText("一對一教練課"));
    await user.click(screen.getByRole("button", { name: "新增一對一教練課一組" }));
    await user.click(screen.getByRole("button", { name: "完成第1組" }));
    expect(screen.getByRole("heading", { name: "1 / 4" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /一對一教練課/ })).toBeChecked();

    await user.click(screen.getByRole("button", { name: "歷史" }));
    expect(screen.getByText("1/4")).toBeInTheDocument();
  });

  it("starts the persistent boxing timer from the mobile timer control", async () => {
    const user = userEvent.setup();
    const first = render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "拳擊回合計時器" }));
    expect(screen.getByRole("dialog", { name: "拳擊回合計時器" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "開始計時" }));
    expect(screen.getByRole("button", { name: "暫停" })).toBeInTheDocument();

    first.unmount();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);
    await user.click(screen.getByRole("button", { name: "拳擊回合計時器" }));
    expect(screen.getByRole("button", { name: "暫停" })).toBeInTheDocument();
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

  it("switches history to the statistics dashboard", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "歷史" }));
    await user.click(screen.getByRole("button", { name: "統計" }));

    expect(screen.getByRole("heading", { name: "訓練一致性" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "每週訓練負荷" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "動作進度" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "疲勞趨勢" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "月" }));
    expect(screen.getByRole("heading", { name: "每月訓練負荷" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "年" }));
    expect(screen.getByRole("heading", { name: "年度訓練負荷" })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "歷史" })[0]);
    expect(screen.getByText("月曆歷史")).toBeInTheDocument();
  });

  it("adds an ad-hoc drill on a full rest day", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 29, 12)} />);

    expect(screen.getByRole("heading", { name: "完全休息", level: 1 })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "今天想動一下" }));
    await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
    await user.click(screen.getByRole("button", { name: "加入 刺拳" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));

    expect(screen.getByText("刺拳")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "0 / 1" })).toBeInTheDocument();
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

  it("shows favorited drills in the favorites category and removes them when unhearted", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
    await user.click(screen.getByRole("button", { name: "收藏 刺拳" }));

    const favoriteCategories = screen.getAllByRole("button", { name: "收藏" });
    expect(favoriteCategories).toHaveLength(2);
    await user.click(favoriteCategories[1]);
    expect(screen.getByRole("heading", { name: "刺拳" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "收藏 刺拳" }));
    expect(screen.queryByRole("heading", { name: "刺拳" })).not.toBeInTheDocument();
  });

  it("reorders an added drill with planned drills and restores the order", async () => {
    const user = userEvent.setup();
    const first = render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
    await user.click(screen.getByRole("button", { name: "加入 刺拳" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));

    const jab = screen.getByText("刺拳").closest("summary");
    const shadow = screen.getByText("影子拳擊").closest("summary");
    expect(jab).not.toBeNull();
    expect(shadow).not.toBeNull();
    let draggedId = "";
    const dataTransfer = {
      effectAllowed: "",
      setData: (_type: string, value: string) => { draggedId = value; },
      getData: () => draggedId,
    };
    fireEvent.dragStart(jab!, { dataTransfer });
    fireEvent.drop(shadow!, { dataTransfer });

    expect(Array.from(document.querySelectorAll(".training-entry .item-copy strong"), (node) => node.textContent))
      .toEqual(["一對一教練課", "刺拳", "影子拳擊", "沙包技術", "核心與收操"]);

    first.unmount();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    expect(Array.from(document.querySelectorAll(".training-entry .item-copy strong"), (node) => node.textContent))
      .toEqual(["一對一教練課", "刺拳", "影子拳擊", "沙包技術", "核心與收操"]);
  });
  it("switches to the strength database and adds a strength drill", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.click(screen.getByRole("button", { name: "重訓" }));
    expect(screen.getByText("重訓資料庫")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "啞鈴臥推" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "手臂" })[0]);
    expect(screen.getByRole("heading", { name: "槓鈴彎舉" })).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "全部" })[0]);
    await user.click(screen.getByRole("button", { name: "加入 槓鈴臥推" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));

    expect(screen.getByText("槓鈴臥推")).toBeInTheDocument();
  });

  it("filters strength drills by equipment and shows the cardio category", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.click(screen.getByRole("button", { name: "重訓" }));
    await user.click(screen.getByRole("button", { name: "啞鈴" }));
    expect(screen.getByRole("heading", { name: "啞鈴臥推" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "槓鈴臥推" })).not.toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "有氧" })[0]);
    expect(screen.getByRole("heading", { name: "跑步" })).toBeInTheDocument();
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

  it("removes a planned drill from today's training progress", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "移除 一對一教練課" }));

    expect(screen.queryByRole("checkbox", { name: /一對一教練課/ })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "0 / 3" })).toBeInTheDocument();
  });

  it("removes an added drill from the training progress", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "動作庫" }));
    await user.type(screen.getByPlaceholderText("搜尋動作"), "jab");
    await user.click(screen.getByRole("button", { name: "加入 刺拳" }));
    await user.click(screen.getByRole("button", { name: "加入訓練" }));
    await user.click(screen.getByRole("button", { name: "移除 刺拳" }));

    expect(screen.queryByRole("button", { name: "移除 刺拳" })).not.toBeInTheDocument();
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

  it("edits the weekly schedule and updates the matching day", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "課表" }));
    const title = screen.getByLabelText("中文課程名稱");
    await user.clear(title);
    await user.type(title, "週四技術日");
    await user.click(screen.getByRole("button", { name: "今天" }));

    expect(screen.getByRole("heading", { name: "週四技術日", level: 1 })).toBeInTheDocument();
  });

  it("keeps a recorded day on its original schedule snapshot", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("checkbox", { name: /一對一教練課/ }));
    await user.click(screen.getByRole("button", { name: "課表" }));
    const title = screen.getByLabelText("中文課程名稱");
    await user.clear(title);
    await user.type(title, "新版週四課表");
    await user.click(screen.getByRole("button", { name: "歷史" }));

    expect(screen.getByLabelText("選取日期紀錄")).toHaveTextContent("教練課＋自主訓練");
    expect(screen.getByLabelText("選取日期紀錄")).not.toHaveTextContent("新版週四課表");
  });

  it("shows boxing load instead of zero kilograms for a boxing-only session", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("checkbox", { name: /一對一教練課/ }));
    await user.click(screen.getByRole("button", { name: "歷史" }));
    await user.click(screen.getByRole("button", { name: "統計" }));

    const overview = document.querySelector(".stats-overview");
    expect(overview).toHaveTextContent("拳擊負荷");
    expect(overview).not.toHaveTextContent("0kg");
  });

  it("localizes schedule editor field labels in English", async () => {
    const user = userEvent.setup();
    render(<App initialDate={new Date(2026, 6, 30, 12)} />);

    await user.click(screen.getByRole("button", { name: "備份" }));
    await user.click(screen.getByRole("button", { name: "English" }));
    await user.click(screen.getByRole("button", { name: "Schedule" }));

    expect(screen.getByLabelText("Chinese session name")).toBeInTheDocument();
    expect(screen.getByLabelText("Chinese training focus")).toBeInTheDocument();
  });

});
