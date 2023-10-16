import { app, ipcMain, BrowserWindow, shell } from 'electron';
import log from 'electron-log';
import path from 'path';
import axios from 'axios';
import SpyConfig, { ConfigProps } from './config';
import WXLiveEventListener from './listener';
import WXLiveEventHandler from './interface';
import { DecodedData, LiveInfo, LiveMessage } from '../CustomTypes';
import EventForwarder from './EventForwarder';
import SpyHttpServer from './httpserver';

class SpyService implements WXLiveEventHandler {
  private config: SpyConfig | null;

  private listener: WXLiveEventListener | null;

  private forwarder: EventForwarder | null;

  private mainWindow: BrowserWindow | null;

  private receivedSeqs: number[] = [];

  private currentStatus: LiveInfo | null;

  private httpServer: SpyHttpServer | null;

  constructor(configFilePath: string, mainWindow: BrowserWindow) {
    this.config = new SpyConfig(configFilePath);
    this.config.load();
    this.mainWindow = mainWindow;
    const userDataPath = app.getPath('userData');
    this.config.setProp('chrome_userdata_path', path.join(userDataPath, './chromeuserdata'));
    this.config.setProp('log_path', path.join(userDataPath, './logs'));
    this.listener = new WXLiveEventListener(this.config, this);
    this.forwarder = new EventForwarder(this.config);
    this.currentStatus = null;
    this.httpServer = null;
  }

  public setChromePath(chromePath: string) {
    this.config?.setProp('chrome_path', chromePath);
  }

  public onStatusUpdate(liveInfo: LiveInfo) {
    // log.info(`forward status: ${liveInfo.wechat_uin} to ${this.config?.getProp('forward_url')}`);
    this.currentStatus = liveInfo;
    this.mainWindow?.webContents.send('wxlive-status', liveInfo);
  }

  public onEvent(liveMessage: LiveMessage) {
    log.debug(`get event: ${liveMessage.seq} ${liveMessage.decoded_type} ${liveMessage.content}`);
    // 根据seq去重
    if (this.receivedSeqs.indexOf(liveMessage.seq) >= 0) {
      log.debug(`ignore duplicated event: ${liveMessage.seq}`);
      return;
    }
    log.debug(`show event ${liveMessage.seq}`);
    this.mainWindow?.webContents.send('wxlive-event', liveMessage);
    this.receivedSeqs.push(liveMessage.seq);
  }

  public onEvents(decodedData: DecodedData) {
    // TODO 这里可能会发送重复的数据，服务器要自己根据seq去重。
    this.forwarder
      ?.forwardData(decodedData)
      .then((response: any) => {
        log.info(`forward response: ${JSON.stringify(response)}`);
        return response;
      })
      .catch((error: any) => {
        log.error(`forward error: ${error}`);
        // TODO should retry when error occurs.
      });
    decodedData.events.forEach((o) => {
      this.onEvent(o);
    });
  }

  public stop(): void {
    log.info('stop spy service');
    this.httpServer?.stop();
    this.listener = null;
    this.forwarder = null;
    this.mainWindow = null;
    this.config = null;
  }

  public start(): void {
    log.info('start spy service');
    log.debug(`debug mode: ${this.config?.getProp('debug')}`);
    log.debug(`forward url: ${this.config?.getProp('forward_url')}`);
    log.debug(`gzip forward data: ${this.config?.getProp('gzip_forward_data')}`);
    log.debug(`local chrome path: ${this.config?.getProp('chrome_path')}`);

    ipcMain.on('electron-baidu-tongji-message', (event, arg) => {
      log.info(`get baidu tongji message: ${arg}`);
      const config = {
        headers: {
          Referer: 'https://hm.baidu.com/',
        },
      };
      axios
        .get(`https://hm.baidu.com/hm.js?${arg}`, config)
        .then((res) => {
          log.debug(res.status);
          log.debug(`get baidu tongji response: ${res.data.slice(0, 20)}`);
          let { data } = res;
          data = data.replace(/document.location.href/g, '"https://wxlivespy.fire4nt.com/app.html"');
          data = data.replace(/document.location.protocol/g, '"https:"');
          if (this.mainWindow?.webContents) {
            log.debug(`send baidu tongji response: ${data.slice(0, 20)}}`);
            this.mainWindow?.webContents.send('electron-baidu-tongji-reply', data);
          } else {
            log.error('no main window');
          }
          return res;
        })
        .catch((err) => {
          log.error(err);
        });
    });

    ipcMain.on('ipc-example', async (event, arg) => {
      const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
      log.debug(msgTemplate(arg));
      event.reply('ipc-example', msgTemplate('pong'));
      this.startListener();
    });
    ipcMain.handle('wxlive-get-config', (event, arg) => {
      return this.config?.getProp(arg as keyof ConfigProps);
    });
    ipcMain.handle('wxlive-get-forward-url', () => {
      return this.config?.getProp('forward_url');
    });
    ipcMain.handle('wxlive-open-external-link', (event, link) => {
      shell.openExternal(link);
    });
    ipcMain.on('wxlive-set-all-config', (event, arg) => {
      log.debug(`set config: ${JSON.stringify(arg)}`);
      // iterate over all properties of ConfigProps
      // and set them one by one
      Object.keys(arg).forEach((key) => {
        this.config?.setProp(key as keyof ConfigProps, arg[key]);
      });
      // this.config.setProp('forward_url', arg.forwardURL);
      this.config?.save();
      event.reply('wxlive-set-all-config', 'ok');
    });
    ipcMain.on('wxlive-set-config', (event, arg) => {
      log.debug(`set config: ${JSON.stringify(arg)}`);
      // iterate over all properties of ConfigProps
      // and set them one by one
      Object.keys(arg).forEach((key) => {
        log.debug(`set config: ${key} = ${arg[key]}`);
        this.config?.setProp(key as keyof ConfigProps, arg[key]);
      });
      this.config?.save();
      event.reply('wxlive-set-config', 'ok');
    });
    this.httpServer = new SpyHttpServer(21201, () => this.currentStatus);
    this.httpServer.start();

    ipcMain.on('undefined-function', () => {
      // eslint-disable-next-line no-undef
      undefinedFunction();
    });
  }

  private startListener(): void {
    this.listener?.start();
  }
}

export default SpyService;
