-- 建立任務模板資料表
CREATE TABLE IF NOT EXISTS task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label VARCHAR(100) NOT NULL,
    template TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 建立索引以提升查詢效能
CREATE INDEX idx_task_templates_sort_order ON task_templates(sort_order);
CREATE INDEX idx_task_templates_is_active ON task_templates(is_active);

-- 插入預設的 5 個模板
INSERT INTO task_templates (label, template, sort_order, is_default, is_active) VALUES
('繼續工作', '基於前一個對話的上下文，繼續進行相關工作。', 1, true, true),
('程式審查', '請審查此專案的程式碼品質、安全性和最佳實踐。請先閱讀 dev.md 和相關專案檔案。', 2, true, true),
('修復錯誤', '協助分析和修復專案中的錯誤。請先了解專案架構和現有程式碼。', 3, true, true),
('功能開發', '協助開發新功能，請先了解現有架構和設計模式。', 4, true, true),
('撰寫文件', '協助撰寫或更新專案文件，請先分析現有程式碼結構。', 5, true, true);