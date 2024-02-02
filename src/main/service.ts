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
import IDCache from './idcache';
import WXDataDecoder from './WXDataDecoder';

class SpyService implements WXLiveEventHandler {
  private config: SpyConfig | null;

  private listener: WXLiveEventListener | null;

  private forwarder: EventForwarder | null;

  private mainWindow: BrowserWindow | null;

  private receivedSeqs: number[] = [];

  private currentStatus: LiveInfo | null;

  private httpServer: SpyHttpServer | null;

  private idCache: IDCache;

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
    this.idCache = new IDCache();
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
    const dataWithDecodedOpenID = this.decodeOpenIDInEvents(decodedData);

    this.forwarder
      ?.forwardData(dataWithDecodedOpenID)
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

  private decodeOpenIDInEvents(decodedData: DecodedData): DecodedData {
    const data = {} as DecodedData;
    data.host_info = decodedData.host_info;
    data.live_info = decodedData.live_info;
    data.live_info.nickname = this.idCache.get('auth', 'nickname') ?? 'unknown';
    data.live_info.head_url = this.idCache.get('auth', 'avatar') ?? '';
    data.events = [];
    // 这里对于解析出来的events，需要进一步做数据解析，写入 decoded_openid
    decodedData.events.forEach((o) => {
      log.debug(`get event: ${o.seq} ${o.decoded_type} ${o.content}`);
      if (o.decoded_type === 'enter' || o.decoded_type === 'comment') {
        // 对于 enter 和 comment，需要解析出 _o9h openid，并缓存下来。
        const decodedOpenID = WXDataDecoder.getOpenIDFromMsgId(o.msg_id);
        if (decodedOpenID === null) {
          log.error(`getOpenIDFromMsgId failed, msg_id: ${o.msg_id}`);
          return;
        }
        o.decoded_openid = decodedOpenID;

        const savedOpenID = this.idCache.get(decodedData.live_info.live_id, o.sec_openid);
        if (savedOpenID === null) {
          // 把 decodedData.live_info.live_id , o.sec_openid, o.decoded_openid 数据缓存下来。
          this.idCache.set(decodedData.live_info.live_id, o.sec_openid, o.decoded_openid);
        } else if (savedOpenID !== o.decoded_openid) {
          // 如果缓存已经存在，要不要对比，如果不一致，要不要报警？
          log.warn(`sec_openid ${o.sec_openid} has two decoded_openid: ${savedOpenID} and ${o.decoded_openid}`);
          return;
        }
        data.events.push(o);
      } else if (o.decoded_type === 'gift' || o.decoded_type === 'combogift') {
        const decodedOpenID = this.idCache.get(decodedData.live_info.live_id, o.sec_openid);
        if (decodedOpenID === null) {
          // TODO 如果用户上来就发礼物，这里会找不到对应的 decodedOpenID，要怎么处理？
          log.warn(`getOpenIDFromMsgId failed, msg_id: ${o.msg_id}`);
          return;
        }
        o.decoded_openid = decodedOpenID;

        const hexID = WXDataDecoder.getSecOpenIDFromMsgId(o.msg_id);
        if (hexID === null) {
          log.error(`getHexIDFromMsgId failed, msg_id: ${o.msg_id}`);
          return;
        }

        const savedOpenID = this.idCache.get(decodedData.live_info.live_id, hexID);
        if (savedOpenID === null) {
          this.idCache.set(decodedData.live_info.live_id, hexID, o.decoded_openid);
        } else if (savedOpenID !== o.decoded_openid) {
          log.warn(`hexid ${hexID} has two decoded_openid: ${savedOpenID} and ${o.decoded_openid}`);
          return;
        }
        data.events.push(o);
      } else {
        const decodedOpenID = this.idCache.get(decodedData.live_info.live_id, o.sec_openid);
        if (decodedOpenID !== null) {
          o.decoded_openid = decodedOpenID;
          data.events.push(o);
          return;
        }
        // 根据 sec_openid 找不到 decoded_openid，那么根据 msg_id 找一下。
        const hexID = WXDataDecoder.getSecOpenIDFromMsgId(o.msg_id);
        if (hexID === null) {
          log.error(`getHexIDFromMsgId failed, msg_id: ${o.msg_id}`);
          return;
        }
        const savedOpenID = this.idCache.get(decodedData.live_info.live_id, hexID);
        if (savedOpenID === null) {
          log.warn(`getOpenIDFromMsgId failed, msg_id: ${o.msg_id}`);
          return;
        }
        o.decoded_openid = savedOpenID;
        data.events.push(o);
      }
    });
    return data;
  }
}

export default SpyService;
