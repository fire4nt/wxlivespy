/* eslint-disable */
// To parse this data:
//
//   import { Convert, CustomTypes } from "./file";
//
//   const customTypes = Convert.toCustomTypes(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface CustomTypes {
    /**
     * 从 original_body 中解析出来的业务数据
     */
    decoded_data: DecodedData;
    /**
     * The original body of the response
     */
    original_body: string;
    /**
     * The original url of the request
     */
    original_url: string;
    [property: string]: any;
}

/**
 * 从 original_body 中解析出来的业务数据
 */
export interface DecodedData {
    /**
     * 直播间消息
     */
    events: LiveMessage[];
    /**
     * 主播信息
     */
    host_info: HostInfo;
    /**
     * 直播间信息
     */
    live_info: LiveInfo;
    [property: string]: any;
}

export interface LiveMessage {
    /**
     * 可选， decoded_type 是 combo_gift 时会有
     */
    combo_product_count?: number;
    content:              string;
    /**
     * 解密后的用户的微信openid，同一个用户在同一个主播的不同直播场次不会变化
     */
    decoded_openid: string;
    /**
     * 解析出来的消息类型: comment, enter, gift, like, enter, levelup, unknown
     */
    decoded_type: string;
    /**
     * 可选， decoded_type 是 levelup 时会有
     */
    from_level?: number;
    /**
     * 可选， decoded_type 是 gift 时会有
     */
    gift_num?: number;
    /**
     * 可选， decoded_type 是 gift 时会有，单位为微信币。是本次送礼物的总价值，不是单价。
     */
    gift_value?: number;
    msg_id:      string;
    /**
     * 从原始请求的 body 中获取, data.msgList[].type 或者 data.appMsgList[].msgType
     */
    msg_sub_type: string;
    /**
     * 收到消息的unix时间戳
     */
    msg_time: number;
    nickname: string;
    /**
     * 可选，类型是 unknown 时会有，原始的消息内容
     */
    original_data?: { [key: string]: any };
    /**
     * 可选， decoded_type 是 gift 或 combo_gift 时会有
     */
    sec_gift_id?: string;
    /**
     * 经过加密的用户的微信openid，同一个用户在同一个主播的不同直播场次会变化
     */
    sec_openid: string;
    /**
     * 事件在直播间发生的消息序号，从1开始，递增。可能会重复发送，服务器收到之后要自己去重。
     */
    seq: number;
    /**
     * 可选， decoded_type 是 levelup 时会有
     */
    to_level?: number;
    [property: string]: any;
}

/**
 * 主播信息
 */
export interface HostInfo {
    /**
     * 从原始请求的 body 中获取
     */
    finder_username: string;
    /**
     * 从原始请求的 header中获取，可能是主播的微信号（用这个ID作为直播间的唯一标识）
     */
    wechat_uin: string;
    [property: string]: any;
}

/**
 * 直播间信息
 */
export interface LiveInfo {
    /**
     * 主播头像
     */
    head_url: string;
    /**
     * 直播间点赞数
     */
    like_count: number;
    /**
     * 直播间ID
     */
    live_id: string;
    /**
     * 直播间状态，1 表示直播中，2 表示直播结束
     */
    live_status: number;
    /**
     * 主播昵称
     */
    nickname: string;
    /**
     * 直播间在线人数
     */
    online_count: number;
    /**
     * 直播间打赏总金额，单位为微信币
     */
    reward_total_amount_in_wecoin: number;
    /**
     * 直播间开始时间，unix时间戳
     */
    start_time: number;
    /**
     * 从原始请求的 header中获取，可能是主播的微信号（用这个ID作为直播间的唯一标识）
     */
    wechat_uin: string;
    [property: string]: any;
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toCustomTypes(json: string): CustomTypes {
        return cast(JSON.parse(json), r("CustomTypes"));
    }

    public static customTypesToJson(value: CustomTypes): string {
        return JSON.stringify(uncast(value, r("CustomTypes")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "CustomTypes": o([
        { json: "decoded_data", js: "decoded_data", typ: r("DecodedData") },
        { json: "original_body", js: "original_body", typ: "" },
        { json: "original_url", js: "original_url", typ: "" },
    ], "any"),
    "DecodedData": o([
        { json: "events", js: "events", typ: a(r("LiveMessage")) },
        { json: "host_info", js: "host_info", typ: r("HostInfo") },
        { json: "live_info", js: "live_info", typ: r("LiveInfo") },
    ], "any"),
    "LiveMessage": o([
        { json: "combo_product_count", js: "combo_product_count", typ: u(undefined, 3.14) },
        { json: "content", js: "content", typ: "" },
        { json: "decoded_openid", js: "decoded_openid", typ: "" },
        { json: "decoded_type", js: "decoded_type", typ: "" },
        { json: "from_level", js: "from_level", typ: u(undefined, 3.14) },
        { json: "gift_num", js: "gift_num", typ: u(undefined, 3.14) },
        { json: "gift_value", js: "gift_value", typ: u(undefined, 3.14) },
        { json: "msg_id", js: "msg_id", typ: "" },
        { json: "msg_sub_type", js: "msg_sub_type", typ: "" },
        { json: "msg_time", js: "msg_time", typ: 3.14 },
        { json: "nickname", js: "nickname", typ: "" },
        { json: "original_data", js: "original_data", typ: u(undefined, m("any")) },
        { json: "sec_gift_id", js: "sec_gift_id", typ: u(undefined, "") },
        { json: "sec_openid", js: "sec_openid", typ: "" },
        { json: "seq", js: "seq", typ: 3.14 },
        { json: "to_level", js: "to_level", typ: u(undefined, 3.14) },
    ], "any"),
    "HostInfo": o([
        { json: "finder_username", js: "finder_username", typ: "" },
        { json: "wechat_uin", js: "wechat_uin", typ: "" },
    ], "any"),
    "LiveInfo": o([
        { json: "head_url", js: "head_url", typ: "" },
        { json: "like_count", js: "like_count", typ: 3.14 },
        { json: "live_id", js: "live_id", typ: "" },
        { json: "live_status", js: "live_status", typ: 3.14 },
        { json: "nickname", js: "nickname", typ: "" },
        { json: "online_count", js: "online_count", typ: 3.14 },
        { json: "reward_total_amount_in_wecoin", js: "reward_total_amount_in_wecoin", typ: 3.14 },
        { json: "start_time", js: "start_time", typ: 3.14 },
        { json: "wechat_uin", js: "wechat_uin", typ: "" },
    ], "any"),
};
