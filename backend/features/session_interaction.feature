Feature: Session 互動
  作為使用者
  我想要與運行中的 Claude Code session 進行互動
  以便能夠即時對話並獲得回應

  Background:
    Given 系統已經啟動
    And 存在一個閒置狀態的 Session

  Scenario: 發送訊息到 Session
    When 使用者發送訊息 "請分析 src 目錄下的檔案結構"
    Then API 應回傳 status code 200
    And response 應包含 messageId
    And response 應包含 timestamp
    And Session 狀態應更新為 "processing"
    And 舊的錯誤訊息應被清除
    And 訊息應該被傳送到 Claude Code 進程
    And WebSocket 應推送狀態更新為 "processing"

  Scenario: 接收 Claude Code 回應
    Given Session 正在處理使用者的訊息
    When Claude Code 產生回應內容
    Then 系統應該捕獲輸出內容
    And WebSocket 應推送回應內容給客戶端
    And 回應應包含以下資訊：
      | sessionId | messageId | content | timestamp | type |

  Scenario: 處理 Claude Code 的串流回應
    Given Session 正在處理複雜任務
    When Claude Code 持續輸出內容
    Then 系統應該即時捕獲每個輸出片段
    And WebSocket 應推送每個片段給客戶端
    And 客戶端應能即時看到回應進度

  Scenario Outline: 發送訊息到非活動的 Session
    Given 存在一個 Session
    And Session 狀態為 "<狀態>"
    When 使用者發送訊息 "請分析程式碼"
    Then API 應回傳 status code 400
    And response 應包含 error_code "SESSION_NOT_ACTIVE"
    And error_message 為 "Session is not active"
    
    Examples:
      | 狀態        |
      | completed   |
      | error       |
      | processing  |
      | interrupted |

  Scenario: 取得 Session 的對話歷史
    Given Session 已經有 5 筆對話記錄
    When 使用者查詢對話歷史
    Then API 應回傳 status code 200
    And response 應包含 5 筆對話記錄
    And 每筆記錄應包含：
      | messageId | role | content | timestamp |
    And 對話記錄應按時間順序排列

  Scenario: 分頁查詢對話歷史
    Given Session 已經有 50 筆對話記錄
    When 使用者查詢對話歷史，參數如下：
      | page | 2 |
      | limit | 20 |
    Then API 應回傳 status code 200
    And response 應包含 20 筆對話記錄
    And response 應包含分頁資訊：
      | total | 50 |
      | page | 2 |
      | totalPages | 3 |

  Scenario: 中斷 Session 的執行
    Given 存在一個 Session
    And Session 狀態為 "processing"
    And Session 正在執行長時間任務
    When 使用者發送中斷指令
    Then API 應回傳 status code 200
    And Claude Code 進程應收到中斷信號並被終止
    And Session 狀態應更新為 "idle"
    And 舊的錯誤訊息應被清除
    And 系統應儲存中斷訊息 "⚠️ 執行已被使用者中斷"
    And WebSocket 應推送狀態更新為 "idle"

  Scenario: 中斷後繼續使用 Session
    Given 存在一個 Session
    And Session 狀態為 "idle"
    And Session 剛被中斷
    When 使用者發送訊息 "請繼續剛才的任務"
    Then API 應回傳 status code 200
    And response 應包含 messageId
    And Session 狀態應更新為 "processing"
    And 訊息應該被傳送到新的 Claude Code 進程
    And WebSocket 應推送狀態更新為 "processing"

  Scenario: Claude Code 執行完成後清除錯誤訊息
    Given 存在一個 Session
    And Session 狀態為 "idle"
    And Session 有錯誤訊息
    When 使用者發送訊息 "請執行新任務"
    And Claude Code 成功執行完成
    Then Session 狀態應回到 "idle"
    And 錯誤訊息應被清除
    And WebSocket 應推送狀態更新為 "idle"

  Scenario: 嘗試中斷未在處理的 Session
    Given 存在一個 Session
    And Session 狀態為 "idle"
    When 使用者發送中斷指令
    Then API 應回傳 status code 400
    And response 應包含 error_code "INVALID_STATUS"
    And error_message 為 "Session is not processing"