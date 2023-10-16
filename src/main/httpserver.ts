import log from 'electron-log';
import * as http from 'http';
import * as url from 'url';

class SpyHttpServer {
  private port: number;

  private server: http.Server | null;

  private getLiveStatus: Function;

  constructor(port: number, getLiveStatus: Function) {
    this.port = port;
    this.getLiveStatus = getLiveStatus;
    this.server = null;
  }

  public start() {
    this.server = http.createServer((req, res) => {
      const reqUrl = url.parse(req.url || '', true);

      if (reqUrl.pathname === '/getLiveStatus' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        const status = this.getLiveStatus();
        log.debug(status === null);
        if (status === null) {
          res.write('{}');
        } else {
          res.write(JSON.stringify(this.getLiveStatus()));
        }
        res.end();
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.write('404 Not Found\n');
        res.end();
      }
    });

    this.server.listen(this.port, () => {
      log.info(`Server listening on port ${this.port}`);
    });
  }

  public stop() {
    this.server?.close(() => {
      log.info('server closed');
    });
  }
}
export default SpyHttpServer;
