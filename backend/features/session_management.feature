Feature: Session 管理
  作為系統管理者
  我想要管理多個 Claude Code sessions
  以便同時執行多個任務並監控其狀態

  Background:
    Given 系統已經啟動
    And Claude Code 可執行檔存在

  Scenario: 建立新的 Session
    When 使用者建立新 Session，設定如下：
      | 欄位          | 值                        |
      | name          | 測試專案分析             |
      | workingDir    | /path/to/project         |
      | continueChat  | false                    |
      | task          | 分析專案結構並產生報告    |
    Then API 應回傳 status code 201
    And response 應包含 sessionId
    And response 應包含 status "processing"
    And 系統應該啟動一個新的 Claude Code 進程

  Scenario: 列出所有 Sessions
    Given 系統中有 3 個不同狀態的 Sessions
    When 使用者查詢所有 Sessions
    Then API 應回傳 status code 200
    And response 應包含 3 個 Sessions
    And 每個 Session 應包含以下資訊：
      | sessionId | name | status | workingDir | createdAt |

  Scenario: 查詢不同狀態的 Session 資訊
    Given 存在一個 Session
    And Session 狀態為 "<狀態>"
    When 使用者查詢該 Session 的詳細資訊
    Then API 應回傳 status code 200
    And response 應包含 sessionId
    And response 應包含 status "<狀態>"
    And response 應包含 name
    And response 應包含 workingDir
    And response 應包含 task
    And response 應包含 createdAt
    And response 應包含 updatedAt

    Examples:
      | 狀態        |
      | processing  |
      | idle        |
      | completed   |
      | error       |

  Scenario: 查詢不存在的 Session
    Given Session "non-existent-id" 不存在
    When 使用者查詢該 Session 的詳細資訊
    Then API 應回傳 status code 404
    And response 應包含 error_code "SESSION_NOT_FOUND"
    And error_message 為 "Session not found"

  Scenario Outline: 標記不同狀態的 Session 為完成
    Given 存在一個 Session
    And Session 狀態為 "<初始狀態>"
    When 使用者標記該 Session 為完成
    Then API 應回傳 status code 200
    And response 應包含 status "completed"
    And response 應包含 completedAt
    And 錯誤訊息應被清除
    And 系統應該終止該 Session 的 Claude Code 進程
    
    Examples:
      | 初始狀態 |
      | idle     |
      | error    |

  Scenario: 嘗試標記處理中的 Session 為完成
    Given 存在一個 Session
    And Session 狀態為 "processing"
    When 使用者標記該 Session 為完成
    Then API 應回傳 status code 400
    And response 應包含 error_code "INVALID_STATUS"
    And error_message 為 "Session must be idle or in error state to complete"

  Scenario: 刪除已完成的 Session
    Given 存在一個 Session
    And Session 狀態為 "completed"
    When 使用者刪除該 Session
    Then API 應回傳 status code 204
    And 該 Session 應從系統中移除
    And 相關的對話記錄應被清理

  Scenario: 嘗試刪除處理中的 Session
    Given 存在一個 Session
    And Session 狀態為 "processing"
    When 使用者刪除該 Session
    Then API 應回傳 status code 400
    And response 應包含 error_code "SESSION_STILL_PROCESSING"
    And error_message 為 "Cannot delete a session that is currently processing"

  Scenario: 延續上次對話建立 Session
    Given 存在一個 Session "previous-session"
    And Session 狀態為 "completed"
    And Session 有對話歷史記錄
    When 使用者建立新 Session，設定如下：
      | 欄位          | 值                        |
      | name          | 延續上次任務             |
      | workingDir    | /path/to/project         |
      | continueChat  | true                     |
      | previousSessionId | previous-session     |
      | task          | 繼續優化程式碼           |
    Then API 應回傳 status code 201
    And response 應包含 sessionId
    And 新 Session 應該載入上次的對話歷史
    And Claude Code 進程應使用 -c 參數啟動

  Scenario: 建立 Session 並跳過危險權限檢查
    When 使用者建立新 Session，設定如下：
      | 欄位                        | 值                        |
      | name                        | 跳過權限檢查的測試專案      |
      | workingDir                  | /path/to/project         |
      | continueChat                | false                    |
      | task                        | 測試跳過權限檢查功能       |
      | dangerouslySkipPermissions  | true                     |
    Then API 應回傳 status code 201
    And response 應包含 sessionId
    And response 應包含 dangerouslySkipPermissions "true"
    And Claude Code 進程應使用 --dangerously-skip-permissions 參數啟動

  Scenario: 刪除不存在的 Session
    When 使用者嘗試刪除一個不存在的 Session
    Then API 應回傳 status code 404
    And response 應包含 error_code "SESSION_NOT_FOUND"
    And error_message 為 "Session not found"

  Scenario: 重新排序 Sessions
    Given 系統中有 5 個狀態為 "idle" 的 Sessions
    When 使用者重新排序這些 Sessions：
      | status     | idle                                    |
      | sessionIds | ["session-3","session-1","session-4","session-2","session-5"] |
    Then API 應回傳 status code 200
    And response 應包含 success 為 true
    And Sessions 的順序應該被更新為新的排序

  Scenario Outline: 重新排序不同狀態的 Sessions
    Given 系統中有 3 個狀態為 "<狀態>" 的 Sessions
    When 使用者重新排序這些 Sessions：
      | status     | <狀態>                          |
      | sessionIds | ["session-2","session-3","session-1"] |
    Then API 應回傳 status code 200
    And response 應包含 success 為 true

    Examples:
      | 狀態       |
      | idle       |
      | processing |
      | completed  |
      | error      |

  Scenario: 重新排序缺少必要參數
    When 使用者發送重新排序請求但缺少 status 參數：
      | sessionIds | ["session-1","session-2"] |
    Then API 應回傳 status code 400
    And response 應包含 error_code "INVALID_REQUEST"
    And error_message 為 "Status and sessionIds array are required"

  Scenario: 重新排序的 sessionIds 不是陣列
    When 使用者發送重新排序請求但 sessionIds 不是陣列：
      | status     | idle       |
      | sessionIds | "not-array" |
    Then API 應回傳 status code 400
    And response 應包含 error_code "INVALID_REQUEST"
    And error_message 為 "Status and sessionIds array are required"