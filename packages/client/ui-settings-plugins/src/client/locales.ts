/** Locale bundles for the plugin configuration section and its plugin cards. */

/** Locale keys these surfaces render. */
export type PluginsSettingsLocaleKey =
  | 'nav' | 'title' | 'intro' | 'tabs' | 'configurableTab' | 'empty'
  | 'overridden' | 'reset' | 'readOnly' | 'expand' | 'collapse'
  | 'save' | 'saving' | 'discard' | 'unsaved' | 'saveFailed' | 'invalidNumber'
  | 'bashTitle' | 'bashDescription' | 'bashTimeoutMs' | 'bashTimeoutMsHint'
  | 'bashMaxOutputBytes' | 'bashMaxOutputBytesHint'
  | 'agentLoopTitle' | 'agentLoopDescription' | 'agentLoopMaxParallel' | 'agentLoopMaxParallelHint'
  | 'webSearchTitle' | 'webSearchDescription'
  | 'webSearchApiKey' | 'webSearchApiKeyHint' | 'webSearchApiKeySet' | 'webSearchApiKeyUnset'
  | 'webSearchBaseUrl' | 'webSearchBaseUrlHint' | 'webSearchMaxUses' | 'webSearchMaxUsesHint'

/** English copy. */
export const en: Record<PluginsSettingsLocaleKey, string> = {
  nav: 'Plugins',
  title: 'Plugins',
  intro: 'Configure and inspect the plugins installed in this deployment.',
  tabs: 'Plugin views',
  configurableTab: 'Plugin configuration',
  empty: 'This deployment exposes no plugin settings.',
  overridden: 'Overridden',
  reset: 'Reset to default',
  readOnly: 'This deployment stores settings read-only.',
  expand: 'Show settings',
  collapse: 'Hide settings',
  save: 'Save',
  saving: 'Saving…',
  discard: 'Discard',
  unsaved: 'Unsaved',
  saveFailed: 'The deployment did not accept these values; they were left for you to correct.',
  invalidNumber: 'Enter a number, or leave blank to use the default.',
  bashTitle: 'Shell',
  bashDescription: 'Limits every command the agent runs.',
  bashTimeoutMs: 'Command timeout (ms)',
  bashTimeoutMsHint: 'How long one command may run before it is terminated.',
  bashMaxOutputBytes: 'Output cap per stream (bytes)',
  bashMaxOutputBytesHint: 'Output beyond this spills to a temporary file rather than being lost.',
  agentLoopTitle: 'Agent loop',
  agentLoopDescription: 'How the agent dispatches tool calls.',
  agentLoopMaxParallel: 'Parallel tool calls',
  agentLoopMaxParallelHint: 'Upper bound on parallel-safe calls running at once within one step.',
  webSearchTitle: 'Web search',
  webSearchDescription: 'The DeepSeek search provider.',
  webSearchApiKey: 'API key',
  webSearchApiKeyHint: 'Stored outside the settings file. Leave blank to keep the current key.',
  webSearchApiKeySet: 'A key is configured.',
  webSearchApiKeyUnset: 'No key is configured; search is unavailable until one is.',
  webSearchBaseUrl: 'Endpoint',
  webSearchBaseUrlHint: 'Leave blank to use the provider default.',
  webSearchMaxUses: 'Max searches per request',
  webSearchMaxUsesHint: 'How many times one request may search before it must answer.',
}

/** Simplified Chinese copy. */

/** Dutch copy. */
export const nl: Record<PluginsSettingsLocaleKey, string> = {
  nav: 'Plug-ins',
  title: 'Plug-ins',
  intro: 'Configureer en inspecteer de plug-ins die in deze omgeving zijn geïnstalleerd.',
  tabs: 'Plug-inweergaven',
  configurableTab: 'Plug-inconfiguratie',
  empty: 'Deze omgeving biedt geen instellingen voor plug-ins.',
  overridden: 'Aangepast',
  reset: 'Standaard herstellen',
  readOnly: 'Deze omgeving slaat instellingen alleen-lezen op.',
  expand: 'Instellingen tonen',
  collapse: 'Instellingen verbergen',
  save: 'Opslaan',
  saving: 'Opslaan…',
  discard: 'Wijzigingen verwerpen',
  unsaved: 'Niet opgeslagen',
  saveFailed: 'De omgeving accepteerde deze waarden niet; u kunt ze corrigeren.',
  invalidNumber: 'Voer een getal in of laat leeg om de standaardwaarde te gebruiken.',
  bashTitle: 'Shell',
  bashDescription: 'Beperkingen voor elke opdracht die de agent uitvoert.',
  bashTimeoutMs: 'Opdracht-time-out (ms)',
  bashTimeoutMsHint: 'Hoe lang één opdracht mag draaien voordat deze wordt beëindigd.',
  bashMaxOutputBytes: 'Maximale uitvoer per stream (bytes)',
  bashMaxOutputBytesHint: 'Uitvoer die dit overschrijdt, wordt opgeslagen in een tijdelijk bestand in plaats van verloren te gaan.',
  agentLoopTitle: 'Agent-loop',
  agentLoopDescription: 'Hoe de agent tool-aanroepen verdeelt.',
  agentLoopMaxParallel: 'Parallelle tool-aanroepen',
  agentLoopMaxParallelHint: 'Bovengrens voor veilige parallelle aanroepen binnen één stap.',
  webSearchTitle: 'Webzoekfunctie',
  webSearchDescription: 'De DeepSeek zoekaanbieder.',
  webSearchApiKey: 'API-sleutel',
  webSearchApiKeyHint: 'Opgeslagen buiten het configuratiebestand. Laat leeg om de huidige sleutel te behouden.',
  webSearchApiKeySet: 'Een sleutel is geconfigureerd.',
  webSearchApiKeyUnset: 'Geen sleutel geconfigureerd; zoekfunctie is niet beschikbaar totdat deze is ingesteld.',
  webSearchBaseUrl: 'Eindpunt',
  webSearchBaseUrlHint: 'Laat leeg om de standaardwaarde van de aanbieder te gebruiken.',
  webSearchMaxUses: 'Max. zoekopdrachten per verzoek',
  webSearchMaxUsesHint: 'Hoe vaak één verzoek mag zoeken voordat het moet antwoorden.',
}

/** Simplified Chinese copy. */
export const zh: Record<PluginsSettingsLocaleKey, string> = {
  nav: '插件',
  title: '插件',
  intro: '配置和查看本部署已安装的插件。',
  tabs: '插件视图',
  configurableTab: '插件配置',
  empty: '本部署没有开放任何插件设置。',
  overridden: '已覆盖',
  reset: '恢复默认',
  readOnly: '本部署的设置为只读。',
  expand: '展开设置',
  collapse: '收起设置',
  save: '保存',
  saving: '保存中…',
  discard: '放弃修改',
  unsaved: '未保存',
  saveFailed: '本部署没有接受这些值，已保留供你修改。',
  invalidNumber: '请填数字；留空表示使用默认值。',
  bashTitle: '终端',
  bashDescription: '限制 agent 运行的每一条命令。',
  bashTimeoutMs: '命令超时（毫秒）',
  bashTimeoutMsHint: '单条命令允许运行多久，超时即终止。',
  bashMaxOutputBytes: '单流输出上限（字节）',
  bashMaxOutputBytesHint: '超出部分会转存到临时文件，而不是被丢弃。',
  agentLoopTitle: 'Agent 循环',
  agentLoopDescription: 'Agent 如何派发工具调用。',
  agentLoopMaxParallel: '并行工具调用数',
  agentLoopMaxParallelHint: '同一步内最多同时运行多少个可并行的调用。',
  webSearchTitle: '网页搜索',
  webSearchDescription: 'DeepSeek 搜索提供方。',
  webSearchApiKey: 'API Key',
  webSearchApiKeyHint: '不写入设置文件。留空表示保持当前密钥。',
  webSearchApiKeySet: '已配置密钥。',
  webSearchApiKeyUnset: '未配置密钥；配置之前搜索不可用。',
  webSearchBaseUrl: '接口地址',
  webSearchBaseUrlHint: '留空则使用提供方默认地址。',
  webSearchMaxUses: '单次请求最多搜索次数',
  webSearchMaxUsesHint: '一次请求在必须作答前最多可以搜索多少次。',
}
