## 功能

本工具可以监听微信视频号直播间的弹幕、礼物信息，并转发到指定的http地址。

- 工具只在Win64系统上发布并测试过。其他系统未测试。
- 同一个用户在不同的直播场次中，用户ID会变化。
- 可以获取到用户的点赞行为，以及直播间的点赞总数，但是无法获取单个用户精确的点赞次数。

## 使用方式

1. 点击“开始监听”按钮。
2. 浏览器会打开的视频号管理后台，用微信扫码登录。
3. 本工具上会展示出直播间的状态以及弹幕、礼物信息。
4. 设置http转发地址，将弹幕、礼物信息转发到指定地址。

## 开发说明

### Install

Clone the repo and install dependencies:

```bash
npm install
```

### Starting Development

Start the app in the `dev` environment:

```bash
npm start
```

### Packaging for Production

To package apps for the local platform:

```bash
npm run package
```

## Donations

<img src="https://github.com/fire4nt/wxlivespy/blob/main/coffee.jpg" width="300" />


## License

MIT
