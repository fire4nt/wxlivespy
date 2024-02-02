import { LiveMessage, HostInfo, LiveInfo, DecodedData } from '../CustomTypes';

class WXDataDecoder {
  static liveInfoFromObject(o: any, hostInfo: HostInfo): LiveInfo {
    const li = {} as LiveInfo;
    li.wechat_uin = hostInfo.wechat_uin;
    // TODO 这个值可能为 undefined
    li.live_id = o.liveId;
    li.live_status = o.liveStatus;
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
    } else {
      messageInstance.decoded_type = 'unknown';
      messageInstance.original_data = o;
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
      messageInstance.original_data = o;
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
  ): DecodedData | null {
    const decodedMessages = {} as DecodedData;
    decodedMessages.host_info = {} as HostInfo;
    decodedMessages.host_info.wechat_uin = requestHeaders['x-wechat-uin'];
    decodedMessages.host_info.finder_username = requestData.finderUsername;

    // 可能出现 responseData.data.liveInfo 为 undefined 的情况
    if (responseData.data.liveInfo === undefined) {
      if (responseData.data.msgList.length === 0 && responseData.data.appMsgList.length === 0) {
        return null;
      }
      throw new Error('liveInfo is undefined, but msgList or appMsgList is not empty');
    }

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

  static getOpenIDFromMsgId(msgId: string): string | null {
    // "msg_id": "finderlive_usermsg_comment_1F4EF489-B2CE-4B26-9002-3C7421EF8E78_o9hHn5apfwHL-RYrxochETS7NyDM",
    // return 'o9hHn5apfwHL-RYrxochETS7NyDM'
    // This id will not change between different live sessions
    const idx = msgId.indexOf('_o9h');
    if (idx >= 0) {
      return msgId.substring(idx + 1, msgId.length);
    }
    return null;
  }

  static getSecOpenIDFromMsgId(msgId: string): string | null {
    // "finderlive_appmsg_finderlive_commcommentnotify_d5addee68407c6d78fe2cc115ef3bcbf_2042584726460027863_1698657150_b2afac411cfad2d6f5fe69e1c2ec3901",
    // return 'b2afac411cfad2d6f5fe69e1c2ec3901'
    // split by '_' and return the last one, this is the sec_openid
    const parts = msgId.split('_');
    if (parts.length >= 1) {
      return parts[parts.length - 1];
    }
    return null;
  }
}

export default WXDataDecoder;
