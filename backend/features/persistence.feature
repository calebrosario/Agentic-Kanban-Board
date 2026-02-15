Feature: 資料持久化
  作為系統
  我需要持久化儲存 Session 和對話資料
  以便系統重啟後能夠恢復狀態

  Background:
    Given 系統已經啟動
    And 資料庫連線正常

  Scenario: 儲存新 Session
    When 建立新的 Session
    Then Session 資訊應該儲存到資料庫
    And 儲存的資料應包含：
      | sessionId | 唯一識別碼 |
      | name | Session 名稱 |
      | workingDir | 工作目錄 |
      | task | 任務描述 |
      | status | 狀態 |
      | createdAt | 建立時間 |
      | processId | 進程 ID |

  Scenario: 更新 Session 狀態
    Given 存在一個 Session
    And Session 狀態為 "processing"
    When Session 狀態變更為 "idle"
    Then 資料庫中的狀態應該同步更新
    And updatedAt 欄位應該更新為當前時間
    And 應該記錄狀態變更歷史

  Scenario Outline: 儲存不同角色的對話訊息
    Given 存在一個 Session
    And Session 狀態為 "idle"
    When <角色>發送訊息 "<訊息內容>"
    Then 訊息應該儲存到資料庫
    And 儲存的訊息應包含：
      | messageId | 訊息識別碼 |
      | sessionId | 所屬 Session |
      | role | "<角色>" |
      | content | "<訊息內容>" |
      | timestamp | 時間戳記 |

    Examples:
      | 角色      | 訊息內容                  |
      | user      | 請分析這個程式碼          |
      | assistant | 我將為您分析這個程式碼    |

  Scenario: 處理大型訊息內容
    Given Claude Code 產生超過 1MB 的回應
    When 系統儲存該訊息
    Then 訊息內容應該被壓縮儲存
    And 資料庫應記錄內容已壓縮
    And 讀取時應自動解壓縮

  Scenario: Session 軟刪除
    Given 存在一個 Session
    And Session 狀態為 "completed"
    When 使用者刪除該 Session
    Then Session 不應從資料庫物理刪除
    And 應該設定 deletedAt 時間戳記
    And 查詢時預設不顯示已刪除的 Sessions

  Scenario: 定期備份
    Given 系統設定每 6 小時自動備份
    When 備份時間到達
    Then 系統應該建立資料庫備份
    And 備份應包含所有 Sessions 和對話記錄
    And 保留最近 7 天的備份
    And 自動清理超過 7 天的舊備份

  Scenario: 資料庫遷移
    Given 資料庫 schema 需要更新
    When 系統啟動時偵測到新的遷移檔案
    Then 系統應該自動執行資料庫遷移
    And 保持向後相容性
    And 記錄遷移執行結果

  Scenario: 對話歷史分頁載入
    Given Session 有超過 1000 筆對話記錄
    When 載入對話歷史
    Then 系統應該分批載入資料
    And 優先載入最近的對話
    And 支援無限滾動載入更多歷史

  Scenario: 資料完整性檢查
    When 系統執行每日維護任務
    Then 應該檢查資料完整性：
      | 檢查項目 | 說明 |
      | 孤立訊息 | 沒有對應 Session 的訊息 |
      | 狀態不一致 | Session 狀態與進程狀態不符 |
      | 損壞的資料 | 無法解析的 JSON 內容 |
    And 自動修復可修復的問題
    And 記錄無法修復的問題

  Scenario Outline: 匯出不同格式的 Session 資料
    Given 存在一個 Session
    And Session 有對話歷史記錄
    When 使用者選擇匯出格式為 "<格式>"
    Then 系統應該生成 <格式> 格式的檔案
    And 檔案應包含完整對話內容
    And 檔案應包含所有相關的中繼資料

    Examples:
      | 格式     |
      | JSON     |
      | Markdown |
      | CSV      |