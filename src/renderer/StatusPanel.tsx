/* eslint-disable jsx-a11y/label-has-associated-control */
import React, { useState } from 'react';

import log from 'electron-log';
// import { shell } from 'electron';
import { LiveInfo } from '../CustomTypes';
import { date2str, stringmask } from '../CommonUtil';

interface FormData {
  hostID: string;
  roomID: string;
  startTime: string;
  onlineNumber: number;
  likeCount: number;
  rewardAmount: number;
}
const initialFormData: FormData = {
  hostID: '',
  roomID: '',
  startTime: '',
  onlineNumber: 0,
  likeCount: 0,
  rewardAmount: 0,
};
let setDisplay: Function;
let formData: FormData;
let setFormData: Function;
let display: string;
let liveStatusUrl: string;

function StatusPanel() {
  [display, setDisplay] = useState('none');

  [formData, setFormData] = useState<FormData>(initialFormData);
  // window.electron.ipcRenderer.once('wxlive-status', (arg) => {
  //   // eslint-disable-next-line no-console
  //   console.log('2this is a wxlive event2');
  //   // eslint-disable-next-line no-console
  //   console.log(arg);
  // });

  const getLiveStatusURL = async () => {
    const httpServerPort = await window.electron.ipcRenderer.getConfig('http_server_port');
    liveStatusUrl = `http://localhost:${httpServerPort}/getLiveStatus`;
    log.info(liveStatusUrl);
  };
  getLiveStatusURL();

  const openLink = (event: any) => {
    event.preventDefault();
    const target = event.target as HTMLAnchorElement;
    log.info(`clicked ${target.href}`);
    window.electron.ipcRenderer.openExternalLink(target.href);
  };

  return (
    <div>
      <h1>监听</h1>
      <button
        type="button"
        onClick={() => {
          window.electron.ipcRenderer.sendMessage('ipc-example', ['ping']);
          // eslint-disable-next-line no-console
          console.log('ipc-example', ['ping']);
        }}
      >
        开始监听
      </button>
      <div id="wxlive-status-div" style={{ display }}>
        <h3>直播间信息</h3>
        <table>
          <tbody>
            <tr>
              <td align="right">状态数据API：</td>
              <td>
                <a style={{ color: 'blueviolet', margin: '0px' }} href={liveStatusUrl} onClick={openLink}>
                  {liveStatusUrl}
                </a>
              </td>
            </tr>
            <tr>
              <td align="right">主播ID：</td>
              <td>{formData.hostID}</td>
            </tr>
            <tr>
              <td align="right">直播间ID：</td>
              <td>{formData.roomID}</td>
            </tr>
            <tr>
              <td align="right">开播时间：</td>
              <td>{formData.startTime}</td>
            </tr>
            <tr>
              <td align="right">在线人数：</td>
              <td>{formData.onlineNumber}</td>
            </tr>
            <tr>
              <td align="right">点赞数：</td>
              <td>{formData.likeCount}</td>
            </tr>
            <tr>
              <td align="right">微信币：</td>
              <td>{formData.rewardAmount}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StatusPanel;

window.electron.ipcRenderer.on('wxlive-status', (arg) => {
  // eslint-disable-next-line no-console
  console.log('this is a wxlive status');
  // eslint-disable-next-line no-console
  console.log(arg);
  // cast arg to StatusData
  const castedStatusData = arg as LiveInfo;
  if (formData !== undefined) {
    formData.hostID = stringmask(castedStatusData.wechat_uin, 3, 3);
    formData.roomID = stringmask(castedStatusData.live_id, 3, 3);
    formData.startTime = date2str(new Date(castedStatusData.start_time * 1000));
    formData.onlineNumber = castedStatusData.online_count;
    formData.likeCount = castedStatusData.like_count;
    formData.rewardAmount = castedStatusData.reward_total_amount_in_wecoin;
    // eslint-disable-next-line no-console
    console.log(formData);
    setFormData({
      ...formData,
    });
    setDisplay('block');
    // eslint-disable-next-line no-console
    console.log('after setFormData');
  }
});
