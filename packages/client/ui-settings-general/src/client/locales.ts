/** Shell chrome and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
} satisfies Record<SettingsKey, string>

export const nl = {
  'general.title': 'Algemeen',
  'enterBehavior.title': 'Enter-toets gedrag bij drukte',
  'enterBehavior.desc': 'Alleen van kracht tijdens agent-uitvoering; Cmd/Ctrl+Enter activeert de andere optie',
  'enterBehavior.queue': 'In wachtrij plaatsen',
  'enterBehavior.steer': 'Direct sturen',
} satisfies Record<GeneralSettingsKey, string>
