Feature: Claude Code 進程管理
  作為系統
  我需要管理 Claude Code 進程的生命週期
  以確保資源有效利用和系統穩定性

  Background:
    Given 進程管理系統已啟動
    And Claude Code 執行檔路徑已設定

  Scenario: 啟動 Claude Code 進程
    When 系統需要為新 Session 啟動進程
    Then 系統應該使用正確的參數啟動 Claude Code
    And 進程應該成功啟動
    And 系統應該記錄進程 PID
    And 系統應該建立 stdin/stdout/stderr 管道

  Scenario: 監控進程健康狀態
    Given 有 3 個運行中的 Claude Code 進程
    When 系統執行健康檢查
    Then 系統應該檢查每個進程的狀態
    And 記錄每個進程的資源使用情況：
      | PID | CPU使用率 | 記憶體使用 | 運行時間 |
    And 偵測到無回應的進程

  Scenario: 處理進程異常終止
    Given 一個運行中的 Claude Code 進程
    When 進程意外終止
    Then 系統應該偵測到進程結束
    And 更新對應 Session 狀態為 "error"
    And 記錄錯誤訊息和退出碼
    And WebSocket 應推送錯誤通知

  Scenario: 優雅地終止進程
    Given 一個運行中的 Claude Code 進程
    When 系統需要終止該進程
    Then 系統應該先發送 SIGTERM 信號
    And 等待最多 10 秒讓進程優雅退出
    And 如果進程仍在運行則發送 SIGKILL
    And 清理相關資源

  Scenario: 進程資源限制
    Given 系統設定的資源限制如下：
      | 最大進程數 | 10 |
      | 單進程最大記憶體 | 2GB |
      | 單進程最大執行時間 | 2小時 |
    When 第 11 個 Session 嘗試啟動
    Then API 應回傳 status code 503
    And response 應包含 error_code "RESOURCE_LIMIT_EXCEEDED"
    And error_message 為 "Maximum number of concurrent sessions reached"

  Scenario: 進程超時處理
    Given 一個運行中的進程已執行 2 小時
    When 系統執行超時檢查
    Then 系統應該標記該進程為超時
    And 發送警告通知給使用者
    And 如果使用者未回應則在 10 分鐘後終止進程

  Scenario: 進程輸出緩衝管理
    Given Claude Code 進程正在產生大量輸出
    When 輸出緩衝區接近滿載
    Then 系統應該將部分內容寫入暫存檔
    And 保持最近的輸出在記憶體中
    And 確保不會因緩衝區滿而阻塞進程

  Scenario: 系統重啟後恢復進程狀態
    Given 系統意外重啟前有 5 個運行中的 Sessions
    When 系統重新啟動
    Then 系統應該從持久化儲存載入 Session 資訊
    And 將所有未完成的 Sessions 標記為 "crashed"
    And 允許使用者選擇是否恢復這些 Sessions