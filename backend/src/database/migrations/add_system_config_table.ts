import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 建立 system_config 表
  await knex.schema.createTable('system_config', (table) => {
    table.string('key', 255).primary();
    table.text('value');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // 插入預設的 Claude agents 路徑設定
  await knex('system_config').insert({
    key: 'claude_agents_path',
    value: null // 預設為空，需要使用者自行設定
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('system_config');
}