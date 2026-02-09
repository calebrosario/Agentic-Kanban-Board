import notifier from 'node-notifier';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface NotificationOptions {
  title: string;
  message: string;
  sound?: boolean | string;
  icon?: string;
  timeout?: number;
  wait?: boolean;
}

export class NotificationService {
  private platform: NodeJS.Platform;

  constructor() {
    this.platform = os.platform();
  }

  /**
   * 發送桌面通知
   */
  async notify(options: NotificationOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const notificationOptions = {
          title: options.title,
          message: options.message,
          icon: options.icon || path.join(__dirname, '../../assets/icon.png'),
          sound: options.sound !== false, // 預設播放聲音
          wait: options.wait || false,
          timeout: options.timeout || 10,
          appID: 'Agentic Kanban Board' // Windows 用，會顯示在通知中心
        };

        // 使用 node-notifier 發送通知
        notifier.notify(notificationOptions, (err, response) => {
          if (err) {
            logger.error('Notification error:', err);
            // 如果 node-notifier 失敗，嘗試使用原生方法
            this.fallbackNotify(options)
              .then(() => resolve())
              .catch(e => {
                logger.error('Fallback notification also failed:', e);
                reject(e);
              });
          } else {
            logger.info('Notification sent successfully');
            resolve();
          }
        });

        // 處理點擊事件
        notifier.on('click', (notifierObject, options, event) => {
          logger.info('Notification clicked');
        });

        notifier.on('timeout', (notifierObject, options) => {
          logger.info('Notification timed out');
        });

      } catch (error) {
        logger.error('Failed to send notification:', error);
        reject(error);
      }
    });
  }

  /**
   * 後備通知方法（當 node-notifier 失敗時）
   */
  private async fallbackNotify(options: NotificationOptions): Promise<void> {
    switch (this.platform) {
      case 'darwin':
        await this.notifyMacOS(options);
        break;
      case 'win32':
        await this.notifyWindows(options);
        break;
      case 'linux':
        await this.notifyLinux(options);
        break;
      default:
        logger.warn(`Unsupported platform for notifications: ${this.platform}`);
    }
  }

  /**
   * macOS 通知
   */
  private async notifyMacOS(options: NotificationOptions): Promise<void> {
    const { title, message, sound = true } = options;
    const soundParam = sound ? 'sound name "default"' : '';
    
    const script = `display notification "${this.escapeString(message)}" with title "${this.escapeString(title)}" ${soundParam}`;
    await execAsync(`osascript -e '${script}'`);
  }

  /**
   * Windows 通知（後備方案）
   */
  private async notifyWindows(options: NotificationOptions): Promise<void> {
    const { title, message } = options;
    
    // 檢查是否在 WSL 環境
    const isWSL = await this.isWSL();
    
    if (isWSL) {
      // 在 WSL 中使用 PowerShell.exe
      await this.notifyWindowsFromWSL(options);
    } else {
      // 使用 PowerShell 的 Toast 通知
      await this.notifyWindowsNative(options);
    }
  }

  /**
   * 原生 Windows Toast 通知
   */
  private async notifyWindowsNative(options: NotificationOptions): Promise<void> {
    const { title, message, sound = true } = options;
    
    const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null

$template = @"
<toast>
  <visual>
    <binding template="ToastText02">
      <text id="1">${this.escapeXml(title)}</text>
      <text id="2">${this.escapeXml(message)}</text>
    </binding>
  </visual>
  ${sound ? '<audio src="ms-winsoundevent:Notification.Default" />' : ''}
</toast>
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Agentic Kanban Board").Show($toast)`;

    try {
      await execAsync(`powershell -ExecutionPolicy Bypass -Command "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);
    } catch (error) {
      logger.error('PowerShell notification failed:', error);
      // 最後的後備：使用 msg 命令
      await execAsync(`msg "%username%" /time:10 "${title}: ${message}"`).catch(() => {
        logger.warn('Windows msg command also failed');
      });
    }
  }

  /**
   * WSL 環境下的 Windows 通知
   */
  private async notifyWindowsFromWSL(options: NotificationOptions): Promise<void> {
    const { title, message, sound = true } = options;
    const audioElement = sound ? '<audio src="ms-winsoundevent:Notification.Default" />' : '';
    
    const template = `
<toast>
  <visual>
    <binding template="ToastText02">
      <text id="1">${this.escapeXml(title)}</text>
      <text id="2">${this.escapeXml(message)}</text>
    </binding>
  </visual>
  ${audioElement}
</toast>`;

    const script = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.UI.Notifications.ToastNotification, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$template = @"
${template}
"@

$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = New-Object Windows.UI.Notifications.ToastNotification $xml
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Agentic Kanban Board").Show($toast)`;

    const escapedScript = script.replace(/"/g, '\\"').replace(/\n/g, ' ');
    await execAsync(`powershell.exe -Command "${escapedScript}"`);
  }

  /**
   * Linux 通知
   */
  private async notifyLinux(options: NotificationOptions): Promise<void> {
    const { title, message, sound = true } = options;
    
    // 使用 notify-send
    await execAsync(`notify-send "${this.escapeString(title)}" "${this.escapeString(message)}" -i dialog-information`);
    
    // 播放聲音
    if (sound) {
      try {
        // 嘗試使用 paplay
        await execAsync('paplay /usr/share/sounds/freedesktop/stereo/complete.oga');
      } catch {
        try {
          // 後備：使用 aplay
          await execAsync('aplay /usr/share/sounds/sound-icons/glass-water-1.wav');
        } catch {
          logger.warn('No sound player available on Linux');
        }
      }
    }
  }

  /**
   * 播放聲音（如果需要自定義聲音）
   */
  async playSound(soundFile: string): Promise<void> {
    try {
      const soundPath = path.join(__dirname, '../../sounds', soundFile);
      
      // Windows：使用 PowerShell 播放聲音
      if (this.platform === 'win32') {
        await execAsync(`powershell -c "(New-Object Media.SoundPlayer '${soundPath}').PlaySync()"`);
      } else if (this.platform === 'darwin') {
        await execAsync(`afplay "${soundPath}"`);
      } else if (this.platform === 'linux') {
        await execAsync(`paplay "${soundPath}"` || `aplay "${soundPath}"`);
      }
      
    } catch (error) {
      logger.error('Failed to play sound:', error);
    }
  }

  /**
   * 檢查是否在 WSL 環境
   */
  private async isWSL(): Promise<boolean> {
    try {
      const { stdout } = await execAsync('uname -r');
      return stdout.toLowerCase().includes('microsoft');
    } catch {
      return false;
    }
  }

  /**
   * 轉義字串
   */
  private escapeString(str: string): string {
    return str.replace(/"/g, '\\"').replace(/'/g, "\\'");
  }

  /**
   * 轉義 XML
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

// 單例模式
let notificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationService) {
    notificationService = new NotificationService();
  }
  return notificationService;
}