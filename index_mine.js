const https = require('https');
const notifier = require('node-notifier');
const child_process = require('child_process');
const fs = require('fs');
const path = require('path');
const open = require('open');
require('dotenv').config();

// 监控 bilibili 直播间，在开播时显示系统通知进行提醒

// 在下面的数组 [ ] 里配置要监控的直播间，每个花括号对 { }, 代表一个直播间
// 预设了 2 个直播间位置，你可以根据自己的需要进行增删
// 每个直播间只需要填写房间号 room_id
// name 可以留空，不写的话会使用主播的名字；也可以填写名字或昵称以便区分
const config = [
  {
    room_id: 15128692,
    name: '一色雨'
  },
  {
    room_id: 27511091,
    name: '一条小糖糖'
  },
  {
    room_id: 7301313,
    name: '半步道长'
  }
]


function getLiveRoomData (room_id) {
  const url = `https://api.live.bilibili.com/xlive/web-room/v1/index/getInfoByRoom?room_id=${room_id}`;
  // 配置请求头
   const options = {
      headers:{
        // 伪装成浏览器访问
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://live.bilibili.com/?spm_id_from=333.788.0.0',
        // 使用真实Cookies进行访问
        'Cookie': process.env.BILI_COOKIE
        }
   };
  https.get(url,options, res => {
    let body = '';

    res.on('data', (chunk) => {
      body += chunk
    });

    res.on('end', () => {
      try {
        const json = JSON.parse(body);
        parseRoomData(room_id, json);
        //console.log('请求成功', json);
      } catch (error) {
        console.error('解析失败，收到内容：', body);
        console.error(error.message);
      }
    })
  }).on('error', (e) => {
    console.log(room_id);
    console.error('网络错误', e);
  });
};

function parseRoomData (room_id, json) {
  // 如果房间号没有对应的直播间 data 就是 null；如果参数错误就没有 data
  if (json.data === null || json.data === undefined) {
    return
  }

  const room = room_list.find(data => data.room_id === room_id)
  room.cover = json.data.room_info.cover
  room.avatar = json.data.anchor_info.base_info.face
  room.title = json.data.room_info.title
  if (!room.name) {
    room.name = json.data.anchor_info.base_info.uname
  }

  // 当直播状态变化时显示通知
  const status = json.data.room_info.live_status
  if (status !== room.status) {
    room.status = status
    switch (status) {
      case 0:
        showNotify(room, '{name}尚未开播')
        break
      case 1:
        showNotify(room, '{name}正在直播')
        break
      case 2:
        showNotify(room, '{name}正在轮播')
        break
      default:
        console.log(`不明状态码status ${status}`)
    }
  }
}

async function showNotify (room, title) {
  // 替换 title 里的转义代码
  // {name} {title} {room_id}
  title = title.replace('{name}', room.name)
    .replace('{title}', room.title)
    .replace('{room_id}', room.room_id)

  const date = new Date().toLocaleString()
  console.log(`${title} ${room.title} ${date}`)

  const fileName = path.resolve(__dirname + `/avatar_${room.room_id}.jpg`)
  await saveFile(room.avatar, fileName)

  notifier.notify({
    title: title,
    message: room.title,
    icon: fileName,
    sound: true,
    wait: true
  },
    function (err, response) {
      // response 在 Windows 上的值有 3 种：
      // 点击通知：activate
      // 点击 x 关闭：dismissed
      // 等待超时：timeout
      if (response === 'activate') {
        const URL = `https://live.bilibili.com/${room.room_id}`
        openURL(URL)
      }
    }
  )
}

async function saveFile (url, fileName) {
  return new Promise((resolve, reject) => {
    // HTTPS加密访问
    if (url.startsWith('http:')) {
      url = url.replace('http:', 'https:')
    };
    const options = {
      headers:{
        // 伪装成浏览器访问
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://live.bilibili.com/?spm_id_from=333.788.0.0',
        // 使用真实Cookies进行访问
        'Cookie': process.env.BILI_COOKIE
        }
   };
    // 同上，GET请求也要带请求头
    https.get(url, options, (res) => {
      // 下载失败则停止下载。
      if (res.statusCode !== 200) {
        console.error(`头像下载失败，返回状态码：${res.statusCode}`);
        resolve();
        return;
      }
      const file = fs.createWriteStream(fileName);
      res.pipe(file);
    
    //等待文件完全关闭后才resolve
    file.on('close',() => {
      resolve();
    });
   file.on('error', (err) => {
    file.destroy();
    console.error("文件写入错误：", err.message);
    resolve();
   });
  }).on("error",(err) => {
    // 网络错误时防止程序卡死
    console.error("头像下载网络错误：", err.message);
    resolve();
  });
  });
}
    /*
      file.on('finish', () => {
        file.close()
        resolve()
      })
    }).on("error", (err) => {
      console.log("Error: ", err.message)
    })
  })
}
    */
function openURL(url) {
  open(url).catch((err)=>{
    console.error('无法打开URL：', err);
  });
}
/*
function openURL (url) {
  // 判断平台
  switch (process.platform) {
    // Mac 使用 open
    case "darwin":
      child_process.spawn('open', [url])
      break
    // 我在 Windows 上使用 spawn 报错了，改为使用 exec
    case "win32":
      child_process.exec(`start ${url}`)
      break
    // Linux 等使用 xdg-open
    default:
      child_process.spawn('xdg-open', [url])
  }
}
*/

// 启动
const room_list = config.map(cfg => {
  return {
    room_id: cfg.room_id,
    name: cfg.name,
    status: -1,
    cover: '',
    avatar: '',
    title: '',
  }
})

let time_start = 0
const add = 500 // 毫秒，如果有多个直播间，则每次请求错开一段时间，避免拥挤
const interval = 60000  // 毫秒，每个直播间隔多长时间查询一次

console.log('监控以下直播间：')
room_list.forEach(room => {
  const tab = String(room.room_id).length < 8 ? '\t\t' : '\t'
  console.log(`${room.room_id}${tab}${room.name}`)
  const current_delay = time_start
  time_start += add
  
  setTimeout(() => {
    // 启动时立即查询一次
    getLiveRoomData(room.room_id)

    // 然后定时查询
    setInterval(() => {
      getLiveRoomData(room.room_id)
    }, interval)
  }, current_delay)
})