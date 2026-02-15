Feature: 安全性控制
  作為系統
  我需要實施安全措施
  以保護系統和使用者資料的安全

  Background:
    Given 系統已經啟動
    And 安全模組已載入

  Scenario: API 認證
    When 客戶端發送未包含認證 token 的請求
    Then API 應回傳 status code 401
    And response 應包含 error_code "UNAUTHORIZED"
    And error_message 為 "Authentication required"

  Scenario: Token 驗證
    Given 客戶端有一個有效的 JWT token
    When 客戶端使用該 token 發送請求
    Then 系統應該驗證 token 的有效性
    And 檢查 token 是否過期
    And 驗證 token 簽名
    And 允許通過驗證的請求繼續處理

  Scenario: 工作目錄存取限制
    Given 系統設定了允許存取的目錄清單
    When 使用者嘗試在限制目錄外建立 Session
    Then API 應回傳 status code 403
    And response 應包含 error_code "FORBIDDEN_PATH"
    And error_message 為 "Access to this directory is not allowed"

  Scenario: 命令注入防護
    When 使用者在 task 中包含系統命令字元如 ";" 或 "|"
    Then 系統應該適當地轉義這些字元
    And 不應執行任何系統命令
    And 正常傳遞給 Claude Code 處理

  Scenario: XSS 防護
    When 使用者發送包含 script 標籤的訊息
    Then 系統應該對內容進行消毒處理
    And 移除或轉義危險的 HTML 標籤
    And 安全地儲存和顯示內容

  Scenario: 檔案上傳限制
    When 使用者嘗試上傳檔案
    Then 系統應該檢查檔案類型
    And 限制檔案大小不超過 10MB
    And 掃描檔案內容是否包含惡意程式碼
    And 只允許白名單中的檔案類型

  Scenario: Session 隔離
    Given 有多個使用者的 Sessions 在運行
    When 使用者 A 嘗試存取使用者 B 的 Session
    Then API 應回傳 status code 403
    And response 應包含 error_code "ACCESS_DENIED"
    And error_message 為 "You don't have permission to access this session"

  Scenario: 敏感資訊保護
    When Claude Code 輸出包含敏感資訊如 API 金鑰
    Then 系統應該偵測並遮蔽敏感內容
    And 在儲存前將敏感資訊替換為 [REDACTED]
    And 記錄敏感資訊洩漏嘗試

  Scenario: 稽核日誌
    When 發生安全相關事件
    Then 系統應該記錄詳細的稽核日誌：
      | 事件類型 | 時間戳記 | 使用者 | IP 位址 | 詳細資訊 |
    And 稽核日誌應該防篡改
    And 保留至少 90 天

  Scenario: DDoS 防護
    Given 系統偵測到來自同一 IP 的大量請求
    When 請求率超過每分鐘 1000 次
    Then 系統應該暫時封鎖該 IP
    And 記錄攻擊事件
    And 通知系統管理員

  Scenario: 安全標頭設定
    When API 回應任何請求
    Then response 應包含安全標頭：
      | X-Content-Type-Options | nosniff |
      | X-Frame-Options | DENY |
      | X-XSS-Protection | 1; mode=block |
      | Strict-Transport-Security | max-age=31536000 |
      | Content-Security-Policy | 適當的 CSP 政策 |