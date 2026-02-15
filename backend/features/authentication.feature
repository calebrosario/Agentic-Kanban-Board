Feature: 使用者認證
  作為系統管理者
  我需要登入和認證功能
  以確保只有授權的使用者可以操作系統

  Background:
    Given 系統已經啟動

  Scenario: 成功登入
    When 使用者使用正確的帳號密碼登入：
      | username | admin    |
      | password | admin123 |
    Then API 應回傳 status code 200
    And response 應包含 success 為 true
    And response 應包含 token
    And response 應包含 expiresIn
    And response 應包含 message "登入成功"

  Scenario Outline: 登入失敗的各種情況
    When 使用者嘗試登入：
      | username | <帳號> |
      | password | <密碼> |
    Then API 應回傳 status code 401
    And response 應包含 success 為 false
    And response 應包含 message "帳號或密碼錯誤"

    Examples:
      | 帳號       | 密碼       |
      | wrong_user | admin123   |
      | admin      | wrong_pass |
      | wrong_user | wrong_pass |
      |            | admin123   |
      | admin      |            |

  Scenario: 驗證有效的 token
    Given 使用者已經成功登入並獲得 token
    When 使用者使用該 token 驗證身份
    Then API 應回傳 status code 200
    And response 應包含 success 為 true
    And response 應包含 message "Token 有效"
    And response 應包含 decoded 資訊

  Scenario: 驗證無效的 token
    When 使用者使用無效的 token 驗證身份
    Then API 應回傳 status code 401
    And response 應包含 success 為 false
    And response 應包含 message "Token 無效或已過期"

  Scenario: 未提供 token 進行驗證
    When 使用者在沒有 token 的情況下嘗試驗證身份
    Then API 應回傳 status code 401
    And response 應包含 success 為 false
    And response 應包含 message "未提供 token"

  Scenario: 使用認證中間件保護 API
    Given 使用者有一個有效的 token
    When 使用者攜帶 token 存取受保護的 API
    Then 請求應該被允許通過
    And 使用者資訊應該被附加到請求物件

  Scenario: 認證中間件拒絕無效請求
    When 使用者在沒有 token 的情況下存取受保護的 API
    Then API 應回傳 status code 401
    And response 應包含 success 為 false
    And response 應包含 message "未提供認證 token"

  Scenario: 認證中間件處理過期 token
    Given 使用者有一個已過期的 token
    When 使用者攜帶過期 token 存取受保護的 API
    Then API 應回傳 status code 401
    And response 應包含 success 為 false
    And response 應包含 message "Token 已過期，請重新登入"