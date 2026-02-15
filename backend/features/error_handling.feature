Feature: 錯誤處理
  作為系統
  我需要優雅地處理各種錯誤情況
  以確保系統穩定性和良好的使用者體驗

  Background:
    Given 系統已經啟動

  Scenario Outline: API 請求驗證錯誤
    When 使用者發送缺少必要欄位的請求：<缺少欄位>
    Then API 應回傳 status code 400
    And response 應包含 error_code "VALIDATION_ERROR"
    And error_message 應包含 "<缺少欄位> is required"
    And response 應包含詳細的驗證錯誤資訊

    Examples:
      | 缺少欄位    |
      | name        |
      | workingDir  |
      | task        |

  Scenario: Claude Code 執行檔不存在
    Given Claude Code 執行檔路徑設定錯誤
    When 使用者嘗試建立新 Session
    Then API 應回傳 status code 500
    And response 應包含 error_code "CLAUDE_NOT_FOUND"
    And error_message 為 "Claude Code executable not found"

  Scenario: 工作目錄不存在
    When 使用者建立 Session 並指定不存在的工作目錄
    Then API 應回傳 status code 400
    And response 應包含 error_code "INVALID_WORKING_DIR"
    And error_message 為 "Working directory does not exist"

  Scenario: Claude Code 進程啟動失敗
    Given Claude Code 因授權問題無法啟動
    When 系統嘗試啟動 Claude Code 進程
    Then Session 錯誤狀態應更新為 "error"
    And 錯誤詳情應包含進程輸出
    And WebSocket 應推送進程錯誤通知

  Scenario: 資料庫連線錯誤
    Given 資料庫服務暫時不可用
    When 使用者查詢 Sessions
    Then API 應回傳 status code 503
    And response 應包含 error_code "DATABASE_ERROR"
    And error_message 為 "Database service temporarily unavailable"
    And 系統應該嘗試重新連線

  Scenario: WebSocket 連線失敗
    Given WebSocket 服務未啟動
    When 客戶端嘗試連接未啟動的 WebSocket 服務
    Then 連線應該被拒絕
    And 客戶端應收到適當的錯誤訊息
    And 系統應記錄連線失敗事件

  Scenario: 記憶體不足錯誤
    Given 系統可用記憶體低於 100MB
    When 使用者嘗試建立新 Session
    Then API 應回傳 status code 507
    And response 應包含 error_code "INSUFFICIENT_MEMORY"
    And error_message 為 "Insufficient memory to start new session"

  Scenario: Session 對話歷史損壞
    Given Session 的對話歷史檔案損壞
    When 使用者嘗試延續該 Session
    Then API 應回傳 status code 500
    And response 應包含 error_code "CORRUPT_HISTORY"
    And error_message 為 "Session history is corrupted"
    And 系統應提供選項讓使用者選擇是否忽略歷史記錄

  Scenario: 並發請求限制
    Given 系統設定每秒最多處理 100 個請求
    When 同一客戶端在 1 秒內發送第 101 個請求
    Then API 應回傳 status code 429
    And response 應包含 error_code "RATE_LIMIT_EXCEEDED"
    And response 應包含 Retry-After header
    And error_message 為 "Too many requests"

  Scenario: 未預期的錯誤處理
    Given 系統遇到未預期的內部錯誤
    When 錯誤發生
    Then API 應回傳 status code 500
    And response 應包含 error_code "INTERNAL_ERROR"
    And error_message 為 "An unexpected error occurred"
    And 系統應記錄完整的錯誤堆疊
    And 不應向客戶端暴露敏感資訊