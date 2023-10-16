import { DecodedData, LiveInfo } from '../CustomTypes';

interface WXLiveEventHandler {
  onStatusUpdate: (res: LiveInfo) => void;
  /**
   * 将解析出来的数据传递给前端，并进行转发
   *
   * @param res 解析出来的数据
   */
  onEvents: (res: DecodedData) => void;
}

export default WXLiveEventHandler;
