import { LiveMessage, HostInfo, LiveInfo, DecodedData } from '../CustomTypes';

class WXDataDecoder {
  static liveInfoFromObject(o: any, hostInfo: HostInfo): LiveInfo {
    const li = {} as LiveInfo;
    li.wechat_uin = hostInfo.wechat_uin;
    li.live_id = o.liveId;
    li.online_count = o.onlineCnt;
    li.start_time = o.startTime;
    li.like_count = o.likeCnt;
    li.reward_total_amount_in_wecoin = o.rewardTotalAmountInWecoin;
    return li;
  }

  static liveInfoToString(li: LiveInfo): string {
    return `${li.live_id} online[${li.online_count}] like[${li.like_count}] wecoin[${li.reward_total_amount_in_wecoin}]`;
  }

  static liveMessageFromMsg(o: any): LiveMessage {
    const messageInstance = {} as LiveMessage;
    messageInstance.msg_time = new Date().getTime();
    messageInstance.msg_sub_type = o.type;
    if (o.type === 1) {
      messageInstance.decoded_type = 'comment';
    } else if (o.type === 10005) {
      messageInstance.decoded_type = 'enter';
    }
    messageInstance.msg_id = o.clientMsgId;
    messageInstance.sec_openid = o.username;
    messageInstance.content = o.content;
    messageInstance.nickname = o.nickname;
    messageInstance.seq = o.seq;
    return messageInstance;
  }

  static liveMessageFromAppMsg(o: any): LiveMessage {
    const messageInstance = {} as LiveMessage;
    messageInstance.msg_time = new Date().getTime();
    messageInstance.msg_sub_type = o.msgType;
    // 还有一个 localClientMsgId 比 clientMsgId要短一点，clientMsgId完全包含localClientMsgId
    messageInstance.msg_id = o.clientMsgId;
    // TODO 不同直播场次，username这个值会变化？
    messageInstance.sec_openid = o.fromUserContact.contact.username;
    messageInstance.nickname = o.fromUserContact.contact.nickname; // o.fromUserContact.displayNickname
    messageInstance.seq = o.seq;
    // DEBUG("msgType" + o.msgType);
    // DEBUG("check: " + (o.msgType === 20006));
    if (o.msgType === 20009) {
      messageInstance.decoded_type = 'gift';
      const decodedPayload = Buffer.from(o.payload, 'base64').toString();
      const giftPayload = JSON.parse(decodedPayload);
      messageInstance.sec_gift_id = giftPayload.reward_product_id;
      messageInstance.gift_num = giftPayload.reward_product_count;
      messageInstance.gift_value = giftPayload.reward_amount_in_wecoin;
      messageInstance.content = giftPayload.content;
    } else if (o.msgType === 20013) {
      messageInstance.decoded_type = 'combogift';
      const decodedPayload = Buffer.from(o.payload, 'base64').toString();
      const giftPayload = JSON.parse(decodedPayload);
      messageInstance.sec_gift_id = giftPayload.reward_product_id;
      messageInstance.combo_product_count = giftPayload.combo_product_count;
      messageInstance.content = giftPayload.content;
    } else if (o.msgType === 20006) {
      messageInstance.decoded_type = 'like';
    } else if (o.msgType === 20031) {
      messageInstance.decoded_type = 'levelup';
      const decodedPayload = Buffer.from(o.payload, 'base64').toString();
      const giftPayload = JSON.parse(decodedPayload);
      messageInstance.from_level = giftPayload.from_level;
      messageInstance.to_level = giftPayload.to_level;
    } else {
      messageInstance.decoded_type = 'unknown';
    }
    return messageInstance;
  }

  static liveMessageToString(msg: LiveMessage): string {
    if (msg.decoded_type === 'comment') {
      return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname} ${msg.content}`;
    }
    if (msg.decoded_type === 'enter') {
      return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname} ${msg.content}`;
    }
    if (msg.decoded_type === 'gift') {
      return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname} ${msg.content}`;
    }
    if (msg.decoded_type === 'combogift') {
      return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname} ${msg.content}`;
    }
    if (msg.decoded_type === 'like') {
      return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname}`;
    }
    if (msg.decoded_type === 'levelup') {
      return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname} ${msg.from_level} ${msg.to_level}`;
    }
    return `seq[${msg.seq}] ${msg.decoded_type} ${msg.msg_sub_type} ${msg.nickname}`;
  }

  // static *decodeMessage(responseData: any): IterableIterator<LiveMessage> {
  //   const hasComments = Array.isArray(responseData.data.msgList) && responseData.data.msgList.length > 0;
  //   const hasGifts = Array.isArray(responseData.data.appMsgList) && responseData.data.appMsgList.length > 0;
  //   if (hasComments) {
  //     const comments = responseData.data.msgList;
  //     const decodedMessages = comments.map((o: any) => WXDataDecoder.liveMessageFromMsg(o));
  //     yield* decodedMessages;
  //   }
  //   if (hasGifts) {
  //     const gifts = responseData.data.appMsgList;
  //     const decodedMessages = gifts.map((o: any) => {
  //       const gm = WXDataDecoder.liveMessageFromAppMsg(o);
  //       const decodedPayload = Buffer.from(o.payload, 'base64').toString();
  //       const giftPayload = JSON.parse(decodedPayload);
  //       o.payload = giftPayload;
  //       return gm;
  //     });
  //     yield* decodedMessages;
  //   }
  // }

  static decodeDataFromResponse(
    requestHeaders: Record<string, string>,
    requestData: any,
    responseData: any,
  ): DecodedData {
    const decodedMessages = {} as DecodedData;
    decodedMessages.host_info = {} as HostInfo;
    decodedMessages.host_info.wechat_uin = requestHeaders['x-wechat-uin'];
    decodedMessages.host_info.finder_username = requestData.finderUsername;

    decodedMessages.live_info = WXDataDecoder.liveInfoFromObject(responseData.data.liveInfo, decodedMessages.host_info);

    decodedMessages.events = responseData.data.msgList.reduce((acc: LiveMessage[], o: any) => {
      acc.push(WXDataDecoder.liveMessageFromMsg(o));
      // todo save message to log file.
      // saveData(o, gm, config.log_path);
      return acc;
    }, []);
    decodedMessages.events = responseData.data.appMsgList.reduce((acc: LiveMessage[], o: any) => {
      const gm = WXDataDecoder.liveMessageFromAppMsg(o);
      const decodedPayload = Buffer.from(o.payload, 'base64').toString();
      const giftPayload = JSON.parse(decodedPayload);
      o.payload = giftPayload;
      acc.push(gm);
      // todo save message to log file.
      // saveData(o, gm, config.log_path);
      return acc;
    }, decodedMessages.events);
    return decodedMessages;
  }
}

export default WXDataDecoder;
