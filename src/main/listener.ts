// import SpyService from './service';
import log from 'electron-log';
import puppeteer, { HTTPResponse } from 'puppeteer';
import SpyConfig from './config';
import WXLiveEventHandler from './interface';
import WXDataDecoder from './WXDataDecoder';

class WXLiveEventListener {
  private config: SpyConfig;

  private eventHandler: WXLiveEventHandler;

  constructor(config: SpyConfig, handler: WXLiveEventHandler) {
    this.config = config;
    this.eventHandler = handler;
  }

  private static getContentType(response: HTTPResponse): string {
    const contentType = response.headers()['content-type'];
    if (!contentType) {
      return '';
    }
    // remove charset
    return contentType.replace(/;.*$/, '');
  }

  private static skipContentType(response: HTTPResponse): boolean {
    const contentType = this.getContentType(response);
    if (contentType === '') {
      log.warn(`no content type for url:${response.url()}`);
      return true;
    }
    if (contentType.indexOf('video') >= 0 || contentType.indexOf('image') >= 0 || contentType.indexOf('audio') >= 0) {
      return true;
    }
    const excludeList = [
      'text/css',
      'application/javascript',
      'application/x-javascript',
      'text/html',
      'text/javascript',
      'application/font-woff',
      'font/ttf',
      'text/plain',
    ];
    if (excludeList.indexOf(contentType) >= 0) {
      return true;
    }
    return false;
  }

  private static skipURL(response: HTTPResponse): boolean {
    const url = response.url();
    if (!response.url().includes('mmfinderassistant-bin/live/msg')) {
      // TODO 目前的实现，只处理 live/msg 开头的请求，其他请求不处理。
      // 后续的if分支并没有实际意义。
      return true;
    }
    if (url.includes('mmfinderassistant-bin/helper/hepler_merlin_mmdata')) {
      return true;
    }
    if (url.includes('mmfinderassistant-bin/live/finder_live_get_promote_info_list')) {
      return true;
    }
    if (url.includes('mmfinderassistant-bin/live/get_live_info')) {
      // TODO 参考 sample/live_get_live_info_20230920_124943663.log
      // 这里面有直播间的收入信息，可能需要上报。
      return true;
    }
    return false;
  }

  private static skip(response: HTTPResponse): boolean {
    return this.skipContentType(response) || this.skipURL(response);
  }

  private async handleResponse(response: HTTPResponse) {
    if (WXLiveEventListener.skip(response)) {
      return;
    }
    // log.debug(`handle response: ${response.url()}`);
    // log.debug(`forward url: ${this.config.getProp('forward_url')}`);
    const responseData = await response.json();
    const requestHeaders = response.request().headers();
    const requestText = response.request().postData();
    if (requestText === undefined) {
      log.warn('request text is undefined');
      return;
    }
    const requestData = JSON.parse(requestText);
    const decodedData = WXDataDecoder.decodeDataFromResponse(requestHeaders, requestData, responseData);
    this.eventHandler.onStatusUpdate(decodedData.live_info);
    if (decodedData.events.length > 0) {
      this.eventHandler.onEvents(decodedData);
    }
  }

  public async start() {
    log.info(`start listener on ${this.config.getProp('spy_url')}`);

    const windowSize = '--window-size=1024,1024';

    const options = {
      defaultViewport: null,
      headless: false,
      args: ['--disable-setuid-sandbox', windowSize, '--hide-crash-restore-bubble', '--disable-gpu'],
      executablePath: this.config.getProp('chrome_path'),
      ignoreHTTPSErrors: true,
      userDataDir: this.config.getProp('chrome_userdata_path'),
    };

    const browser = await puppeteer.launch(options);
    const page = await browser.newPage();
    browser.on('disconnected', () => {
      log.info('disconnected');
    });
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      request.continue();
    });

    page.on('response', (response) => {
      this.handleResponse(response);
    });
    await page.goto(this.config.getProp('spy_url'), { waitUntil: 'networkidle2' });
  }
}

export default WXLiveEventListener;
