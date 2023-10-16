// /* eslint-disable */
// /* eslint-disable no-restricted-syntax */
// /* eslint-disable guard-for-in */
// import axios from 'axios';
// import fs from 'fs';
// import puppeteer, { HTTPResponse } from 'puppeteer';
// import zlib from 'zlib';
// import { LiveMessage, HostInfo, LiveInfo, DecodedData } from '../CustomTypes';

// import {
//   DEBUG,
//   INFO,
//   WARNING,
//   CONSOLELOG,
//   pad3,
//   textToPrettyJson,
//   timestamp,
//   url2filename,
// } from './util';

// async function saveResponseToLog(response: HTTPResponse, filename: string) {
//   try {
//     let txtContent = `${response.request().method()} ${response.url()}\n`;
//     for (const key in response.request().headers()) {
//       txtContent += `${key}: ${response.request().headers()[key]}\n`;
//     }
//     txtContent += '\n\n';
//     txtContent += textToPrettyJson(response.request().postData());
//     txtContent += '\n\n';
//     txtContent += `${response.status()} ${response.statusText()}\n`;
//     for (const key in response.headers()) {
//       txtContent += `${key}: ${response.headers()[key]}\n`;
//     }
//     txtContent += '\n\n';
//     if (response.url().includes('mmfinderassistant-bin/live/msg')) {
//       const jsonData = await response.json();
//       if (jsonData.data.appMsgList.length > 0) {
//         for (const idx in jsonData.data.appMsgList) {
//           const o = jsonData.data.appMsgList[idx];
//           const decodedPayload = Buffer.from(o.payload, 'base64').toString();
//           const giftPayload = JSON.parse(decodedPayload);
//           jsonData.data.appMsgList[idx].payload = giftPayload;
//         }
//       }
//       txtContent += JSON.stringify(jsonData, null, 2);
//     } else {
//       txtContent += textToPrettyJson(await response.text());
//     }
//     fs.writeFile(filename, txtContent, function cb(err: any) {
//       if (err) {
//         return CONSOLELOG(err);
//       }
//       return true;
//     });
//   } catch (error) {
//     WARNING('error when get response data');
//     WARNING(response.url());
//     WARNING(response.headers()['content-type']);
//     CONSOLELOG(error);
//   }
// }

// function saveData(o: any, m: LiveMessage, logPath: string) {
//   const seq = pad3(m.seq);
//   const tt = new Date().getTime();
//   const filename = `${logPath}/${seq}_${m.decoded_type}_${m.msg_sub_type}_${m.content}_${tt}.json`;
//   fs.writeFile(filename, JSON.stringify(o, null, 2), (err) => {
//     if (err) {
//       WARNING(`failed to save data${filename}`);
//       CONSOLELOG(err);
//     }
//   });
// }


// /**
//  *@returns true if there is unknown event in decoded_data.events
//  */
// async function forwardResponse(
//   response: HTTPResponse,
//   config: Config,
//   liveInfoCallback: (arg0: LiveInfo) => void,
//   liveMessageCallback: (arg0: LiveMessage) => void,
// ): Promise<boolean> {
//   const forwardURL = config.forward_url;
//   const zipPostData = config.gzip_forward_data;
//   const contentType = getContentType(response);
//   if (contentType !== 'application/json') {
//     WARNING(`content type is not application/json: ${response.url()}`);
//     return false;
//   }
//   try {
//     if (!response.url().includes('mmfinderassistant-bin/live/msg')) {
//       if (config.forward_all_json_data) {
//         const data = {
//           original_url: response.url(),
//           original_body: await response.json(),
//         };
//         PostData(forwardURL, data, zipPostData)
//           .then((rr) => {
//             return INFO(`server response: ${JSON.stringify(rr)}`);
//           })
//           .catch((error) => {
//             WARNING('failed to forward message');
//             CONSOLELOG(error);
//           });
//       }
//       return false;
//     }
//     const responseData = await response.json();
//     const requestHeaders = response.request().headers();
//     const requestText = response.request().postData();
//     if (requestText === undefined) {
//       WARNING('request text is undefined');
//       return false;
//     }
//     const requestData = JSON.parse(requestText);

//     const hostInfo = {} as HostInfo;
//     hostInfo.wechat_uin = requestHeaders['x-wechat-uin'];
//     hostInfo.finder_username = requestData.finderUsername;

//     const decodedData = decodeDataFromResponse(responseData, hostInfo, config);

//     // use callback to update UI
//     liveInfoCallback(decodedData.live_info);

//     if (!Array.isArray(decodedData.events) || decodedData.events.length === 0) {
//       if (!config.forward_all_json_data) {
//         return false;
//       }
//     }

//     for (const idx in decodedData.events) {
//       const msg = decodedData.events[idx];
//       liveMessageCallback(msg);
//     }

//     decodedData.host_info = hostInfo;
//     DEBUG(`forward msg to ${forwardURL}with gzip:${zipPostData}`);
//     const data = {
//       decoded_data: decodedData,
//       original_url: response.url(),
//       original_body: responseData,
//     };
//     PostData(forwardURL, data, zipPostData)
//       .then((rr) => {
//         return INFO(`server response: ${JSON.stringify(rr)}`);
//       })
//       .catch((error) => {
//         WARNING('failed to forward message');
//         CONSOLELOG(error);
//       });

//     // check if there is unknown event in decoded_data.events
//     for (const idx in decodedData.events) {
//       const msg = decodedData.events[idx];
//       if (msg.decoded_type === 'unknown') {
//         return true;
//       }
//     }
//   } catch (error) {
//     WARNING('failed to forward message');
//     CONSOLELOG(error);
//   }
//   return false;
// }
// async function handleResponse(
//   response: HTTPResponse,
//   config: Config,
//   liveInfoCallback: (arg0: LiveInfo) => void,
//   liveMessageCallback: (arg0: LiveMessage) => void,
// ) {
//   const url = response.url();
//   const logPath = config.log_path;
//   // const forwardUrl = config.forward_url;
//   if (skip(response)) {
//     DEBUG(`skip url: ${url}`);
//     return;
//   }
//   DEBUG(`url:${url}`);
//   let filename = `${logPath}/${url2filename(url)}_${timestamp()}.log`;
//   const prefix = 'mmfinderassistant-bin/';
//   const idx = url.indexOf(prefix);
//   if (idx >= 0) {
//     filename = `${logPath}/${url2filename(
//       url.substring(idx + prefix.length),
//     )}_${timestamp()}.log`;
//   }
//   await saveResponseToLog(response, filename);
//   const hasUnknownType = await forwardResponse(
//     response,
//     config,
//     liveInfoCallback,
//     liveMessageCallback,
//   );
//   if (hasUnknownType) {
//     // 单独列出来需要后续分析。
//     filename = `${logPath}/unknown_${timestamp()}.log`;
//     await saveResponseToLog(response, filename);
//   }
// }
