import axios from 'axios';
import zlib from 'zlib';
import log from 'electron-log';
import SpyConfig from './config';

class EventForwarder {
  private config: SpyConfig;

  constructor(config: SpyConfig) {
    this.config = config;
  }

  static async postGzippedData(url: string, data: any) {
    // Gzip the data
    return new Promise((resolve, reject) => {
      zlib.gzip(JSON.stringify(data), async (err, gzippedData) => {
        if (err) {
          return reject(err);
        }

        try {
          // Make the axios POST request with gzipped data
          const response = await axios.post(url, gzippedData, {
            headers: {
              'Content-Type': 'application/json',
              'Content-Encoding': 'gzip',
            },
          });

          return resolve(response.data);
        } catch (error) {
          return reject(error);
        }
      });
    });
  }

  static async PostOriginalData(url: string, data: any) {
    return new Promise((resolve, reject) => {
      try {
        // Make the axios POST request with gzipped data
        axios
          .post(url, data, {
            headers: {
              'Content-Type': 'application/json',
            },
          })
          .then((rr) => {
            // return INFO(`server response: ${JSON.stringify(rr)}`);
            return resolve(rr.data);
          })
          .catch((error) => {
            reject(error);
          });
      } catch (error) {
        reject(error);
      }
    });
  }

  async forwardData(data: any): Promise<any> {
    const url = this.config.getProp('forward_url');
    if (url === undefined || url === '') {
      log.warn('forward url is not set');
      return undefined;
    }
    if (this.config.getProp('gzip_forward_data')) {
      return EventForwarder.postGzippedData(url, data);
    }
    return EventForwarder.PostOriginalData(url, data);
  }
}

export default EventForwarder;
