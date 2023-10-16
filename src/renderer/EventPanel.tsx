import React, { useState, useRef, useEffect } from 'react';

import { LiveMessage } from '../CustomTypes';
import { date2str, stringmask } from '../CommonUtil';

let setLogsFunc: Function | undefined;

function EventPanel() {
  const [logs, setLogs] = useState([
    { date: '时间', seq: '序号', decoded_type: '类型', content: '内容', user_id: '用户ID' },
    // ... (initial logs here)
  ]);
  setLogsFunc = setLogs;
  const [forwardUrl, setForwardURL] = useState('');

  const logTableRef = useRef<HTMLDivElement>(null); // Ref for the table container

  // Use an effect to scroll the table container to the bottom whenever logs change
  useEffect(() => {
    if (logTableRef.current) {
      logTableRef.current.scrollTop = logTableRef.current.scrollHeight;
    }
    // Fetch config from main process when component is mounted
    const getForwardURL = async () => {
      const url = await window.electron.ipcRenderer.getForwardUrl();
      // setFormData(configFromMain);
      setForwardURL(url);
    };
    getForwardURL();
  }, [logs]);

  return (
    <div>
      <h1>转发</h1>
      <table>
        <tbody>
          <tr>
            <td>
              <input
                type="text"
                name="forward_url"
                id="forward_url"
                placeholder="转发地址，比如 http://localhost:8080"
                style={{ width: '400px' }}
                value={forwardUrl}
                onChange={(e) => {
                  setForwardURL(e.target.value);
                }}
              />
            </td>
            <td>
              <button
                type="button"
                onClick={() => {
                  window.electron.ipcRenderer.sendMessage('wxlive-set-config', { forward_url: forwardUrl });
                }}
              >
                设置转发地址
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <h3>转发日志（最近20条）</h3>
      {/* <div>
        <button type="button" onClick={addLog}>
          追加一条测试日志
        </button>
      </div> */}
      <div ref={logTableRef} style={{ maxHeight: '200px', overflowY: 'auto' }}>
        <table>
          <tbody>
            {logs.map((log) => (
              <tr key={log.seq}>
                <td align="left" style={{ width: '200px' }}>
                  {log.date}
                </td>
                <td align="left" style={{ width: '60px' }}>
                  {log.seq}
                </td>
                <td align="left" style={{ width: '100px' }}>
                  {log.decoded_type}
                </td>
                <td align="left" style={{ width: '100px' }}>
                  {log.user_id}
                </td>
                <td align="left" style={{ width: '200px', paddingLeft: '10px' }}>
                  {log.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EventPanel;
window.electron.ipcRenderer.on('wxlive-event', (arg) => {
  // eslint-disable-next-line no-console
  console.log('this is a wxlive event');
  // eslint-disable-next-line no-console
  console.log(arg);
  // cast arg to EventData
  const castedEventData = arg as LiveMessage;
  const newLog = {
    date: date2str(new Date(castedEventData.msg_time)),
    decoded_type: castedEventData.decoded_type,
    content: castedEventData.content,
    seq: castedEventData.seq.toString(),
    user_id: stringmask(castedEventData.sec_openid, 0, 16),
  };
  if (setLogsFunc !== undefined) {
    setLogsFunc((prevLogs: any) => [...prevLogs, newLog].slice(-20));
  }
});
