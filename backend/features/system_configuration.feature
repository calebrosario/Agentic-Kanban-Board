Feature: 系統配置管理
  作為系統管理者
  我需要配置系統參數
  以便控制系統行為和資源使用

  Background:
    Given 系統已經啟動

  Scenario: 取得系統配置
    When 管理者查詢系統配置
    Then API 應回傳 status code 200
    And response 應包含以下配置項：
      | claudeCodePath | Claude Code 執行檔路徑 |
      | maxConcurrentSessions | 最大並發 Sessions 數 |
      | sessionTimeout | Session 超時時間 |
      | maxMemoryPerSession | 單 Session 最大記憶體 |
      | logLevel | 日誌級別 |

  Scenario: 更新系統配置
    When 管理者更新系統配置：
      | maxConcurrentSessions | 20 |
      | sessionTimeout | 7200 |
    Then API 應回傳 status code 200
    And 新配置應該立即生效
    And 系統應該記錄配置變更

  Scenario: 驗證 Claude Code 執行檔
    When 管理者設定 Claude Code 路徑為 "/usr/local/bin/claude"
    Then 系統應該驗證該路徑的執行檔是否存在
    And 驗證執行檔是否有執行權限
    And 測試執行檔是否能正常啟動
    And 如果驗證失敗則拒絕配置更新

  Scenario: 取得系統狀態
    When 管理者查詢系統狀態
    Then API 應回傳 status code 200
    And response 應包含：
      | totalSessions | 總 Session 數 |
      | activeSessions | 活躍 Session 數 |
      | systemUptime | 系統運行時間 |
      | memoryUsage | 記憶體使用情況 |
      | cpuUsage | CPU 使用率 |

  Scenario: 取得系統健康報告
    When 管理者請求健康檢查
    Then API 應回傳 status code 200
    And response 應包含各組件狀態：
      | component | status | details |
      | api | healthy | API 服務正常 |
      | websocket | healthy | WebSocket 服務正常 |
      | processManager | healthy | 進程管理正常 |
      | storage | healthy | 儲存服務正常 |

  Scenario: 清理過期資源
    Given 系統中有 10 個超過 7 天的已完成 Sessions
    When 管理者執行資源清理
    Then API 應回傳 status code 200
    And 系統應該刪除過期的 Sessions
    And 清理相關的對話記錄和暫存檔
    And response 應包含清理統計：
      | deletedSessions | 10 |
      | freedSpace | 儲存空間大小 |

  Scenario: 匯出系統日誌
    When 管理者請求匯出最近 24 小時的日誌
    Then API 應回傳 status code 200
    And response 應包含日誌下載連結
    And 日誌應包含所有級別的系統事件
    And 日誌格式應為 JSON Lines