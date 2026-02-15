Feature: WebSocket 即時通訊
  作為前端應用
  我需要透過 WebSocket 接收即時更新
  以便即時顯示 Session 狀態和對話內容

  Background:
    Given WebSocket 服務已啟動
    And 客戶端已建立 WebSocket 連線

  Scenario: 客戶端連線認證
    When 客戶端嘗試建立 WebSocket 連線
    Then 系統應該驗證連線請求
    And 為通過驗證的客戶端建立連線
    And 發送連線成功訊息：
      | type | "connection" |
      | status | "connected" |
      | clientId | 唯一識別碼 |

  Scenario: 訂閱特定 Session 的更新
    Given 客戶端已成功連線
    When 客戶端訂閱 Session "session-123" 的更新
    Then 系統應該記錄該訂閱關係
    And 發送訂閱確認訊息：
      | type | "subscription" |
      | sessionId | "session-123" |
      | status | "subscribed" |

  Scenario Outline: 推送 Session 狀態變更
    Given 客戶端已訂閱 Session "session-123"
    When Session 狀態從 "<舊狀態>" 變更為 "<新狀態>"
    Then WebSocket 應推送狀態更新：
      | type | "status_update" |
      | sessionId | "session-123" |
      | oldStatus | "<舊狀態>" |
      | newStatus | "<新狀態>" |
      | timestamp | 時間戳記 |

    Examples:
      | 舊狀態      | 新狀態      |
      | idle        | processing  |
      | processing  | idle        |
      | processing  | error       |
      | idle        | completed   |

  Scenario: 推送對話訊息
    Given 客戶端已訂閱 Session "session-123"
    When Claude Code 產生新的回應內容
    Then WebSocket 應推送訊息更新：
      | type | "message" |
      | sessionId | "session-123" |
      | role | "assistant" |
      | content | 回應內容 |
      | timestamp | 時間戳記 |

  Scenario: 推送串流回應片段
    Given 客戶端已訂閱 Session "session-123"
    When Claude Code 正在產生串流回應
    Then WebSocket 應推送每個內容片段：
      | type | "stream_chunk" |
      | sessionId | "session-123" |
      | chunk | 內容片段 |
      | index | 片段序號 |

  Scenario: 廣播系統事件
    When 系統資源使用率超過 80%
    Then WebSocket 應向所有連線的客戶端廣播：
      | type | "system_alert" |
      | level | "warning" |
      | message | "System resource usage high" |
      | metrics | 資源使用詳情 |

  Scenario Outline: 處理客戶端斷線
    Given 客戶端已訂閱多個 Sessions
    When 客戶端因 <斷線原因> 斷線
    Then 系統應該清理該客戶端的所有訂閱
    And 記錄斷線事件
    And <處理方式>

    Examples:
      | 斷線原因    | 處理方式                           |
      | 異常斷線    | 保留訂閱資訊 30 秒                  |
      | 正常斷開    | 立即清除所有訂閱資訊              |

  Scenario: 客戶端重連機制
    Given 客戶端因網路問題斷線
    When 客戶端在 30 秒內重新連線
    Then 系統應該識別該客戶端
    And 自動恢復之前的訂閱關係
    And 推送斷線期間的遺漏更新

  Scenario: 取消訂閱
    Given 客戶端已訂閱 Session "session-123"
    When 客戶端取消訂閱該 Session
    Then 系統應該移除訂閱關係
    And 發送取消訂閱確認：
      | type | "subscription" |
      | sessionId | "session-123" |
      | status | "unsubscribed" |

  Scenario: WebSocket 心跳檢測
    Given 客戶端已連線超過 30 秒
    When 系統發送心跳檢測
    Then 客戶端應該在 5 秒內回應
    And 如果客戶端未回應則標記為失去連線
    And 在確認斷線前重試 3 次